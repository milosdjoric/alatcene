const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://omni-alati.rs";
const DELAY_MS = 500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Top grupe (samo alat) → naziv za parent_kategorija. Podkategorije čitamo sa
// stranice svake grupe (putanja /alati/{top}/{sub}/) i koristimo kao `kategorija`.
const PARENT_NAMES = {
  "akumulatorski-alat": "Akumulatorski alati",
  "elektricni-alat": "Električni alati",
};
const SKIP_SLUGS = new Set(["feed", "page"]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  // Timeout da fetch ne visi beskonačno ako server prestane da odgovara
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parsePrice(text) {
  if (!text) return null;
  // "29.390,00" → 29390
  const clean = text.replace(/[^0-9.,]/g, "").trim();
  if (!clean) return null;
  const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? null : Math.round(num);
}

function parseProducts(html) {
  const $ = cheerio.load(html);
  const products = [];

  $("li.product.type-product").each((_, el) => {
    const $el = $(el);

    // Naziv i link
    const $title = $el.find(".woocommerce-loop-product__title").first();
    const naziv = $title.text().trim();
    const $link = $el.find("a.woocommerce-LoopProduct-link").first();
    const url = $link.attr("href") || "";

    // ID i SKU iz add-to-cart dugmeta
    const $btn = $el.find(".add_to_cart_button");
    const id = $btn.attr("data-product_id") || null;
    const sku =
      $btn.attr("data-product_sku") ||
      $el.find(".product-sku").text().replace("SKU:", "").trim() ||
      null;

    // Cene — Electro tema: ins = akcijska, del = stara
    const $price = $el.find(".price").first();
    const $ins = $price.find("ins .woocommerce-Price-amount bdi");
    const $del = $price.find("del .woocommerce-Price-amount bdi");
    const $regular = $price.find(".woocommerce-Price-amount bdi");

    let cena = null;
    let redovnaCena = null;

    if ($ins.length) {
      cena = parsePrice($ins.first().text());
      redovnaCena = parsePrice($del.first().text());
    } else if ($regular.length) {
      cena = parsePrice($regular.first().text());
      redovnaCena = cena;
    }

    let popustProcenat = null;
    let popustIznos = null;
    if (redovnaCena && cena && redovnaCena > cena) {
      popustIznos = Math.round(redovnaCena - cena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    // Brend iz kategorija
    const brend = extractBrand(naziv, $el);

    const dostupnost = $el.hasClass("outofstock") ? "RASPRODATO" : "NA_STANJU";

    if (naziv && cena) {
      products.push({
        id,
        sku,
        naziv,
        brend,
        cena,
        redovna_cena: redovnaCena,
        popust_procenat: popustProcenat,
        popust_iznos: popustIznos,
        valuta: "RSD",
        dostupnost,
        url,
        izvor: "omni-alati",
      });
    }
  });

  return products;
}

function extractBrand(name, $el) {
  // Probaj iz kategorija na kartici
  if ($el) {
    const cats = [];
    $el.find(".loop-product-categories a").each((_, a) => {
      cats.push(cheerio.load("").root().append(a).text().trim());
    });
    const brands = [
      "Makita", "Bosch", "DeWalt", "Metabo", "Hikoki", "Milwaukee",
      "Einhell", "Stanley", "Ingco", "Total", "Ferm", "Villager",
      "Festool", "Fein", "Husqvarna", "Stihl", "Ryobi", "Knipex",
    ];
    for (const b of brands) {
      if (cats.some((c) => c.toLowerCase() === b.toLowerCase())) return b;
    }
  }

  // Fallback iz naziva
  const upper = name.toUpperCase();
  const brands = [
    "MAKITA", "BOSCH", "DEWALT", "METABO", "HIKOKI", "MILWAUKEE",
    "EINHELL", "STANLEY", "INGCO", "TOTAL", "FESTOOL",
  ];
  for (const b of brands) {
    if (upper.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
  }
  return null;
}

function getMaxPage(html) {
  // Samo prava WooCommerce paginacija proizvoda — ne bilo koji /page/N/ na
  // stranici (electro-advanced-pagination, widgeti) koji bi dao lažno velik broj.
  const $ = cheerio.load(html);
  let max = 1;
  $("nav.woocommerce-pagination a.page-numbers").each((_, el) => {
    const href = $(el).attr("href") || "";
    const hm = href.match(/\/page\/(\d+)\//);
    if (hm) max = Math.max(max, parseInt(hm[1]));
    const t = $(el).text().trim();
    if (/^\d+$/.test(t)) max = Math.max(max, parseInt(t));
  });
  return max;
}

// Pročitaj podkategorije sa stranice svake top grupe (putanja /alati/{top}/{sub}/).
async function fetchCategories() {
  const out = [];
  const seen = new Set();

  for (const [top, parentName] of Object.entries(PARENT_NAMES)) {
    const html = await fetchPage(`${BASE}/alati/${top}/`);
    const $ = cheerio.load(html);
    const re = new RegExp(`/alati/${top}/([a-z0-9-]+)/$`);

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(re);
      if (!m || SKIP_SLUGS.has(m[1])) return;
      const naziv = $(el)
        .text()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\s*\(\d+\)\s*$/, "");
      if (!naziv || naziv.length > 50 || seen.has(m[1])) return;
      seen.add(m[1]);
      out.push({
        url: `${BASE}/alati/${top}/${m[1]}/`,
        kategorija: naziv,
        parent: parentName,
      });
    });
  }

  return out;
}

// Scrape svih stranica jednog kategorija URL-a (WooCommerce page/N).
async function fetchCategoryProducts(url, label) {
  const products = [];
  const firstHtml = await fetchPage(url);
  const totalPages = getMaxPage(firstHtml);

  products.push(...parseProducts(firstHtml));

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      const html = await fetchPage(`${url}page/${page}/`);
      products.push(...parseProducts(html));
    } catch (err) {
      console.error(`   ⚠️ ${label} str. ${page}: ${err.message}`);
    }
  }

  console.log(`   ${label} — ${products.length} proizvoda (${totalPages} str.)`);
  return products;
}

async function main() {
  console.log("Omni Alati Scraper — start");
  console.log("=".repeat(40));

  const subcats = await fetchCategories();
  console.log(`Pronađeno ${subcats.length} podkategorija\n`);

  // id/url → proizvod; prvi (specifična podkategorija) pobeđuje nad root fallback
  const byKey = new Map();
  const addProducts = (products, kategorija, parent) => {
    for (const p of products) {
      const key = p.id || p.url;
      if (byKey.has(key)) continue;
      p.kategorija = kategorija;
      p.parent_kategorija = parent;
      byKey.set(key, p);
    }
  };

  // 1. Podkategorije
  console.log("📦 Podkategorije:");
  for (const cat of subcats) {
    await sleep(DELAY_MS);
    try {
      const products = await fetchCategoryProducts(cat.url, cat.kategorija);
      addProducts(products, cat.kategorija, cat.parent);
    } catch (err) {
      console.error(`   ⚠️ ${cat.kategorija}: ${err.message}`);
    }
  }

  // 2. Root grupe — fallback za proizvode van podkategorija
  console.log("\n📦 Root grupe (fallback):");
  for (const [slug, name] of Object.entries(PARENT_NAMES)) {
    await sleep(DELAY_MS);
    try {
      const products = await fetchCategoryProducts(`${BASE}/alati/${slug}/`, name);
      addProducts(products, null, name);
    } catch (err) {
      console.error(`   ⚠️ ${name}: ${err.message}`);
    }
  }

  const unique = [...byKey.values()];
  const withCat = unique.filter((p) => p.kategorija).length;

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${unique.length} jedinstvenih`);
  console.log(`Sa podkategorijom: ${withCat} (${((withCat / unique.length) * 100).toFixed(1)}%)`);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `omni-alati_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "omni-alati");
}

main().catch(console.error);

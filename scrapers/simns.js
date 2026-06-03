const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://simns.rs";
const DELAY_MS = 500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Sajt je migriran na WooCommerce. Top grupe (samo alat) → naziv za
// parent_kategorija. Podkategorije čitamo sa stranice svake grupe.
const TOP_GROUPS = [
  { path: "product-category/aku-alati", name: "Akumulatorski alati" },
  { path: "product-category/elektricni-alati", name: "Električni alati" },
];
const SKIP_SLUGS = new Set(["page", "feed"]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parsePrice(text) {
  if (!text) return null;
  const clean = text.replace(/[^0-9.,]/g, "").trim();
  if (!clean) return null;
  const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? null : Math.round(num);
}

function parseProducts(html) {
  const $ = cheerio.load(html);
  const products = [];

  $(".product-tile__item").each((_, el) => {
    const $el = $(el);

    const naziv = $el.find(".product-tile__item-name").first().text().trim();
    const url = $el.find('a[href*="/proizvod/"]').first().attr("href") || "";

    const $btn = $el.find("[data-product_id]").first();
    const id = $btn.attr("data-product_id") || null;
    const sku = $btn.attr("data-product_sku") || null;

    const $price = $el.find(".price").first();
    const $ins = $price.find("ins .woocommerce-Price-amount");
    const $del = $price.find("del .woocommerce-Price-amount");
    const $regular = $el.find(".woocommerce-Price-amount");

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

    // Brend iz /brand/ linka ("INGCO alati" → "INGCO")
    const brend =
      $el.find('a[href*="/brand/"]').first().text().trim().replace(/\s*alati$/i, "") ||
      null;

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
        dostupnost: "NA_STANJU",
        url: url.startsWith("http") ? url : BASE + url,
        izvor: "simns",
      });
    }
  });

  return products;
}

function getMaxPage(html) {
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

async function fetchCategories() {
  const out = [];
  const seen = new Set();

  for (const { path: topPath, name } of TOP_GROUPS) {
    const html = await fetchPage(`${BASE}/${topPath}/`);
    const $ = cheerio.load(html);
    const re = new RegExp(`/${topPath}/([a-z0-9-]+)/`);

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
        url: `${BASE}/${topPath}/${m[1]}/`,
        kategorija: naziv,
        parent: name,
      });
    });
  }

  return out;
}

async function fetchCategoryProducts(url, label) {
  const products = [];
  const firstHtml = await fetchPage(url);
  const totalPages = getMaxPage(firstHtml);

  products.push(...parseProducts(firstHtml));

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      products.push(...parseProducts(await fetchPage(`${url}page/${page}/`)));
    } catch (err) {
      console.error(`   ⚠️ ${label} str. ${page}: ${err.message}`);
    }
  }

  console.log(`   ${label} — ${products.length} proizvoda (${totalPages} str.)`);
  return products;
}

async function main() {
  console.log("SIM NS Scraper — start");
  console.log("=".repeat(40));

  const subcats = await fetchCategories();
  console.log(`Pronađeno ${subcats.length} podkategorija\n`);

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

  console.log("\n📦 Root grupe (fallback):");
  for (const { path: topPath, name } of TOP_GROUPS) {
    await sleep(DELAY_MS);
    try {
      const products = await fetchCategoryProducts(`${BASE}/${topPath}/`, name);
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
  const filename = path.join(DATA_DIR, `simns_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "simns");
}

main().catch(console.error);

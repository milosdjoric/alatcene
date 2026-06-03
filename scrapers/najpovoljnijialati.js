const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://najpovoljnijialati.rs";
const DELAY_MS = 400;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Top grupe koje skupljamo (samo alat) → naziv za parent_kategorija.
// Podkategorije unutar njih čitamo iz menija i koristimo kao `kategorija`.
const PARENT_NAMES = {
  "elektricni-alat": "Električni alati",
  "akumulatorski-alat": "Akumulatorski alati",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
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

  $(".product--card").each((_, el) => {
    const $el = $(el);

    const $link = $el.find("a.woocommerce-LoopProduct-link").first();
    const naziv = $el.find("h2, .woocommerce-loop-product__title").text().trim();
    const url = $link.attr("href") || "";

    const $btn = $el.find(".add_to_cart_button");
    const id = $btn.attr("data-product_id") || null;
    const sku = $btn.attr("data-product_sku") || null;

    const brandHref = $el.find("a.product__brand").attr("href") || "";
    const brandMatch = brandHref.match(/\/brend\/([^/]+)/);
    const brend = brandMatch ? brandMatch[1].replace(/-/g, " ") : null;

    const $price = $el.find(".product__price, .price").first();
    const $ins = $price.find("ins .woocommerce-Price-amount");
    const $del = $price.find("del .woocommerce-Price-amount");
    const $regular = $price.find(".woocommerce-Price-amount");

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
        dostupnost: $btn.length > 0 ? "NA_STANJU" : "RASPRODATO",
        url,
        izvor: "najpovoljnijialati",
      });
    }
  });

  return products;
}

function getMaxPage(html) {
  const matches = html.match(/\/page\/(\d+)\//g) || [];
  let max = 1;
  for (const m of matches) {
    const num = parseInt(m.match(/(\d+)/)[1]);
    if (num > max) max = num;
  }
  return max;
}

// Pročitaj podkategorije sa stranice svake top grupe (ne iz homepage menija —
// on prikazuje samo deo). Hvata direktne podkategorije (jedan segment ispod top).
async function fetchCategories() {
  const out = [];
  const seen = new Set();

  for (const [top, parentName] of Object.entries(PARENT_NAMES)) {
    const html = await fetchPage(`${BASE}/kategorija/${top}/`);
    const $ = cheerio.load(html);
    const re = new RegExp(`/kategorija/${top}/([^/]+)/?$`);

    $(`a[href*="/kategorija/${top}/"]`).each((_, el) => {
      const href = $(el).attr("href") || "";
      const naziv = $(el).text().trim().replace(/\s+/g, " ");
      const m = href.match(re);
      if (!m || !naziv || naziv.length > 40) return;

      const key = `${top}/${m[1]}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        url: href.endsWith("/") ? href : `${href}/`,
        kategorija: naziv,
        parent: parentName,
      });
    });
  }

  return out;
}

// Scrape svih stranica jednog kategorija URL-a.
async function fetchCategoryProducts(catUrl, label) {
  const products = [];
  const firstHtml = await fetchPage(catUrl);
  const totalPages = getMaxPage(firstHtml);
  products.push(...parseProducts(firstHtml));

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      const html = await fetchPage(`${catUrl}page/${page}/`);
      products.push(...parseProducts(html));
    } catch (err) {
      console.error(`   ⚠️ ${label} str. ${page}: ${err.message}`);
    }
  }

  console.log(`   ${label} — ${products.length} proizvoda (${totalPages} str.)`);
  return products;
}

async function main() {
  console.log("Najpovoljniji Alati Scraper — start");
  console.log("=".repeat(40));

  const subcats = await fetchCategories();
  console.log(`Pronađeno ${subcats.length} podkategorija u meniju\n`);

  // id/url → proizvod; prvi (najdublja kategorija) pobeđuje
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

  // 1. Podkategorije — najdublje prvo
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

  // 2. Root grupe — fallback za proizvode koji nisu ni u jednoj podkategoriji
  console.log("\n📦 Root grupe (fallback):");
  for (const [slug, name] of Object.entries(PARENT_NAMES)) {
    await sleep(DELAY_MS);
    try {
      const products = await fetchCategoryProducts(`${BASE}/kategorija/${slug}/`, name);
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
  const filename = path.join(DATA_DIR, `najpovoljnijialati_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "najpovoljnijialati");
}

main().catch(console.error);

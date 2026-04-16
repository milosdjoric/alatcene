const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://www.bosshop.rs";
const DELAY_MS = 500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  { name: "Akumulatorski alati", url: "/kategorija-proizvoda/akumulatorski-alat/" },
  { name: "Električni alati", url: "/kategorija-proizvoda/elektricni-alat/" },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
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

  $(".product.type-product").each((_, el) => {
    const $el = $(el);
    const naziv = $el.find(".woocommerce-loop-product__title, h2").first().text().trim();
    const url = $el.find("a.woocommerce-LoopProduct-link").first().attr("href") || "";
    const $btn = $el.find(".add_to_cart_button");
    const id = $btn.attr("data-product_id") || null;
    const sku = $btn.attr("data-product_sku") || null;

    const $price = $el.find(".price").first();
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
      const dostupnost = $el.hasClass("outofstock") ? "RASPRODATO" : "NA_STANJU";
      products.push({ id, sku, naziv, brend: extractBrand(naziv), cena, redovna_cena: redovnaCena, popust_procenat: popustProcenat, popust_iznos: popustIznos, valuta: "RSD", dostupnost, url, izvor: "bosshop" });
    }
  });
  return products;
}

function extractBrand(name) {
  const upper = name.toUpperCase();
  for (const b of ["BOSCH","MAKITA","DEWALT","METABO","HIKOKI","MILWAUKEE","EINHELL","STANLEY","INGCO","TOTAL","FERM","VILLAGER","FESTOOL"]) {
    if (upper.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
  }
  return null;
}

function getMaxPage(html) {
  const matches = html.match(/\/page\/(\d+)\//g) || [];
  let max = 1;
  for (const m of matches) { const n = parseInt(m.match(/(\d+)/)[1]); if (n > max) max = n; }
  return max;
}

async function fetchCategory(cat) {
  const products = [];
  const fullUrl = BASE + cat.url;
  console.log(`\n📦 ${cat.name}`);
  const firstHtml = await fetchPage(fullUrl);
  const totalPages = getMaxPage(firstHtml);
  products.push(...parseProducts(firstHtml));
  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try { products.push(...parseProducts(await fetchPage(`${fullUrl}page/${page}/`))); } catch {}
  }
  console.log(`   ${products.length} proizvoda (${totalPages} str)`);
  return products;
}

async function main() {
  console.log("Bosshop Scraper — start");
  console.log("=".repeat(40));
  const allProducts = [];
  for (const cat of CATEGORIES) {
    const products = await fetchCategory(cat);
    for (const p of products) p.parent_kategorija = cat.name;
    allProducts.push(...products);
  }
  const seen = new Set();
  const unique = allProducts.filter(p => { const k = p.id || p.url; if (seen.has(k)) return false; seen.add(k); return true; });
  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${unique.length} jedinstvenih (od ${allProducts.length})`);
  const filename = path.join(DATA_DIR, `bosshop_${new Date().toISOString().slice(0, 10)}.json`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "bosshop");
}

main().catch(console.error);

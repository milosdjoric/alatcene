const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://metalflex.rs";
const DELAY_MS = 500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  {
    name: "Akumulatorski alati",
    url: "/kategorija/masine-i-alati/akumulatorski-alat/",
  },
  {
    name: "Električni alati",
    url: "/kategorija/masine-i-alati/elektricni-alat-220v/",
  },
];

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
  // "119.999,00" → 119999
  const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? null : Math.round(num);
}

function parseProducts(html) {
  const $ = cheerio.load(html);
  const products = [];

  $("li.product").each((_, el) => {
    const $el = $(el);

    const $title = $el.find(".woocommerce-loop-product__title, h2").first();
    const naziv = $title.text().trim();
    const $link = $el.find("a.woocommerce-LoopProduct-link").first();
    const url = $link.attr("href") || "";

    const $btn = $el.find(".add_to_cart_button");
    const id = $btn.attr("data-product_id") || null;
    const sku = $btn.attr("data-product_sku") || null;

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

    const dostupnost = $el.hasClass("outofstock") ? "RASPRODATO" : "NA_STANJU";

    if (naziv && cena) {
      products.push({
        id,
        sku,
        naziv,
        brend: extractBrand(naziv),
        cena,
        redovna_cena: redovnaCena,
        popust_procenat: popustProcenat,
        popust_iznos: popustIznos,
        valuta: "RSD",
        dostupnost,
        url,
        izvor: "metalflex",
      });
    }
  });

  return products;
}

function extractBrand(name) {
  const upper = name.toUpperCase();
  const brands = [
    "BOSCH", "MAKITA", "DEWALT", "METABO", "HIKOKI", "MILWAUKEE",
    "EINHELL", "STANLEY", "INGCO", "TOTAL", "FERM", "VILLAGER",
    "FESTOOL", "FEIN", "KNIPEX", "YATO", "GRAPHITE",
  ];
  for (const b of brands) {
    if (upper.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
  }
  return null;
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

async function fetchCategory(category) {
  const products = [];
  const fullUrl = BASE + category.url;

  console.log(`\n📦 ${category.name}`);

  const firstHtml = await fetchPage(fullUrl);
  const totalPages = getMaxPage(firstHtml);
  console.log(`   ${totalPages} stranica`);

  products.push(...parseProducts(firstHtml));

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      const html = await fetchPage(`${fullUrl}page/${page}/`);
      products.push(...parseProducts(html));
    } catch (err) {
      console.error(`   ⚠️ Stranica ${page}: ${err.message}`);
    }
  }

  console.log(`   Ukupno: ${products.length}`);
  return products;
}

async function main() {
  console.log("Metalflex Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of CATEGORIES) {
    const products = await fetchCategory(cat);
    for (const p of products) {
      p.parent_kategorija = cat.name;
    }
    allProducts.push(...products);
  }

  const seen = new Set();
  const unique = [];
  for (const p of allProducts) {
    const key = p.id || p.url;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${unique.length} jedinstvenih (od ${allProducts.length})`);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `metalflex_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "metalflex");
}

main().catch(console.error);

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://timkomerc.rs";
const DELAY_MS = 500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Tim Komerc parent kategorije — scraper ih otkriva i prolazi automatski
const PARENT_CATEGORIES = [
  {
    name: "Akumulatorski alat",
    url: "/product-category/akumulatorski-alat/",
  },
  {
    name: "Električni alat",
    url: "/product-category/elektricni-alat-makita/",
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
  const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? null : Math.round(num);
}

function parseProducts(html) {
  const $ = cheerio.load(html);
  const products = [];

  $("li.product.type-product").each((_, el) => {
    const $el = $(el);

    // Naziv i link
    const $title = $el.find("h3, h2").first();
    const naziv = $title.text().trim();
    const $link = $el.find('a[href*="/proizvod/"]').first();
    const url = $link.attr("href") || "";

    // ID i SKU iz add-to-cart button
    const $btn = $el.find(".add_to_cart_button");
    const id = $btn.attr("data-product_id") || null;
    const sku = $btn.attr("data-product_sku") || null;

    // Cene - WooCommerce ima del (stara) + ins (nova) za sale, ili samo amount
    const $prices = $el.find(".price");
    const $del = $prices.find("del .woocommerce-Price-amount bdi");
    const $ins = $prices.find("ins .woocommerce-Price-amount bdi");
    const $regular = $prices.find(
      ".woocommerce-Price-amount bdi"
    );

    let cena = null;
    let redovnaCena = null;

    if ($ins.length) {
      // Na akciji
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
        url: url.startsWith("http") ? url : BASE + url,
        izvor: "timkomerc",
      });
    }
  });

  return products;
}

function extractBrand(name) {
  const upper = name.toUpperCase();
  const brands = [
    "MAKITA", "BOSCH", "DEWALT", "KNIPEX", "WERA", "WIHA",
    "STANLEY", "FESTOOL", "METABO", "HIKOKI", "MILWAUKEE",
    "GEDORE", "BAHCO", "FEIN", "EINHELL",
  ];
  for (const b of brands) {
    if (upper.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
  }
  return name.split(/\s+/)[0] || null;
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

// Otkri podkategorije sa parent stranice
function findSubcategories(html, parentUrl) {
  const $ = cheerio.load(html);
  const subs = [];

  $("li.product-category a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const name = $(el).find("h3, h2").text().trim().replace(/\s*\(\d+\)/, "");
    if (href && name && href.includes("product-category")) {
      subs.push({ name, url: href });
    }
  });

  return subs;
}

async function fetchCategoryWithPagination(url, name) {
  const products = [];

  const firstHtml = await fetchPage(url);

  // Proveri da li ova stranica ima podkategorije umesto proizvoda
  const subcats = findSubcategories(firstHtml, url);
  if (subcats.length > 0) {
    // Rekurzivno obradi podkategorije
    for (const sub of subcats) {
      await sleep(DELAY_MS);
      const subProducts = await fetchCategoryWithPagination(
        sub.url,
        sub.name
      );
      products.push(...subProducts);
    }
    return products;
  }

  // Nema podkategorija — parsaj proizvode
  const maxPage = getMaxPage(firstHtml);
  const firstProducts = parseProducts(firstHtml);
  products.push(...firstProducts);

  for (let page = 2; page <= maxPage; page++) {
    await sleep(DELAY_MS);
    try {
      const pageUrl = url.endsWith("/")
        ? `${url}page/${page}/`
        : `${url}/page/${page}/`;
      const html = await fetchPage(pageUrl);
      products.push(...parseProducts(html));
    } catch (err) {
      // Stranica ne postoji
    }
  }

  if (products.length > 0) {
    console.log(`   ${name}: ${products.length} proizvoda (${maxPage} str)`);
  }

  return products;
}

async function main() {
  console.log("Tim Komerc Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of PARENT_CATEGORIES) {
    console.log(`\n📦 ${cat.name}`);
    const products = await fetchCategoryWithPagination(BASE + cat.url, cat.name);
    for (const p of products) {
      p.parent_kategorija = cat.name;
    }
    allProducts.push(...products);
  }

  // Deduplikacija
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
  console.log(
    `Ukupno: ${unique.length} jedinstvenih (od ${allProducts.length})`
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `timkomerc_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "timkomerc");
}

main().catch(console.error);

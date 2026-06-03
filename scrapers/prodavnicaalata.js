const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://www.prodavnicaalata.rs";
const DELAY_MS = 400;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Top grupe (samo alat) → naziv za parent_kategorija. Podkategorije čitamo sa
// stranice svake grupe (blok .subcategory-item) i koristimo kao `kategorija`.
const PARENT_NAMES = {
  "elektricni-alat": "Električni alat",
  "akumulatorski-alati": "Akumulatorski alati",
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

function parsePage(html) {
  const $ = cheerio.load(html);
  const products = [];

  $("div.product-card").each((_, el) => {
    const $el = $(el);
    const $btn = $el.find("button.cart-add");

    const id = $btn.attr("data-id") || null;
    const sku = $btn.attr("data-sku") || null;
    const naziv =
      $btn.attr("data-label") ||
      $el.find(".product-card__name a").text().trim();
    const stanje = parseInt($btn.attr("data-stock"), 10) || 0;
    const redovnaCena = parseFloat($btn.attr("data-price")) || null;
    const akcijskaCena = parseFloat($btn.attr("data-sale_price")) || null;

    const cena = akcijskaCena || redovnaCena;

    let popustProcenat = null;
    let popustIznos = null;
    if (redovnaCena && akcijskaCena && redovnaCena > akcijskaCena) {
      popustIznos = Math.round(redovnaCena - akcijskaCena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    const brend = $el.find("img.product-manuf-list-img").attr("alt") || null;

    const url = $el.find(".product-card__name a").attr("href") || "";

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
        dostupnost: stanje > 0 ? "NA_STANJU" : "RASPRODATO",
        kolicina_na_stanju: stanje,
        url: url.startsWith("http") ? url : BASE + url,
        izvor: "prodavnicaalata",
      });
    }
  });

  return products;
}

function getTotalPages(html) {
  const match = html.match(/strana\/(\d+)/g);
  if (!match) return 1;
  let max = 1;
  for (const m of match) {
    const num = parseInt(m.split("/")[1]);
    if (num > max) max = num;
  }
  return max;
}

// Pročitaj podkategorije sa stranice svake top grupe (blok .subcategory-item).
async function fetchCategories() {
  const out = [];
  const seen = new Set();

  for (const [top, parentName] of Object.entries(PARENT_NAMES)) {
    const html = await fetchPage(`${BASE}/proizvodi/kategorije/${top}/`);
    const $ = cheerio.load(html);

    $(".subcategory-item").each((_, el) => {
      const $a = $(el).find("a").first();
      const href = $a.attr("href") || "";
      const naziv = ($a.find("img").attr("alt") || $a.text())
        .trim()
        .replace(/\s+/g, " ");
      const m = href.match(/\/proizvodi\/kategorije\/([a-z0-9-]+)\/?$/);
      if (!m || !naziv || seen.has(m[1])) return;
      seen.add(m[1]);
      out.push({
        url: `${BASE}/proizvodi/kategorije/${m[1]}/`,
        kategorija: naziv,
        parent: parentName,
      });
    });
  }

  return out;
}

// Scrape svih stranica jednog kategorija URL-a (paginacija .../strana/N/).
async function fetchCategoryProducts(url, label) {
  const products = [];
  const firstHtml = await fetchPage(url);
  const totalPages = getTotalPages(firstHtml);

  products.push(...parsePage(firstHtml));

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      const html = await fetchPage(`${url}strana/${page}/`);
      products.push(...parsePage(html));
    } catch (err) {
      console.error(`   ⚠️ ${label} str. ${page}: ${err.message}`);
    }
  }

  console.log(`   ${label} — ${products.length} proizvoda (${totalPages} str.)`);
  return products;
}

async function main() {
  console.log("Prodavnica Alata Scraper — start");
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
      const products = await fetchCategoryProducts(
        `${BASE}/proizvodi/kategorije/${slug}/`,
        name
      );
      addProducts(products, null, name);
    } catch (err) {
      console.error(`   ⚠️ ${name}: ${err.message}`);
    }
  }

  const unique = [...byKey.values()];
  const withCat = unique.filter((p) => p.kategorija).length;

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${unique.length} proizvoda`);
  console.log(`Sa podkategorijom: ${withCat} (${((withCat / unique.length) * 100).toFixed(1)}%)`);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `prodavnicaalata_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "prodavnicaalata");
}

main().catch(console.error);

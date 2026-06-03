const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://www.gama-alati.rs";

const DELAY_MS = 600;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Top grupe (samo alat) → naziv za parent_kategorija. Podkategorije čitamo sa
// stranice svake grupe i koristimo kao `kategorija`.
const PARENT_NAMES = {
  "elektricni-alati": "Električni alati",
  "akumulatorski-alati": "Akumulatorski alati",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePage(html) {
  const $ = cheerio.load(html);
  const products = [];

  $("li.item.product.product-item").each((_, el) => {
    const $el = $(el);

    const $link = $el.find("a.product-item-link");
    const naziv = $link.text().trim();
    const url = $link.attr("href") || "";

    const productId =
      $el.find("[data-product-id]").attr("data-product-id") || null;
    const sku = $el.find("[data-product-sku]").attr("data-product-sku") || null;

    const $priceBox = $el.find(".price-box");

    let cena = null;
    let redovnaCena = null;

    const $specialPrice = $priceBox.find(
      '.special-price [data-price-type="finalPrice"]'
    );
    const $oldPrice = $priceBox.find('.old-price [data-price-type="oldPrice"]');

    if ($specialPrice.length) {
      cena = parseFloat($specialPrice.attr("data-price-amount")) || null;
      redovnaCena = parseFloat($oldPrice.attr("data-price-amount")) || null;
    } else {
      const $regularPrice = $priceBox.find('[data-price-type="finalPrice"]');
      cena = parseFloat($regularPrice.attr("data-price-amount")) || null;
      redovnaCena = cena;
    }

    let popustProcenat = null;
    let popustIznos = null;
    if (redovnaCena && cena && redovnaCena > cena) {
      popustIznos = Math.round(redovnaCena - cena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    const brend =
      $el
        .find('img[alt][src*="brand-logos"]')
        .attr("alt")
        ?.replace(/^\w/, (c) => c.toUpperCase()) || null;

    const specs = [];
    $el.find(".product-item-description li").each((_, li) => {
      specs.push($(li).text().trim());
    });

    const dostupnost =
      $el.find("button.tocart").length > 0 ? "NA_STANJU" : "RASPRODATO";

    if (naziv) {
      products.push({
        id: productId,
        sku,
        naziv,
        brend,
        cena,
        redovna_cena: redovnaCena,
        popust_procenat: popustProcenat,
        popust_iznos: popustIznos,
        valuta: "RSD",
        dostupnost,
        specifikacije: specs.length > 0 ? specs : null,
        url,
        izvor: "gama-alati",
      });
    }
  });

  return products;
}

function getTotalCount(html) {
  const match = html.match(/(\d+)\s*Proizvoda/);
  return match ? parseInt(match[1]) : 0;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} za ${url}`);
  }
  return res.text();
}

// Pročitaj podkategorije sa stranice svake top grupe. Magento: putanja
// /proizvodi/{top}/{sub}/, naziv iz teksta linka.
async function fetchCategories() {
  const out = [];
  const seen = new Set();
  const escBase = BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  for (const [top, parentName] of Object.entries(PARENT_NAMES)) {
    const html = await fetchPage(`${BASE}/proizvodi/${top}/`);
    const $ = cheerio.load(html);
    const re = new RegExp(`^${escBase}/proizvodi/${top}/([a-z0-9-]+)/$`);

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(re);
      if (!m) return;
      const naziv = $(el).text().trim().replace(/\s+/g, " ");
      if (!naziv || naziv.length > 50 || seen.has(m[1])) return;
      seen.add(m[1]);
      out.push({
        url: `${BASE}/proizvodi/${top}/${m[1]}/`,
        kategorija: naziv,
        parent: parentName,
      });
    });
  }

  return out;
}

// Scrape svih stranica jednog kategorija URL-a (Magento ?p=N paginacija).
async function fetchCategoryProducts(url, label) {
  const products = [];
  const firstHtml = await fetchPage(url);
  const totalCount = getTotalCount(firstHtml);
  const totalPages = Math.max(1, Math.ceil(totalCount / 24));

  products.push(...parsePage(firstHtml));

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      const html = await fetchPage(`${url}?p=${page}`);
      products.push(...parsePage(html));
    } catch (err) {
      console.error(`   ⚠️ ${label} str. ${page}: ${err.message}`);
    }
  }

  console.log(`   ${label} — ${products.length} proizvoda (${totalPages} str.)`);
  return products;
}

async function main() {
  console.log("Gama Alati Scraper — start");
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
      const products = await fetchCategoryProducts(`${BASE}/proizvodi/${slug}/`, name);
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
  const filename = path.join(DATA_DIR, `gama_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "gama-alati");
}

main().catch(console.error);

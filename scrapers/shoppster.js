const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

const BASE_URL = "https://www.shoppster.rs/rest/v2/ung-site-rs/products/search";
const PAGE_SIZE = 100; // API podržava do 100
const DELAY_MS = 500; // pauza između requestova da ne opteretimo server

const CATEGORIES = [
  { code: "F0701", name: "Električni alati" },
  { code: "F0702", name: "Aku alati" },
];

function buildUrl(categoryCode, page) {
  const params = new URLSearchParams({
    fields: "SEARCH",
    query: `:relevance:allCategories:${categoryCode}`,
    pageSize: PAGE_SIZE,
    currentPage: page,
    categoryCode,
    searchQueryContext: "REGULAR_CATEGORY_PAGE_SEARCH",
    lang: "sr",
    curr: "RSD",
  });
  return `${BASE_URL}?${params}`;
}

function extractProduct(p) {
  return {
    id: p.code,
    naziv: p.name,
    brend: p.brandCategoryName || null,
    kategorija: p.lastCategory?.name || null,
    kategorija_kod: p.lastCategory?.code || null,
    cena: p.salePrice?.value ?? p.price?.value ?? null,
    redovna_cena: p.price?.value ?? null,
    popust_procenat: p.salePrice?.savedAmount?.relativeAmount ?? null,
    popust_iznos: p.salePrice?.savedAmount?.absoluteAmount ?? null,
    valuta: "RSD",
    ocena: p.averageRating ?? null,
    broj_recenzija: p.numberOfReviewComments ?? 0,
    url: `https://www.shoppster.rs/p/${p.code}`,
    dostupnost: "NA_STANJU",
    izvor: "shoppster",
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCategory(category) {
  const products = [];
  let page = 0;
  let totalPages = 1;

  console.log(`\n📦 ${category.name} (${category.code})`);

  // Prvo dohvati prvu stranicu da saznamo ukupan broj
  const firstUrl = buildUrl(category.code, 0);
  const firstRes = await fetch(firstUrl);
  const firstData = await firstRes.json();

  totalPages = firstData.pagination.totalPages;
  const totalProducts = firstData.pagination.totalResults;
  console.log(`   Ukupno: ${totalProducts} proizvoda, ${totalPages} stranica`);

  // Obradi prvu stranicu
  for (const p of firstData.products || []) {
    products.push(extractProduct(p));
  }
  console.log(`   Stranica 1/${totalPages} — ${products.length} proizvoda`);

  // Obradi ostale stranice
  for (page = 1; page < totalPages; page++) {
    await sleep(DELAY_MS);

    const url = buildUrl(category.code, page);
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`   ⚠️ Greška na stranici ${page + 1}: ${res.status}`);
      continue;
    }

    const data = await res.json();
    for (const p of data.products || []) {
      products.push(extractProduct(p));
    }
    console.log(
      `   Stranica ${page + 1}/${totalPages} — ukupno ${products.length} proizvoda`
    );
  }

  return products;
}

async function main() {
  console.log("Shoppster Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of CATEGORIES) {
    const products = await fetchCategory(cat);
    // Dodaj info o parent kategoriji
    for (const p of products) {
      p.parent_kategorija = cat.name;
      p.parent_kategorija_kod = cat.code;
    }
    allProducts.push(...products);
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${allProducts.length} proizvoda`);

  // Sačuvaj rezultat
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `shoppster_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(allProducts, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(allProducts, "shoppster");
}

main().catch(console.error);

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

const ALGOLIA_APP_ID = "Y1BSBVJ7AC";
const ALGOLIA_API_KEY = "dc5fcfef3e1ff9d07c8bb5aa76e94a04";
const ALGOLIA_INDEX = "prod_merchant_inventories_sr";
const ALGOLIA_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

const HITS_PER_PAGE = 1000;
const DELAY_MS = 500;

const CATEGORIES = [
  {
    name: "Akumulatorski alati",
    facet: "Uradi sam > Aku alat (Akumulatorski alati)",
  },
  {
    name: "Električni alati",
    facet: "Uradi sam > Električni alati",
  },
];

function extractProduct(hit) {
  const p = hit.product || {};
  const slug = p.slug || "";
  const objectID = hit.objectID;

  // Specifikacije iz svih atributa
  const specs = [];
  for (const [key, val] of Object.entries(p.measurementAttributes || {})) {
    if (val.value != null) specs.push(`${val.name || key}: ${val.value} ${val.unit || ""}`.trim());
  }
  for (const [key, val] of Object.entries(p.textAttributes || {})) {
    if (val.value) specs.push(`${val.name || key}: ${val.value}`);
  }
  for (const [key, val] of Object.entries(p.selectAttributes || {})) {
    if (val.value) specs.push(`${val.name || key}: ${val.value}`);
  }

  return {
    id: objectID,
    sku: p.ean || null,
    naziv: p.name || hit.name || "",
    brend: p.brand || null,
    kategorija: (p.categoryNames || []).slice(-1)[0] || null,
    cena: hit.price ? Math.round(hit.price) : null,
    redovna_cena: hit.basePrice ? Math.round(hit.basePrice) : null,
    popust_procenat: hit.discountPercentage ? Math.round(hit.discountPercentage) : null,
    popust_iznos: hit.discountAmount ? Math.round(hit.discountAmount) : null,
    valuta: "RSD",
    url: `https://ananas.rs/proizvod/${slug}/${objectID}`,
    dostupnost: hit.onStock ? "NA_STANJU" : "RASPRODATO",
    ocena: null,
    broj_recenzija: null,
    specifikacije: specs.length > 0 ? specs : null,
    izvor: "ananas",
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCategory(category) {
  const products = [];
  let page = 0;
  let totalPages = 1;

  console.log(`\n📦 ${category.name}`);

  while (page < totalPages) {
    const res = await fetch(ALGOLIA_URL, {
      method: "POST",
      headers: {
        "X-Algolia-Application-Id": ALGOLIA_APP_ID,
        "X-Algolia-API-Key": ALGOLIA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "",
        hitsPerPage: HITS_PER_PAGE,
        page,
        facetFilters: [`product.categories.lvl1:${category.facet}`],
        attributesToRetrieve: [
          "objectID", "price", "basePrice", "onSale",
          "discountPercentage", "discountAmount", "onStock", "available",
          "product.name", "product.brand", "product.slug", "product.ean",
          "product.categoryNames",
          "product.measurementAttributes", "product.textAttributes",
          "product.selectAttributes",
        ],
      }),
    });

    if (!res.ok) {
      console.error(`   ⚠️ Algolia greška: ${res.status}`);
      break;
    }

    const data = await res.json();

    if (page === 0) {
      totalPages = data.nbPages || 1;
      console.log(`   Ukupno: ${data.nbHits} proizvoda, ${totalPages} stranica`);
    }

    for (const hit of data.hits || []) {
      products.push(extractProduct(hit));
    }

    console.log(`   Stranica ${page + 1}/${totalPages} — ukupno ${products.length} proizvoda`);
    page++;

    if (page < totalPages) await sleep(DELAY_MS);
  }

  return products;
}

async function main() {
  console.log("Ananas Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of CATEGORIES) {
    const products = await fetchCategory(cat);
    for (const p of products) {
      p.parent_kategorija = cat.name;
    }
    allProducts.push(...products);
  }

  // Deduplikacija po ID
  const seen = new Set();
  const unique = allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${unique.length} proizvoda (pre dedup: ${allProducts.length})`);

  // Sačuvaj
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `ananas_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "ananas");
}

main().catch(console.error);

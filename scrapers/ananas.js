const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

const ALGOLIA_APP_ID = "Y1BSBVJ7AC";
const ALGOLIA_API_KEY = "dc5fcfef3e1ff9d07c8bb5aa76e94a04";
const ALGOLIA_INDEX = "prod_merchant_inventories_sr";
const ALGOLIA_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

const HITS_PER_PAGE = 1000;
const DELAY_MS = 500;

// Top grupe (lvl1). Prave podkategorije čitamo iz lvl2 faceta svake grupe —
// categoryNames u hitu je nepouzdan (često vraća samo "Uradi sam").
const TOP_GROUPS = [
  {
    name: "Akumulatorski alati",
    lvl1: "Uradi sam > Aku alat (Akumulatorski alati)",
  },
  {
    name: "Električni alati",
    lvl1: "Uradi sam > Električni alati",
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
    kategorija: null, // postavlja se iz lvl2 faceta u fetchSubcategory
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

// Pročitaj lvl2 podkategorije za jednu top grupu (npr "... > Aku bušilice i šrafilice").
async function fetchSubcategories(lvl1) {
  const res = await fetch(ALGOLIA_URL, {
    method: "POST",
    headers: {
      "X-Algolia-Application-Id": ALGOLIA_APP_ID,
      "X-Algolia-API-Key": ALGOLIA_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: "",
      hitsPerPage: 0,
      page: 0,
      facetFilters: [`product.categories.lvl1:${lvl1}`],
      maxValuesPerFacet: 200,
      facets: ["product.categories.lvl2"],
    }),
  });
  if (!res.ok) throw new Error(`Algolia facet greška: ${res.status}`);
  const data = await res.json();
  const facet = data.facets?.["product.categories.lvl2"] || {};
  // Ananas proizvodi pripadaju više stabala — facet lvl2 vraća i strane putanje
  // (npr "Telefoni > ... > Power bank"). Zadrži samo prave podkat ove grupe.
  const prefix = `${lvl1} > `;
  return Object.keys(facet)
    .filter((path) => path.startsWith(prefix))
    .map((path) => ({
      facet: path,
      lvl1,
      kategorija: path.split(" > ").slice(-1)[0],
    }));
}

// Povuci sve proizvode jedne lvl2 podkategorije i obeleži ih tom kategorijom.
async function fetchSubcategory(sub) {
  const products = [];
  let page = 0;
  let totalPages = 1;

  console.log(`   📦 ${sub.kategorija}`);

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
        facetFilters: [
          `product.categories.lvl1:${sub.lvl1}`,
          `product.categories.lvl2:${sub.facet}`,
        ],
        attributesToRetrieve: [
          "objectID", "price", "basePrice", "onSale",
          "discountPercentage", "discountAmount", "onStock", "available",
          "product.name", "product.brand", "product.slug", "product.ean",
          "product.measurementAttributes", "product.textAttributes",
          "product.selectAttributes",
        ],
      }),
    });

    if (!res.ok) {
      console.error(`      ⚠️ Algolia greška: ${res.status}`);
      break;
    }

    const data = await res.json();
    if (page === 0) totalPages = data.nbPages || 1;

    for (const hit of data.hits || []) {
      const p = extractProduct(hit);
      p.kategorija = sub.kategorija;
      products.push(p);
    }

    page++;
    if (page < totalPages) await sleep(DELAY_MS);
  }

  return products;
}

async function main() {
  console.log("Ananas Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const group of TOP_GROUPS) {
    console.log(`\n📦 ${group.name}`);
    const subs = await fetchSubcategories(group.lvl1);
    console.log(`   Pronađeno ${subs.length} podkategorija`);
    await sleep(DELAY_MS);
    for (const sub of subs) {
      const products = await fetchSubcategory(sub);
      for (const p of products) p.parent_kategorija = group.name;
      allProducts.push(...products);
      await sleep(DELAY_MS);
    }
  }

  // Deduplikacija po ID (proizvod ume da bude u 2 podkategorije — prvi pobeđuje)
  const seen = new Set();
  const unique = allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const withCat = unique.filter((p) => p.kategorija).length;
  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${unique.length} jedinstvenih (pre dedup: ${allProducts.length})`);
  console.log(`Sa podkategorijom: ${withCat} (${((withCat / unique.length) * 100).toFixed(1)}%)`);

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

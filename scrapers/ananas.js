const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

const ALGOLIA_APP_ID = "Y1BSBVJ7AC";
// Javni search-only ključ koji Ananas šalje svakom browseru. Rotiraju ga
// (2026-09: stari ključ → 403 "Invalid Application-ID or API key"), pa ga pri
// svakom pokretanju čitamo sa sajta; konstanta je samo rezerva.
const ALGOLIA_API_KEY_FALLBACK = "78d3f4f3befb3c4a68f4ebbf8c38fd81";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
let algoliaApiKey = ALGOLIA_API_KEY_FALLBACK;

// Ključ je u konfiguraciji Next.js _app bundle-a: algoliaSearchOnlyAPIKey:"…".
async function resolveAlgoliaKey() {
  try {
    const html = await (await fetch("https://ananas.rs/", { headers: { "User-Agent": USER_AGENT } })).text();
    const appJs = html.match(/\/_next\/static\/chunks\/pages\/_app-[a-f0-9]+\.js/);
    if (!appJs) throw new Error("_app bundle nije pronađen");
    const js = await (await fetch(`https://ananas.rs${appJs[0]}`, { headers: { "User-Agent": USER_AGENT } })).text();
    const key = js.match(/algoliaSearchOnlyAPIKey:"([a-f0-9]{32})"/);
    if (!key) throw new Error("algoliaSearchOnlyAPIKey nije pronađen");
    if (key[1] !== ALGOLIA_API_KEY_FALLBACK) console.log(`   ℹ️ Algolia ključ promenjen na sajtu: ${key[1]}`);
    return key[1];
  } catch (err) {
    console.warn(`   ⚠️ Čitanje Algolia ključa sa sajta nije uspelo (${err.message}) — koristim rezervni`);
    return ALGOLIA_API_KEY_FALLBACK;
  }
}
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
      "X-Algolia-API-Key": algoliaApiKey,
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
        "X-Algolia-API-Key": algoliaApiKey,
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

  algoliaApiKey = await resolveAlgoliaKey();

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

main().catch((err) => {
  console.error(err);
  process.exit(1); // scrape-all mora da vidi pad (ranije exit 0 → lažni ✓)
});

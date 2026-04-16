const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://sbt-alati.rs";
const DELAY_MS = 400;

const CATEGORIES = [
  {
    name: "Akumulatorski alati",
    handle: "aku-alati-bosch-makita-akcija",
  },
  {
    name: "Električni alati",
    handle: "elektricni-alati-alati-prodaja",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractProduct(p) {
  const v = p.variants?.[0] || {};
  const cena = Math.round(parseFloat(v.price) || 0);
  const redovnaCena = v.compare_at_price
    ? Math.round(parseFloat(v.compare_at_price))
    : cena;

  let popustProcenat = null;
  let popustIznos = null;
  if (redovnaCena > cena) {
    popustIznos = redovnaCena - cena;
    popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
  }

  return {
    id: String(p.id),
    sku: v.sku || null,
    naziv: p.title,
    brend: p.vendor || null,
    kategorija: p.product_type || null,
    cena,
    redovna_cena: redovnaCena,
    popust_procenat: popustProcenat,
    popust_iznos: popustIznos,
    valuta: "RSD",
    dostupnost: v.available ? "NA_STANJU" : "RASPRODATO",
    url: `${BASE}/products/${p.handle}`,
    izvor: "sbt-alati",
  };
}

async function fetchCategory(category) {
  const products = [];
  let page = 1;

  console.log(`\n📦 ${category.name}`);

  while (true) {
    const url = `${BASE}/collections/${category.handle}/products.json?limit=250&page=${page}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`   ⚠️ HTTP ${res.status} na stranici ${page}`);
      break;
    }

    const data = await res.json();
    const batch = data.products || [];

    if (batch.length === 0) break;

    for (const p of batch) {
      products.push(extractProduct(p));
    }

    console.log(
      `   Stranica ${page} — ${batch.length} novih, ukupno ${products.length}`
    );

    if (batch.length < 250) break;
    page++;
    await sleep(DELAY_MS);
  }

  return products;
}

async function main() {
  console.log("SBT Alati Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of CATEGORIES) {
    const products = await fetchCategory(cat);
    for (const p of products) {
      p.parent_kategorija = cat.name;
    }
    allProducts.push(...products);
  }

  // Deduplikacija
  const seen = new Set();
  const unique = [];
  for (const p of allProducts) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      unique.push(p);
    }
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(
    `Ukupno: ${unique.length} jedinstvenih (od ${allProducts.length})`
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `sbt-alati_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "sbt-alati");
}

main().catch(console.error);

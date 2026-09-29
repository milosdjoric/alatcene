const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://www.prodavnicaalata.rs";
const DELAY_MS = 400;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Top grupe (samo alat) → naziv za parent_kategorija. Podkategorije čitamo iz
// stabla kategorija sa sajta i koristimo kao `kategorija`.
const PARENT_NAMES = {
  "elektricni-alat": "Električni alat",
  "akumulatorski-alati": "Akumulatorski alati",
};

// Sajt je 2026-09 prešao na Next.js (Tailwind klase, bez stabilnih CSS hook-ova).
// Podatke čitamo iz RSC payload-a (self.__next_f) koji Next ugrađuje u HTML —
// strukturiran JSON sa cenama, stanjem i paginacijom, stabilniji od markup-a.
function decodeRscPayload(html) {
  const chunks = [
    ...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g),
  ];
  return chunks.map((m) => JSON.parse(`"${m[1]}"`)).join("");
}

// Izvuci JSON objekat koji počinje na `start` (balansiranje zagrada, poštuje stringove).
function extractObject(text, start) {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0)
      return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("RSC: nezatvoren JSON objekat");
}

function findObject(payload, marker) {
  const at = payload.indexOf(marker);
  return at === -1 ? null : extractObject(payload, at);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPayload(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} za ${url}`);
  return decodeRscPayload(await res.text());
}

function toProduct(p) {
  const cena = p.displayPrice;
  const redovnaCena = p.originalPrice || cena;

  let popustProcenat = null;
  let popustIznos = null;
  if (redovnaCena > cena) {
    popustIznos = Math.round(redovnaCena - cena);
    popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
  }

  return {
    id: String(p.id),
    sku: p.sku || null,
    naziv: p.title,
    brend: p.brandName || null,
    cena,
    redovna_cena: redovnaCena,
    popust_procenat: popustProcenat,
    popust_iznos: popustIznos,
    valuta: "RSD",
    dostupnost: p.inStock ? "NA_STANJU" : "RASPRODATO",
    url: `${BASE}/proizvodi/${p.slug}/`,
    izvor: "prodavnicaalata",
  };
}

// Podkategorije top grupa iz stabla kategorija ({"categories":[...subCategories]}).
async function fetchCategories() {
  const payload = await fetchPayload(`${BASE}/proizvodi/kategorije/`);
  const tree = findObject(payload, '{"categories":[');
  if (!tree) throw new Error("RSC: stablo kategorija nije pronađeno");

  const out = [];
  for (const top of tree.categories) {
    const parent = PARENT_NAMES[top.slug];
    if (!parent) continue;
    for (const sub of top.subCategories || []) {
      out.push({
        url: `${BASE}/proizvodi/kategorije/${sub.slug}/`,
        kategorija: sub.name,
        parent,
      });
    }
  }
  return out;
}

// Sve strane jednog kategorija URL-a (paginacija ?strana=N).
async function fetchCategoryProducts(url, label) {
  const first = findObject(await fetchPayload(url), '{"products":[');
  if (!first) throw new Error("RSC: lista proizvoda nije pronađena");

  const products = first.products.map(toProduct);
  const perPage = first.products.length || 1;
  const totalPages = Math.ceil(first.totalRecords / perPage);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      const data = findObject(
        await fetchPayload(`${url}?strana=${page}`),
        '{"products":[',
      );
      if (!data || data.currentPage !== page)
        throw new Error("neočekivana strana");
      products.push(...data.products.map(toProduct));
    } catch (err) {
      console.error(`   ⚠️ ${label} str. ${page}: ${err.message}`);
    }
  }

  console.log(
    `   ${label} — ${products.length} proizvoda (${totalPages} str.)`,
  );
  return products;
}

async function main() {
  console.log("Prodavnica Alata Scraper — start");
  console.log("=".repeat(40));

  const subcats = await fetchCategories();
  console.log(`Pronađeno ${subcats.length} podkategorija\n`);

  // id → proizvod; prvi (specifična podkategorija) pobeđuje nad root fallback
  const byKey = new Map();
  const addProducts = (products, kategorija, parent) => {
    for (const p of products) {
      if (byKey.has(p.id)) continue;
      p.kategorija = kategorija;
      p.parent_kategorija = parent;
      byKey.set(p.id, p);
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
        name,
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
  console.log(
    `Sa podkategorijom: ${withCat} (${((withCat / unique.length) * 100).toFixed(1)}%)`,
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `prodavnicaalata_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "prodavnicaalata");
}

main().catch((err) => {
  console.error(err);
  process.exit(1); // scrape-all mora da vidi pad (ranije exit 0 → lažni ✓)
});

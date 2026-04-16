const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://www.odigledolokomotive.rs";
const DELAY_MS = 400;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  { name: "Akumulatorski alati", url: "/kategorija/akumulatorski-alat/" },
  { name: "Električni alati", url: "/kategorija/elektricni-alat/" },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
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

  $('[class^="product-loop"]').each((_, el) => {
    const $el = $(el);
    // Samo elementi koji imaju naslov (ne nested child elemente)
    const $title = $el.find(".product-loop-title a");
    if (!$title.length) return;

    const naziv = $title.text().trim();
    const url = $title.attr("href") || "";

    // Cena: discount = stara, regular = nova (akcijska)
    const discountText = $el.find(".product-loop-price-discount").text().trim();
    const regularText = $el.find(".product-loop-price-regular").text().trim();

    let cena = parsePrice(regularText) || parsePrice(discountText);
    let redovnaCena = discountText ? parsePrice(discountText) : cena;
    // Ako nema discount, onda regular JE cena
    if (!discountText && regularText) {
      redovnaCena = cena;
    }

    // ID iz URL-a: /proizvod/name-1234/ -> 1234
    const idMatch = url.match(/-(\d+)\/?$/);
    const id = idMatch ? idMatch[1] : null;

    let popustProcenat = null, popustIznos = null;
    if (redovnaCena && cena && redovnaCena > cena) {
      popustIznos = Math.round(redovnaCena - cena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    if (naziv && cena) {
      products.push({ id, naziv, brend: extractBrand(naziv), cena, redovna_cena: redovnaCena, popust_procenat: popustProcenat, popust_iznos: popustIznos, valuta: "RSD", url: url.startsWith("http") ? url : BASE + url, izvor: "odigledolokomotive" });
    }
  });
  return products;
}

function extractBrand(name) {
  const upper = name.toUpperCase();
  for (const b of ["BOSCH","MAKITA","DEWALT","METABO","HIKOKI","MILWAUKEE","EINHELL","STANLEY","INGCO","TOTAL","FERM","VILLAGER","FESTOOL","FEIN","KNIPEX","YATO","GRAPHITE","DAEWOO"]) {
    if (upper.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
  }
  return null;
}

function getSubcategories(html) {
  const subs = new Set();
  const matches = html.matchAll(/href="(\/proizvodi\/[^"]+\/)"/g);
  for (const m of matches) subs.add(m[1]);
  return [...subs];
}

async function fetchSubcategory(subUrl, subName) {
  const products = [];
  let page = 1;

  while (page <= 50) {
    const url = page === 1 ? BASE + subUrl : BASE + subUrl + page;
    await sleep(DELAY_MS);

    try {
      const html = await fetchPage(url);
      const batch = parseProducts(html);
      if (batch.length === 0) break;

      // Deduplikacija unutar podkategorije
      const newProducts = batch.filter(
        (p) => !products.some((e) => e.id === p.id || e.url === p.url)
      );
      if (newProducts.length === 0) break;

      products.push(...newProducts);
      if (batch.length < 30) break;
      page++;
    } catch {
      break;
    }
  }

  return products;
}

async function main() {
  console.log("Od Igle Do Lokomotive Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of CATEGORIES) {
    console.log(`\n📦 ${cat.name}`);
    const html = await fetchPage(BASE + cat.url);
    const subcats = getSubcategories(html);
    console.log(`   ${subcats.length} podkategorija`);

    for (let i = 0; i < subcats.length; i++) {
      const subName = subcats[i].replace("/proizvodi/", "").replace(/\/$/, "").replace(/-/g, " ");
      const products = await fetchSubcategory(subcats[i], subName);

      for (const p of products) {
        p.parent_kategorija = cat.name;
        p.kategorija = subName;
      }
      allProducts.push(...products);

      if (products.length > 0 && (i % 10 === 0 || i === subcats.length - 1)) {
        console.log(`   [${i + 1}/${subcats.length}] ${subName}: ${products.length}`);
      }
    }
  }

  const seen = new Set();
  const unique = allProducts.filter((p) => {
    const k = p.id || p.url;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${unique.length} jedinstvenih (od ${allProducts.length})`);

  const filename = path.join(DATA_DIR, `odigledolokomotive_${new Date().toISOString().slice(0, 10)}.json`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);
}

main().catch(console.error);

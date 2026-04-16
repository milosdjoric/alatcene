const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://eplaneta.rs";
const DELAY_MS = 500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  {
    name: "Akumulatorski alati",
    url: "/alati-i-masine/akumulatorski-alati.html",
    subcatPattern: "alati-i-masine/akumulatorski-alati/",
  },
  {
    name: "Električni alati",
    url: "/alati-i-masine/elektricni-alati.html",
    subcatPattern: "alati-i-masine/elektricni-alati/",
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

function parseProducts(html) {
  const $ = cheerio.load(html);
  const products = [];

  $("li.item.product.product-item").each((_, el) => {
    const $el = $(el);

    // data atributi na <li>
    const id = $el.attr("data-cnstrc-item-id") || null;
    const naziv = $el.attr("data-cnstrc-item-name") || "";
    const cenaFromAttr = parseInt($el.attr("data-cnstrc-item-price")) || null;

    const $link = $el.find(".product-item-name a");
    const url = $link.attr("href") || "";

    // Cene iz HTML-a
    const specialText = $el.find(".special-price").text().trim();
    const oldText = $el.find(".old-price").text().trim();
    const regularText = $el.find(".price.one-price-plp, .price").first().text().trim();

    // Prioritet: data atribut (uvek čist broj), pa HTML
    let cena = cenaFromAttr || parsePrice(specialText) || parsePrice(regularText);
    let redovnaCena = parsePrice(oldText) || cena;

    let popustProcenat = null;
    let popustIznos = null;
    if (redovnaCena && cena && redovnaCena > cena) {
      popustIznos = Math.round(redovnaCena - cena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    if (naziv && cena) {
      products.push({
        id,
        naziv,
        brend: extractBrand(naziv),
        cena,
        redovna_cena: redovnaCena,
        popust_procenat: popustProcenat,
        popust_iznos: popustIznos,
        valuta: "RSD",
        dostupnost: "NA_STANJU",
        url,
        izvor: "eplaneta",
      });
    }
  });

  return products;
}

function parsePrice(text) {
  if (!text) return null;
  const clean = text.replace(/[^0-9.,]/g, "").trim();
  if (!clean) return null;

  // ePlaneta koristi dva formata:
  // "35999" — ceo broj (sa data atributa ili stranica 1)
  // "14289.99" — decimalni sa tačkom (paginacija)
  // "35.999,00" — srpski format sa tačkom kao hiljadni separator

  if (clean.includes(",")) {
    // Srpski format: "35.999,00" → tačka je hiljadni
    const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
    return isNaN(num) ? null : Math.round(num);
  }

  // Ako ima tačku i posle nje tačno 2 cifre → decimalni separator
  if (/\.\d{2}$/.test(clean)) {
    const num = parseFloat(clean);
    return isNaN(num) ? null : Math.round(num);
  }

  // Nema decimala — ceo broj, tačka je hiljadni
  const num = parseFloat(clean.replace(/\./g, ""));
  return isNaN(num) ? null : Math.round(num);
}

function extractBrand(name) {
  const upper = name.toUpperCase();
  const brands = [
    "BOSCH", "MAKITA", "DEWALT", "METABO", "HIKOKI", "MILWAUKEE",
    "EINHELL", "STANLEY", "INGCO", "TOTAL", "FERM", "VILLAGER",
    "FIELDMANN", "FESTOOL", "FEIN", "KNIPEX", "YATO",
  ];
  for (const b of brands) {
    if (upper.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
  }
  return null;
}

function findSubcategories(html, pattern) {
  const subs = new Set();
  const regex = new RegExp(
    `href="(https://eplaneta\\.rs/${pattern.replace(/\//g, "\\/")}[^"]*\\.html)"`,
    "g"
  );
  let match;
  while ((match = regex.exec(html))) {
    subs.add(match[1]);
  }
  return [...subs];
}

async function main() {
  console.log("ePlaneta Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of CATEGORIES) {
    console.log(`\n📦 ${cat.name}`);

    const html = await fetchPage(BASE + cat.url);
    const subcats = findSubcategories(html, cat.subcatPattern);
    console.log(`   ${subcats.length} podkategorija`);

    // Proizvodi sa parent stranice
    const parentProducts = parseProducts(html);
    for (const p of parentProducts) {
      p.parent_kategorija = cat.name;
    }
    allProducts.push(...parentProducts);
    if (parentProducts.length > 0) {
      console.log(`   Glavna: ${parentProducts.length}`);
    }

    // Podkategorije sa paginacijom
    for (let i = 0; i < subcats.length; i++) {
      const subName = subcats[i].split("/").pop().replace(".html", "").replace(/-/g, " ");
      let subProducts = [];
      let page = 1;

      while (true) {
        await sleep(DELAY_MS);
        try {
          const pageUrl =
            page === 1 ? subcats[i] : `${subcats[i]}?p=${page}`;
          const subHtml = await fetchPage(pageUrl);
          const batch = parseProducts(subHtml);

          if (batch.length === 0) break;

          // Proveri duplikate (detekcija kraja)
          const newIds = batch
            .map((p) => p.id)
            .filter((id) => !subProducts.some((sp) => sp.id === id));
          if (newIds.length === 0) break;

          subProducts.push(...batch.filter((p) => newIds.includes(p.id)));
          page++;

          if (batch.length < 30) break; // Poslednja stranica
        } catch {
          break;
        }
      }

      for (const p of subProducts) {
        p.parent_kategorija = cat.name;
        p.kategorija = subName;
      }
      allProducts.push(...subProducts);

      if (subProducts.length > 0) {
        console.log(
          `   [${i + 1}/${subcats.length}] ${subName}: ${subProducts.length}${page > 2 ? ` (${page - 1} str)` : ""}`
        );
      }
    }
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
  console.log(`Ukupno: ${unique.length} jedinstvenih (od ${allProducts.length})`);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `eplaneta_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "eplaneta");
}

main().catch(console.error);

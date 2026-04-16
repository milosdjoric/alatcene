const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://simns.rs";
const DELAY_MS = 500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  {
    name: "Akumulatorski alati",
    url: "/category/akumulatorski-alat/1198/",
  },
  {
    name: "Električni alati",
    url: "/category/elektricni-alati/1197/",
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

function parsePrice(text) {
  if (!text) return null;
  const clean = text.replace(/[^0-9.,]/g, "").trim();
  if (!clean) return null;
  // "24.999,00" → 24999
  const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? null : Math.round(num);
}

function parseProducts(html) {
  const $ = cheerio.load(html);
  const products = [];

  $(".single-smallblog").each((_, el) => {
    const $el = $(el);

    const $title = $el.find(".nazivPr");
    const naziv = $title.text().trim();
    const $link = $el.find("a[href*='/product/']").first();
    const url = $link.attr("href") || "";

    // ID iz URL-a: /product/name/12345/
    const idMatch = url.match(/\/(\d+)\/?$/);
    const id = idMatch ? idMatch[1] : null;

    // Cene: del za staru, span za novu
    const $priceP = $el.find("p").filter((_, p) => $(p).text().includes("RSD"));
    const $del = $priceP.find("del");
    const $span = $priceP.find("span");

    let cena = null;
    let redovnaCena = null;

    if ($del.length && $span.length) {
      redovnaCena = parsePrice($del.text());
      cena = parsePrice($span.text());
    } else if ($span.length) {
      cena = parsePrice($span.text());
      redovnaCena = cena;
    }

    let popustProcenat = null;
    let popustIznos = null;
    if (redovnaCena && cena && redovnaCena > cena) {
      popustIznos = Math.round(redovnaCena - cena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    // Addtocard ima data-id
    const $btn = $el.find(".addtocard");
    const dataId = $btn.attr("data-id") || id;

    const dostupnost = $btn.length > 0 ? "NA_STANJU" : "RASPRODATO";

    if (naziv && cena) {
      products.push({
        id: dataId,
        naziv,
        brend: extractBrand(naziv),
        cena,
        redovna_cena: redovnaCena,
        popust_procenat: popustProcenat,
        popust_iznos: popustIznos,
        valuta: "RSD",
        dostupnost,
        url: url.startsWith("http") ? url : BASE + url,
        izvor: "simns",
      });
    }
  });

  return products;
}

function extractBrand(name) {
  const upper = name.toUpperCase();
  const brands = [
    "BOSCH", "MAKITA", "DEWALT", "METABO", "HIKOKI", "MILWAUKEE",
    "EINHELL", "STANLEY", "INGCO", "TOTAL", "FERM", "VILLAGER",
    "FESTOOL", "FEIN", "DAEWOO", "KNIPEX", "YATO",
  ];
  for (const b of brands) {
    if (upper.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
  }
  return null;
}

function getMaxPage(html, baseUrl) {
  const regex = new RegExp(
    baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)/",
    "g"
  );
  let max = 1;
  let match;
  while ((match = regex.exec(html))) {
    const num = parseInt(match[1]);
    if (num > max) max = num;
  }
  return max;
}

async function fetchCategory(category) {
  const products = [];
  const fullUrl = BASE + category.url;

  console.log(`\n📦 ${category.name}`);

  const firstHtml = await fetchPage(fullUrl);
  const totalPages = getMaxPage(firstHtml, fullUrl);
  console.log(`   ${totalPages} stranica`);

  products.push(...parseProducts(firstHtml));

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      const html = await fetchPage(`${fullUrl}${page}/`);
      products.push(...parseProducts(html));

      if (page % 5 === 0 || page === totalPages) {
        console.log(
          `   Stranica ${page}/${totalPages} — ukupno ${products.length}`
        );
      }
    } catch (err) {
      console.error(`   ⚠️ Stranica ${page}: ${err.message}`);
    }
  }

  console.log(`   Ukupno: ${products.length}`);
  return products;
}

async function main() {
  console.log("SIM NS Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of CATEGORIES) {
    const products = await fetchCategory(cat);
    for (const p of products) {
      p.parent_kategorija = cat.name;
    }
    allProducts.push(...products);
  }

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
  const filename = path.join(DATA_DIR, `simns_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "simns");
}

main().catch(console.error);

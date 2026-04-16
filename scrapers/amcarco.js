const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://amcarco.co.rs";
const DELAY_MS = 500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  {
    name: "Akumulatorski alati",
    url: "/product-category/akumulatorski-alat/",
  },
  {
    name: "Električni alati",
    url: "/product-category/elektricni-alat-pribor/",
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
  // "125.000" ili "114.000рсд"
  const clean = text.replace(/[^0-9.,]/g, "").trim();
  if (!clean) return null;
  const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? null : Math.round(num);
}

function parseProducts(html) {
  const $ = cheerio.load(html);
  const products = [];

  $("li.product.type-product").each((_, el) => {
    const $el = $(el);

    // Naziv i link
    const $title = $el.find(".woocommerce-loop-product__title a, h2 a");
    const naziv = $title.text().trim();
    const url = $title.attr("href") || "";

    // ID
    const id =
      $el.find("[data-product_id]").first().attr("data-product_id") ||
      $el.find("[data-id]").first().attr("data-id") ||
      null;

    // Cene — WooCommerce: del = stara, ins = nova
    const $price = $el.find(".price").first();
    const $del = $price.find("del .woocommerce-Price-amount bdi");
    const $ins = $price.find("ins .woocommerce-Price-amount bdi");
    const $regular = $price.find(".woocommerce-Price-amount bdi");

    let cena = null;
    let redovnaCena = null;

    if ($ins.length) {
      cena = parsePrice($ins.first().text());
      redovnaCena = parsePrice($del.first().text());
    } else if ($regular.length) {
      cena = parsePrice($regular.first().text());
      redovnaCena = cena;
    }

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
        url,
        izvor: "amcarco",
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
    "FIELDMANN", "KRAFT", "SEALEY", "KNIPEX", "YATO",
  ];
  for (const b of brands) {
    if (upper.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
  }
  return null;
}

function getMaxPage(html) {
  const matches = html.match(/\/page\/(\d+)\//g) || [];
  let max = 1;
  for (const m of matches) {
    const num = parseInt(m.match(/(\d+)/)[1]);
    if (num > max) max = num;
  }
  return max;
}

async function fetchCategory(category) {
  const products = [];
  const fullUrl = BASE + category.url;

  console.log(`\n📦 ${category.name}`);

  const firstHtml = await fetchPage(fullUrl);
  const totalPages = getMaxPage(firstHtml);
  console.log(`   ${totalPages} stranica`);

  products.push(...parseProducts(firstHtml));
  console.log(`   Stranica 1/${totalPages} — ${products.length} proizvoda`);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    try {
      const html = await fetchPage(`${fullUrl}page/${page}/`);
      const pageProducts = parseProducts(html);
      products.push(...pageProducts);

      if (page % 5 === 0 || page === totalPages) {
        console.log(
          `   Stranica ${page}/${totalPages} — ukupno ${products.length}`
        );
      }
    } catch (err) {
      console.error(`   ⚠️ Stranica ${page}: ${err.message}`);
    }
  }

  return products;
}

async function main() {
  console.log("Amcarco Scraper — start");
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
    const key = p.id || p.url;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(
    `Ukupno: ${unique.length} jedinstvenih (od ${allProducts.length})`
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `amcarco_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);
}

main().catch(console.error);

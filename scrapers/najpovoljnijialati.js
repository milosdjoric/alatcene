const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://najpovoljnijialati.rs";
const DELAY_MS = 400;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  {
    name: "Akumulatorski alati",
    url: "/kategorija/akumulatorski-alat/",
  },
  {
    name: "Električni alati",
    url: "/kategorija/elektricni-alat/",
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
  const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? null : Math.round(num);
}

function parseProducts(html) {
  const $ = cheerio.load(html);
  const products = [];

  $(".product--card").each((_, el) => {
    const $el = $(el);

    const $link = $el.find("a.woocommerce-LoopProduct-link").first();
    const naziv = $el.find("h2, .woocommerce-loop-product__title").text().trim();
    const url = $link.attr("href") || "";

    const $btn = $el.find(".add_to_cart_button");
    const id = $btn.attr("data-product_id") || null;
    const sku = $btn.attr("data-product_sku") || null;

    const brandHref = $el.find("a.product__brand").attr("href") || "";
    const brandMatch = brandHref.match(/\/brend\/([^/]+)/);
    const brend = brandMatch ? brandMatch[1].replace(/-/g, " ") : null;

    const $price = $el.find(".product__price, .price").first();
    const $ins = $price.find("ins .woocommerce-Price-amount");
    const $del = $price.find("del .woocommerce-Price-amount");
    const $regular = $price.find(".woocommerce-Price-amount");

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
        sku,
        naziv,
        brend,
        cena,
        redovna_cena: redovnaCena,
        popust_procenat: popustProcenat,
        popust_iznos: popustIznos,
        valuta: "RSD",
        dostupnost: $btn.length > 0 ? "NA_STANJU" : "RASPRODATO",
        url,
        izvor: "najpovoljnijialati",
      });
    }
  });

  return products;
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
      products.push(...parseProducts(html));

      if (page % 20 === 0 || page === totalPages) {
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
  console.log("Najpovoljniji Alati Scraper — start");
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
  console.log(
    `Ukupno: ${unique.length} jedinstvenih (od ${allProducts.length})`
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `najpovoljnijialati_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "najpovoljnijialati");
}

main().catch(console.error);

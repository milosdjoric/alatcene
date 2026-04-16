const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Jedna kategorija sa oba tipa alata
const PAGE_URL = "https://www.kliklak.rs/elektricni-alati-2";

function parsePrice(text) {
  if (!text) return null;
  const clean = text.replace(/[^0-9.,]/g, "").trim();
  if (!clean) return null;
  const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? null : Math.round(num);
}

function extractBrand(name) {
  const upper = name.toUpperCase();
  for (const b of ["BOSCH","MAKITA","DEWALT","METABO","HIKOKI","MILWAUKEE","EINHELL","STANLEY","INGCO","TOTAL","FERM","VILLAGER","FESTOOL","ISKRA","DAEWOO"]) {
    if (upper.includes(b)) return b.charAt(0) + b.slice(1).toLowerCase();
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePageProducts(html) {
  const $ = cheerio.load(html);
  const products = [];

  $(".product.product--grid").each((_, el) => {
    const $el = $(el);
    const $link = $el.find("a.grid-image__link");
    const naziv = $link.attr("title") || $el.find(".product__name").text().trim();
    const url = $link.attr("href") || "";

    let id = null;
    const cartData = $el.find("[data-cart-add]").attr("data-cart-add");
    if (cartData) {
      try { id = String(JSON.parse(cartData)[0]?.product_id); } catch {}
    }
    if (!id) id = $el.find("[data-wishlist-toggle]").attr("data-wishlist-toggle") || null;

    const currentText = $el.find(".product__info--price-gross").first().text().trim();
    const oldText = $el.find(".product__info--old-price-gross").first().text().trim();

    let cena = parsePrice(currentText);
    let redovnaCena = parsePrice(oldText) || cena;

    let popustProcenat = null, popustIznos = null;
    if (redovnaCena && cena && redovnaCena > cena) {
      popustIznos = Math.round(redovnaCena - cena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    const isAku = url.includes("akumulatorsk") || naziv.toLowerCase().includes("aku");
    const parentKat = isAku ? "Akumulatorski alati" : "Električni alati";

    const dostupnost = $el.find("a.product__add-to-cart").length > 0 ? "NA_STANJU" : "RASPRODATO";

    if (naziv && cena) {
      products.push({ id, naziv, brend: extractBrand(naziv), cena, redovna_cena: redovnaCena, popust_procenat: popustProcenat, popust_iznos: popustIznos, valuta: "RSD", dostupnost, url, izvor: "kliklak", parent_kategorija: parentKat });
    }
  });

  return products;
}

async function main() {
  console.log("KlikLak Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];
  const seen = new Set();
  let page = 1;

  while (page <= 100) {
    const url = page === 1 ? PAGE_URL : `${PAGE_URL}/p${page}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) break;

    const html = await res.text();
    const batch = parsePageProducts(html);
    if (batch.length === 0) break;

    let newCount = 0;
    for (const p of batch) {
      const key = p.id || p.url;
      if (!seen.has(key)) {
        seen.add(key);
        allProducts.push(p);
        newCount++;
      }
    }

    if (page % 5 === 0 || batch.length < 48) {
      console.log(`   Stranica ${page} — ukupno ${allProducts.length}`);
    }

    if (newCount === 0) break;
    page++;
    await sleep(400);
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${allProducts.length} proizvoda`);

  const filename = path.join(DATA_DIR, `kliklak_${new Date().toISOString().slice(0, 10)}.json`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(allProducts, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(allProducts, "kliklak");
}

main().catch(console.error);

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://www.prodavnicaalata.rs";
const DELAY_MS = 400;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  {
    name: "Akumulatorski alati",
    url: "/proizvodi/kategorije/akumulatorski-alati/",
  },
  {
    name: "Električni alat",
    url: "/proizvodi/kategorije/elektricni-alat/",
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

function parsePage(html) {
  const $ = cheerio.load(html);
  const products = [];

  $("div.product-card").each((_, el) => {
    const $el = $(el);
    const $btn = $el.find("button.cart-add");

    const id = $btn.attr("data-id") || null;
    const sku = $btn.attr("data-sku") || null;
    const naziv =
      $btn.attr("data-label") ||
      $el.find(".product-card__name a").text().trim();
    const slug = $btn.attr("data-slug") || "";
    const stanje = parseInt($btn.attr("data-stock"), 10) || 0;
    const redovnaCena = parseFloat($btn.attr("data-price")) || null;
    const akcijskaCena = parseFloat($btn.attr("data-sale_price")) || null;

    const cena = akcijskaCena || redovnaCena;

    let popustProcenat = null;
    let popustIznos = null;
    if (redovnaCena && akcijskaCena && redovnaCena > akcijskaCena) {
      popustIznos = Math.round(redovnaCena - akcijskaCena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    // Brend iz slike proizvođača
    const brend =
      $el.find("img.product-manuf-list-img").attr("alt") || null;

    const url = $el.find(".product-card__name a").attr("href") || "";

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
        dostupnost: "NA_STANJU",
        kolicina_na_stanju: stanje,
        url: url.startsWith("http") ? url : BASE + url,
        izvor: "prodavnicaalata",
      });
    }
  });

  return products;
}

function getTotalPages(html) {
  const match = html.match(/strana\/(\d+)/g);
  if (!match) return 1;
  let max = 1;
  for (const m of match) {
    const num = parseInt(m.split("/")[1]);
    if (num > max) max = num;
  }
  return max;
}

async function fetchCategory(category) {
  const products = [];
  const fullUrl = BASE + category.url;

  console.log(`\n📦 ${category.name}`);

  const firstHtml = await fetchPage(fullUrl);
  const totalPages = getTotalPages(firstHtml);
  console.log(`   ${totalPages} stranica`);

  const firstProducts = parsePage(firstHtml);
  products.push(...firstProducts);
  console.log(`   Stranica 1/${totalPages} — ${products.length} proizvoda`);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);

    try {
      const html = await fetchPage(`${fullUrl}strana/${page}/`);
      const pageProducts = parsePage(html);
      products.push(...pageProducts);

      if (page % 25 === 0 || page === totalPages) {
        console.log(
          `   Stranica ${page}/${totalPages} — ukupno ${products.length} proizvoda`
        );
      }
    } catch (err) {
      console.error(`   ⚠️ Stranica ${page}: ${err.message}`);
    }
  }

  return products;
}

async function main() {
  console.log("Prodavnica Alata Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of CATEGORIES) {
    const products = await fetchCategory(cat);
    for (const p of products) {
      p.parent_kategorija = cat.name;
    }
    allProducts.push(...products);
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${allProducts.length} proizvoda`);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `prodavnicaalata_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(allProducts, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(allProducts, "prodavnicaalata");
}

main().catch(console.error);

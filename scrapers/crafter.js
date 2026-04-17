const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");

const DELAY_MS = 600;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  {
    name: "Akumulatorski alati",
    url: "https://www.crafter.rs/alati-i-masine/masine/akumulatorske-masine-i-oprema",
  },
  {
    name: "Električni alati",
    url: "https://www.crafter.rs/alati-i-masine/masine/elektricne-masine",
  },
];

function extractProducts($) {
  const products = [];

  $("li.product-item").each((_, el) => {
    const $el = $(el);

    // Data atributi sa <a> linka — glavna izvor podataka
    const $link = $el.find("a.product-item-photo");
    const sku = $link.attr("data-id") || null;
    const naziv = ($link.attr("data-name") || "").trim();
    const brend = $link.attr("data-brand") || null;
    const dataCategory = $link.attr("data-category") || "";
    const url = $link.attr("href") || "";

    // Cena iz data-price-amount
    const $finalPrice = $el.find('.price-wrapper[data-price-type="finalPrice"]');
    const cena = parseFloat($finalPrice.attr("data-price-amount")) || null;

    const $oldPrice = $el.find('.old-price .price-wrapper[data-price-type="oldPrice"]');
    const redovna_cena = parseFloat($oldPrice.attr("data-price-amount")) || null;

    // Popust
    const discountText = $el.find(".pr_discount").text().trim();
    const discountMatch = discountText.match(/-(\d+)%/);
    const popust_procenat = discountMatch ? parseInt(discountMatch[1]) : null;
    const popust_iznos = redovna_cena && cena ? Math.round(redovna_cena - cena) : null;

    // Dostupnost
    const stockText = $el.find(".stock").text().trim().toLowerCase();
    const dostupnost = stockText.includes("dostupno") ? "NA_STANJU" : "RASPRODATO";

    // Kategorija — poslednji segment iz data-category
    const categoryParts = dataCategory.split("/").map((s) => s.trim());
    const kategorija = categoryParts.length > 2 ? categoryParts[categoryParts.length - 1] : null;

    if (!naziv || !cena) return;

    products.push({
      id: sku,
      sku,
      naziv,
      brend,
      kategorija,
      cena,
      redovna_cena: redovna_cena && redovna_cena > cena ? redovna_cena : null,
      popust_procenat,
      popust_iznos: popust_iznos && popust_iznos > 0 ? popust_iznos : null,
      valuta: "RSD",
      url,
      dostupnost,
      ocena: null,
      broj_recenzija: null,
      specifikacije: null,
      izvor: "crafter",
    });
  });

  return products;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCategory(category) {
  const products = [];

  console.log(`\n📦 ${category.name}`);

  // Prva stranica — otkrivamo koliko ukupno stranica ima
  const firstRes = await fetch(category.url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!firstRes.ok) {
    console.error(`   ⚠️ Greška: ${firstRes.status}`);
    return products;
  }

  const firstHtml = await firstRes.text();
  const $first = cheerio.load(firstHtml);

  // Ukupan broj stranica
  const pageCountText = $first("#am-page-count").text().trim();
  const totalPages = parseInt(pageCountText) || 1;

  // Ukupan broj proizvoda
  const toolbarText = $first("#toolbar-amount").text();
  const totalMatch = toolbarText.match(/od\s+(\d[\d.]*)/);
  const totalProducts = totalMatch ? totalMatch[1].replace(/\./g, "") : "?";
  console.log(`   Ukupno: ${totalProducts} proizvoda, ${totalPages} stranica`);

  // Obradi prvu stranicu
  const firstProducts = extractProducts($first);
  products.push(...firstProducts);
  console.log(`   Stranica 1/${totalPages} — ${products.length} proizvoda`);

  // Ostale stranice
  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);

    const url = `${category.url}?p=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) {
      console.error(`   ⚠️ Greška na stranici ${page}: ${res.status}`);
      continue;
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const pageProducts = extractProducts($);

    if (pageProducts.length === 0) {
      console.log(`   Stranica ${page}/${totalPages} — prazna, završavam`);
      break;
    }

    products.push(...pageProducts);
    console.log(`   Stranica ${page}/${totalPages} — ukupno ${products.length} proizvoda`);
  }

  return products;
}

async function main() {
  console.log("Crafter Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of CATEGORIES) {
    const products = await fetchCategory(cat);
    for (const p of products) {
      p.parent_kategorija = cat.name;
    }
    allProducts.push(...products);
  }

  // Deduplikacija po ID
  const seen = new Set();
  const unique = allProducts.filter((p) => {
    const key = p.id || p.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Ukupno: ${unique.length} proizvoda (pre dedup: ${allProducts.length})`);

  // Sačuvaj
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `crafter_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "crafter");
}

main().catch(console.error);

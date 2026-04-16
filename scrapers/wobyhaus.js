const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://www.wobyhaus.co.rs";
const DELAY_MS = 600;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Podkategorije ručno jer parent kategorije koriste infinite scroll
const SUBCATEGORIES = {
  "Električni alat": [
    "/busilice",
    "/busilice-elektro-pneumatske",
    "/brusilice-ugaone",
    "/brusilice-rotacione",
    "/brusilice-tracne",
    "/brusilice-vibracione",
    "/brusilice-ceone",
    "/glodalice",
    "/heftalice",
    "/ostraci",
    "/pistolji-za-vreli-vazduh",
    "/polir-masine-i-pribor",
    "/rende",
    "/testere-kruzne",
    "/testere-ubodne",
    "/usisivaci-i-pribor",
    "/zavrtaci-i-odvrtaci-elektricni",
    "/ostali-elektricni-alat",
    "/busilice-stubne",
    "/kombinovane-masine",
    "/masine-za-plocice-kamen-i-prib",
    "/rende-stacionarno",
    "/strugovi-glodalice-i-pribor",
    "/testere-kruzne-stacionarne",
    "/testere-tracne-stacionarne",
    "/stacionarne-brusilice-i-pribor",
  ],
  "Akumulatorski alat": [
    "/busilice-i-zavrtaci-aku",
    "/ostali-akumulatorski-alat",
    "/pribor-za-akumulatorski-alat",
    "/sistem-jedna-baterija-s20v",
    "/p20-sistem-jedna-baterija",
    "/punjaci-akumulatora",
  ],
};

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

  // Proizvodi su u blokovima sa current-price
  $("div.prices-wrapper").each((_, priceWrapper) => {
    const $card = $(priceWrapper).closest(
      "div[class*='caption-product-list'], div.col-xs-12"
    );
    // Popni se do roditelja koji sadrži ime i link
    const $parent =
      $card.length > 0 ? $card : $(priceWrapper).parent().parent().parent();

    // Naziv i link
    const $nameLink = $parent.find(
      "a.btn-product.new-product-link, a[title]"
    );
    let naziv = "";
    let url = "";

    // Traži link ka proizvodu
    $parent.find("a").each((_, a) => {
      const href = $(a).attr("href") || "";
      const title = $(a).attr("title") || "";
      if (
        href.includes("/") &&
        !href.includes("javascript") &&
        !href.includes(".png") &&
        !href.includes(".jpg") &&
        title.length > 5 &&
        !title.includes("MOGUĆNOST") &&
        !title.includes("SIGURNO") &&
        !title.includes("pregled")
      ) {
        if (!naziv || title.length > naziv.length) {
          naziv = title;
          url = href;
        }
      }
    });

    // Čisti HTML tagove iz naziva
    naziv = naziv.replace(/<[^>]*>/g, "").trim();
    if (!naziv) return;

    // Cena
    const $currentPrice = $(priceWrapper).find(".current-price .value");
    const $oldPrice = $(priceWrapper).find(".prev-price .value");
    const $discountPct = $(priceWrapper).find(".price-discount");

    const cena = parsePrice($currentPrice.first().text());
    const redovnaCena = parsePrice($oldPrice.first().text()) || cena;

    let popustProcenat = null;
    let popustIznos = null;
    if (redovnaCena && cena && redovnaCena > cena) {
      popustIznos = Math.round(redovnaCena - cena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    // Brend
    const brandImg = $parent.find(".caption-brand img").attr("alt") || null;

    // ID iz URL-a
    const idMatch = url.match(/\/(\d+)-/);
    const id = idMatch ? idMatch[1] : null;

    const dostupnost = $parent.find(".buyButtonOnLists").length > 0 ? "NA_STANJU" : "RASPRODATO";

    if (cena) {
      products.push({
        id,
        naziv,
        brend: brandImg,
        cena,
        redovna_cena: redovnaCena,
        popust_procenat: popustProcenat,
        popust_iznos: popustIznos,
        valuta: "RSD",
        dostupnost,
        url: url.startsWith("http") ? url : BASE + url,
        izvor: "wobyhaus",
      });
    }
  });

  return products;
}

function parsePrice(text) {
  if (!text) return null;
  const clean = text.replace(/[^0-9.,]/g, "").trim();
  if (!clean) return null;
  // Format: "7.649,15" → 7649.15 → 7649
  const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? null : Math.round(num);
}

async function fetchSubcategory(url) {
  const allProducts = [];
  let page = 1;

  while (true) {
    const fullUrl = page === 1 ? url : `${url}?page=${page}`;
    const html = await fetchPage(fullUrl);
    const products = parseProducts(html);

    if (products.length === 0) break;

    // Proveri da li su isti proizvodi kao prethodni (looping)
    if (allProducts.length > 0 && products.length > 0) {
      const lastBatch = allProducts.slice(-products.length);
      if (
        lastBatch.length === products.length &&
        lastBatch[0]?.naziv === products[0]?.naziv
      ) {
        break; // Paginacija se ponavlja
      }
    }

    allProducts.push(...products);
    page++;

    if (page > 200) break; // Safety
    await sleep(DELAY_MS);
  }

  return allProducts;
}

async function main() {
  console.log("Woby Haus Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const [parentCat, subcats] of Object.entries(SUBCATEGORIES)) {
    console.log(`\n📦 ${parentCat}`);

    for (let i = 0; i < subcats.length; i++) {
      const subUrl = BASE + subcats[i];
      const subName = subcats[i].replace("/", "").replace(/-/g, " ");
      await sleep(DELAY_MS);

      try {
        const products = await fetchSubcategory(subUrl);
        for (const p of products) {
          p.parent_kategorija = parentCat;
          p.kategorija = subName;
        }
        allProducts.push(...products);

        if (products.length > 0) {
          console.log(
            `   [${i + 1}/${subcats.length}] ${subName}: ${products.length}`
          );
        }
      } catch (err) {
        console.error(
          `   ⚠️ [${i + 1}/${subcats.length}] ${subName}: ${err.message}`
        );
      }
    }
  }

  // Deduplikacija
  const seen = new Set();
  const unique = [];
  for (const p of allProducts) {
    const key = p.id || p.naziv;
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
  const filename = path.join(DATA_DIR, `wobyhaus_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "wobyhaus");
}

main().catch(console.error);

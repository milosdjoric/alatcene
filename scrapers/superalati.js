const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE = "https://www.superalati.rs";
const DELAY_MS = 600;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  {
    name: "Akumulatorski alati",
    url: "/user/akumulatorski-alati/66_3486_1_0_0/category.jsp",
  },
  {
    name: "Električni alati",
    url: "/user/elektricni-alati/66_3488_1_0_0/category.jsp",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} za ${url}`);
  return res.text();
}

// Izvuci linkove podkategorija iz parent kategorije
function parseSubcategories(html, parentName) {
  const $ = cheerio.load(html);
  const subs = [];

  // Podkategorije su u div.categoriesLevelTwo linkovi
  // Ali samo one unutar navigacije kategorija na levoj strani
  $("div.categoriesLevelTwo a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const title = $(el).attr("title") || "";
    const name = $(el).find("span").text().trim();

    // Preskoči parent kategorije i linkove koji nemaju category.jsp
    if (!href.includes("/category.jsp")) return;
    // Preskoči "pribor" i "oprema" kategorije jer to nisu alati
    // Ali ipak ih uključi jer mogu imati baterije itd.

    subs.push({ name: name || title, url: BASE + href });
  });

  return subs;
}

// Parsiraj proizvode sa stranice podkategorije
function parseProducts(html, subcategoryName) {
  const $ = cheerio.load(html);
  const products = [];

  $("li.item.products").each((_, el) => {
    const $el = $(el);
    const $link = $el.find("> a");
    const url = $link.attr("href") || "";
    const naziv = $link.attr("title") || $el.find("h2").text().trim();

    // ID iz URL-a ili form action
    const formAction = $el.find("form.ajax-add-to-cart").attr("action") || "";
    const idMatch = formAction.match(/addItem\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;

    // Cene
    const $price = $el.find(".prices .price");
    const currentPriceText =
      $price.find('span[itemprop="price"]').text().trim();
    const oldPriceText = $price.find("s").first().text().trim();

    const cena = parsePrice(currentPriceText);
    const redovnaCena = parsePrice(oldPriceText) || cena;

    // Popust
    let popustProcenat = null;
    let popustIznos = null;
    if (redovnaCena && cena && redovnaCena > cena) {
      popustIznos = Math.round(redovnaCena - cena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    // Dostupnost - ako soldout slika je display:none, onda je dostupan
    const soldoutStyle = $el.find("img.soldout").attr("style") || "";
    const dostupnost = soldoutStyle.includes("display: none")
      ? "NA_STANJU"
      : "RASPRODATO";

    // Brend - iz naziva (prva reč obično)
    const brend = extractBrand(naziv);

    if (naziv && cena) {
      products.push({
        id,
        naziv,
        brend,
        kategorija: subcategoryName,
        cena,
        redovna_cena: redovnaCena,
        popust_procenat: popustProcenat,
        popust_iznos: popustIznos,
        valuta: "RSD",
        url: url.startsWith("http") ? url : BASE + url,
        dostupnost,
        izvor: "superalati",
      });
    }
  });

  return products;
}

function parsePrice(text) {
  if (!text) return null;
  // "10,999.00" ili "16,938.00 RSD"
  const clean = text.replace(/[^0-9.,]/g, "").trim();
  if (!clean) return null;
  // Format: 10,999.00 → 10999
  const num = parseFloat(clean.replace(/,/g, ""));
  return isNaN(num) ? null : Math.round(num);
}

function extractBrand(name) {
  const known = [
    "Bosch",
    "Makita",
    "DeWalt",
    "Einhell",
    "Metabo",
    "Milwaukee",
    "Hikoki",
    "HiKOKI",
    "Festool",
    "Fein",
    "Stanley",
    "Black+Decker",
    "Ryobi",
    "Dremel",
    "Ingco",
    "INGCO",
    "Iskra",
    "Villager",
    "Fieldmann",
    "Hoteche",
    "CAT",
    "Total",
    "Worx",
    "Kress",
    "Karcher",
    "Kärcher",
    "Stihl",
    "Husqvarna",
    "Greenworks",
    "Scheppach",
    "Stayer",
    "Tosan",
    "Verto",
    "Yato",
    "NEO",
    "Graphite",
    "Proxxon",
    "Knipex",
    "Wera",
    "Wiha",
    "Gedore",
    "Bahco",
    "Rothenberger",
    "Ridgid",
    "Rems",
  ];

  const lower = name.toLowerCase();
  for (const b of known) {
    if (lower.startsWith(b.toLowerCase() + " ") || lower.startsWith(b.toLowerCase() + "-")) {
      return b;
    }
  }

  // Fallback - prva reč
  return name.split(/\s+/)[0] || null;
}

async function main() {
  console.log("Super Alati Scraper — start");
  console.log("=".repeat(40));

  const allProducts = [];

  for (const cat of CATEGORIES) {
    console.log(`\n📦 ${cat.name}`);

    const html = await fetchPage(BASE + cat.url);
    const subcategories = parseSubcategories(html, cat.name);

    // Filtriraj podkategorije koje pripadaju ovoj parent kategoriji
    // (stranica prikazuje SVE kategorije u navigaciji)
    // Trebamo samo one koje su u URL-u pod istim parentom
    console.log(`   Pronađeno ${subcategories.length} podkategorija`);

    let totalForCat = 0;

    for (let i = 0; i < subcategories.length; i++) {
      const sub = subcategories[i];
      await sleep(DELAY_MS);

      try {
        const subHtml = await fetchPage(sub.url);
        const products = parseProducts(subHtml, sub.name);

        for (const p of products) {
          p.parent_kategorija = cat.name;
        }

        allProducts.push(...products);
        totalForCat += products.length;

        if (products.length > 0) {
          console.log(
            `   [${i + 1}/${subcategories.length}] ${sub.name}: ${products.length} proizvoda`
          );
        }
      } catch (err) {
        console.error(
          `   ⚠️ [${i + 1}/${subcategories.length}] ${sub.name}: ${err.message}`
        );
      }
    }

    console.log(`   Ukupno za ${cat.name}: ${totalForCat}`);
  }

  // Deduplikacija po ID-u (iste podkategorije mogu biti pod oba parenta)
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
  console.log(`Ukupno: ${unique.length} jedinstvenih proizvoda (od ${allProducts.length} sa duplikatima)`);

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = path.join(DATA_DIR, `superalati_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);

  // DB upsert
  const { upsertProducts } = require("./lib/db");
  await upsertProducts(unique, "superalati");
}

main().catch(console.error);

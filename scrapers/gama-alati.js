const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const DATA_DIR = path.join(__dirname, "..", "data");

const DELAY_MS = 600;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATEGORIES = [
  {
    slug: "akumulatorski-alati",
    name: "Akumulatorski alati",
    url: "https://www.gama-alati.rs/proizvodi/akumulatorski-alati/",
  },
  {
    slug: "elektricni-alati",
    name: "Električni alati",
    url: "https://www.gama-alati.rs/proizvodi/elektricni-alati/",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePage(html) {
  const $ = cheerio.load(html);
  const products = [];

  $("li.item.product.product-item").each((_, el) => {
    const $el = $(el);

    // Naziv i link
    const $link = $el.find("a.product-item-link");
    const naziv = $link.text().trim();
    const url = $link.attr("href") || "";

    // Product ID i SKU
    const productId =
      $el.find("[data-product-id]").attr("data-product-id") || null;
    const sku = $el.find("[data-product-sku]").attr("data-product-sku") || null;

    // Cene - iz data-price-amount atributa (pouzdanije od teksta)
    const $priceBox = $el.find(".price-box");

    let cena = null;
    let redovnaCena = null;

    // Ako ima special-price, to znači da je na akciji
    const $specialPrice = $priceBox.find(
      '.special-price [data-price-type="finalPrice"]'
    );
    const $oldPrice = $priceBox.find(
      '.old-price [data-price-type="oldPrice"]'
    );

    if ($specialPrice.length) {
      cena = parseFloat($specialPrice.attr("data-price-amount")) || null;
      redovnaCena = parseFloat($oldPrice.attr("data-price-amount")) || null;
    } else {
      // Regularna cena bez popusta
      const $regularPrice = $priceBox.find('[data-price-type="finalPrice"]');
      cena = parseFloat($regularPrice.attr("data-price-amount")) || null;
      redovnaCena = cena;
    }

    // Popust
    let popustProcenat = null;
    let popustIznos = null;
    if (redovnaCena && cena && redovnaCena > cena) {
      popustIznos = Math.round(redovnaCena - cena);
      popustProcenat = Math.round((popustIznos / redovnaCena) * 100);
    }

    // Brend - iz alt teksta slike brenda
    const brend =
      $el
        .find('img[alt][src*="brand-logos"]')
        .attr("alt")
        ?.replace(/^\w/, (c) => c.toUpperCase()) || null;

    // Opis/specifikacije
    const specs = [];
    $el.find(".product-item-description li").each((_, li) => {
      specs.push($(li).text().trim());
    });

    if (naziv) {
      products.push({
        id: productId,
        sku,
        naziv,
        brend,
        cena,
        redovna_cena: redovnaCena,
        popust_procenat: popustProcenat,
        popust_iznos: popustIznos,
        valuta: "RSD",
        specifikacije: specs.length > 0 ? specs : null,
        url,
        izvor: "gama-alati",
      });
    }
  });

  return products;
}

function getTotalCount(html) {
  const match = html.match(/(\d+)\s*Proizvoda/);
  return match ? parseInt(match[1]) : 0;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} za ${url}`);
  }

  return res.text();
}

async function fetchCategory(category) {
  const products = [];

  // Prva stranica
  console.log(`\n📦 ${category.name}`);
  const firstHtml = await fetchPage(category.url);
  const totalCount = getTotalCount(firstHtml);
  const totalPages = Math.ceil(totalCount / 24);
  console.log(`   Ukupno: ${totalCount} proizvoda, ${totalPages} stranica`);

  const firstProducts = parsePage(firstHtml);
  products.push(...firstProducts);
  console.log(`   Stranica 1/${totalPages} — ${products.length} proizvoda`);

  // Ostale stranice
  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);

    try {
      const html = await fetchPage(`${category.url}?p=${page}`);
      const pageProducts = parsePage(html);
      products.push(...pageProducts);

      if (page % 10 === 0 || page === totalPages) {
        console.log(
          `   Stranica ${page}/${totalPages} — ukupno ${products.length} proizvoda`
        );
      }
    } catch (err) {
      console.error(`   ⚠️ Greška na stranici ${page}: ${err.message}`);
    }
  }

  return products;
}

async function main() {
  console.log("Gama Alati Scraper — start");
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
  const filename = path.join(DATA_DIR, `gama_${timestamp}.json`);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(allProducts, null, 2), "utf-8");
  console.log(`Sačuvano u: ${filename}`);
}

main().catch(console.error);

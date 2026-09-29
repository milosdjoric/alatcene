const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const glob = require("path");

const SCRAPERS_DIR = path.join(__dirname, "scrapers");
const DATA_DIR = path.join(__dirname, "data");

const scrapers = fs
  .readdirSync(SCRAPERS_DIR)
  .filter((f) => f.endsWith(".js"))
  .sort();

console.log(`\n🔄 Scrape All — ${new Date().toISOString()}`);
console.log(`   ${scrapers.length} scrapera\n`);

const results = [];
const today = new Date().toISOString().slice(0, 10);

// Broj proizvoda iz današnjeg data fajla scrapera (niz ili { products: [] }).
function countProducts(name) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}_${today}.json`), "utf-8"));
    return (Array.isArray(data) ? data : data.products || []).length;
  } catch {
    return 0;
  }
}

for (const file of scrapers) {
  const name = file.replace(".js", "");
  const start = Date.now();

  try {
    execSync(`node ${path.join(SCRAPERS_DIR, file)}`, {
      stdio: "inherit",
      timeout: 20 * 60 * 1000, // 20 min po scraperu (najpovoljnijialati ima ~5k proizvoda, 10 min nije bilo dovoljno)
    });
    // Scraper koji "uspe" a vrati 0 proizvoda (promenjen HTML) nije uspeh.
    const count = countProducts(name);
    results.push({
      name,
      status: count > 0 ? "ok" : "empty",
      count,
      duration: Date.now() - start,
    });
  } catch (err) {
    console.error(`\n⚠️ ${name} FAILED\n`);
    results.push({ name, status: "error", duration: Date.now() - start });
  }
}

// Napravi manifest sa najnovijim fajlovima po izvoru
const dataFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json") && f !== "manifest.json");

// Grupiši po izvoru, uzmi najnoviji
const latest = {};
for (const file of dataFiles) {
  // ime_izvora_2026-04-16.json
  const match = file.match(/^(.+)_(\d{4}-\d{2}-\d{2})\.json$/);
  if (!match) continue;

  const [, source, date] = match;
  if (!latest[source] || date > latest[source].date) {
    latest[source] = { file, date };
  }
}

const manifest = {
  updated: new Date().toISOString(),
  sources: Object.entries(latest).map(([source, info]) => ({
    source,
    file: info.file,
    date: info.date,
  })),
  // Status svakog scrapera — manifest se commit-uje posle svakog run-a (CI),
  // pa git istorija ovog fajla pokazuje koji scraper je kada pukao.
  scrapers: results.map((r) => ({
    name: r.name,
    status: r.status,
    count: r.count ?? 0,
    seconds: Math.round(r.duration / 1000),
  })),
};

fs.writeFileSync(
  path.join(DATA_DIR, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf-8"
);

console.log(`\n${"=".repeat(40)}`);
console.log(`✅ Manifest ažuriran: ${manifest.sources.length} izvora`);
for (const r of results) {
  const icon = { ok: "✓", empty: "∅", error: "✗" }[r.status];
  console.log(`   ${icon} ${r.name} — ${r.count ?? 0} proizvoda (${Math.round(r.duration / 1000)}s)`);
}

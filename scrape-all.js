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

for (const file of scrapers) {
  const name = file.replace(".js", "");
  const start = Date.now();

  try {
    execSync(`node ${path.join(SCRAPERS_DIR, file)}`, {
      stdio: "inherit",
      timeout: 10 * 60 * 1000, // 10 min po scraperу
    });
    results.push({ name, status: "ok", duration: Date.now() - start });
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
};

fs.writeFileSync(
  path.join(DATA_DIR, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf-8"
);

console.log(`\n${"=".repeat(40)}`);
console.log(`✅ Manifest ažuriran: ${manifest.sources.length} izvora`);
for (const r of results) {
  const icon = r.status === "ok" ? "✓" : "✗";
  console.log(`   ${icon} ${r.name} (${Math.round(r.duration / 1000)}s)`);
}

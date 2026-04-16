const fs = require("fs");
const path = require("path");
const { supabase } = require("./lib/supabase");
const { normalizeBrand } = require("./lib/brand-normalize");

const DATA_DIR = path.join(__dirname, "..", "data");
const BATCH_SIZE = 500;

async function importFile(filePath, source) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`\n📦 ${source}: ${raw.length} proizvoda`);

  // Deduplikacija po external_id unutar fajla
  const seen = new Set();
  const products = raw
    .filter((p) => {
      if (!p.cena || !p.naziv) return false;
      const key = String(p.id || p.sku || p.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p) => ({
      external_id: String(p.id || p.sku || p.url),
      sku: p.sku || null,
      naziv: p.naziv.trim(),
      brend: p.brend || null,
      brend_normalized: normalizeBrand(p.brend),
      kategorija: p.kategorija || null,
      parent_kategorija: p.parent_kategorija || null,
      cena: Math.round(p.cena),
      redovna_cena: p.redovna_cena ? Math.round(p.redovna_cena) : null,
      popust_procenat: p.popust_procenat || null,
      popust_iznos: p.popust_iznos || null,
      valuta: p.valuta || "RSD",
      url: p.url,
      izvor: p.izvor || source,
      dostupnost: p.dostupnost || "NA_STANJU",
      ocena: p.ocena || null,
      broj_recenzija: p.broj_recenzija || null,
      specifikacije: p.specifikacije ? JSON.stringify(p.specifikacije) : null,
      updated_at: new Date().toISOString(),
    }));

  let imported = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("products").upsert(batch, {
      onConflict: "izvor,external_id",
    });

    if (error) {
      console.error(`   ⚠️ Batch ${i}-${i + batch.length}: ${error.message}`);
      errors += batch.length;
    } else {
      imported += batch.length;
    }
  }

  console.log(`   ✓ ${imported} importovano, ${errors} grešaka`);
  return { imported, errors };
}

async function main() {
  console.log("Import postojećih podataka u Supabase");
  console.log("=".repeat(40));

  const manifest = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "manifest.json"), "utf-8")
  );

  let totalImported = 0;
  let totalErrors = 0;

  for (const { source, file } of manifest.sources) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`⚠️ ${file} ne postoji, preskačem`);
      continue;
    }

    const result = await importFile(filePath, source);
    totalImported += result.imported;
    totalErrors += result.errors;
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`✅ Ukupno: ${totalImported} importovano, ${totalErrors} grešaka`);

  // Verifikacija
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  console.log(`   Redova u bazi: ${count}`);

  const { count: historyCount } = await supabase
    .from("price_history")
    .select("*", { count: "exact", head: true });
  console.log(`   Price history: ${historyCount}`);
}

main().catch(console.error);

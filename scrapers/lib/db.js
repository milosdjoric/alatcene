const path = require("path");

// Učitaj .env.local samo ako dotenv postoji (dev okruženje)
try {
  require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env.local") });
} catch {}

const BATCH_SIZE = 500;

let _supabase = null;

function getClient() {
  if (_supabase) return _supabase;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return null;
  }
  const { createClient } = require("@supabase/supabase-js");
  _supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  return _supabase;
}

const { resolveBrand } = require(path.join(__dirname, "..", "..", "scripts", "lib", "brand-normalize"));
const { jeSklonjenaKategorija } = require(path.join(__dirname, "klasifikacija"));

const PARENT_KATEGORIJA_MAP = {
  "Električni alat": "Električni alati",
  "Akumulatorski alat": "Akumulatorski alati",
  "Aku alati": "Akumulatorski alati",
};

function normalizeParentKategorija(raw) {
  if (!raw) return null;
  return PARENT_KATEGORIJA_MAP[raw] || raw;
}

async function upsertProducts(products, izvor) {
  const supabase = getClient();
  if (!supabase) {
    console.log("   ℹ️ Supabase nije konfigurisan, preskačem DB upsert");
    return;
  }

  // Odbaci kategorije van domena (pribor, lampe, bašta, ...) — ne ulaze u bazu.
  let skinuto = 0;
  const uDomenu = products.filter((p) => {
    if (jeSklonjenaKategorija(p.kategorija)) {
      skinuto++;
      return false;
    }
    return true;
  });
  if (skinuto > 0) {
    console.log(`   🚫 Van domena (preskočeno): ${skinuto}`);
  }

  // Jedan timestamp za ceo run — svi osveženi proizvodi dobijaju isti updated_at,
  // pa stale-cleanup posle upserta lako prepozna neosvežene (duhove).
  const runTs = new Date().toISOString();

  // Deduplikacija
  const seen = new Set();
  const rows = uDomenu
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
      brend_normalized: resolveBrand(p.brend, p.naziv),
      kategorija: p.kategorija || null,
      parent_kategorija: normalizeParentKategorija(p.parent_kategorija),
      cena: Math.round(p.cena),
      redovna_cena: p.redovna_cena ? Math.round(p.redovna_cena) : null,
      popust_procenat: p.popust_procenat || null,
      popust_iznos: p.popust_iznos || null,
      valuta: p.valuta || "RSD",
      url: p.url,
      izvor: p.izvor || izvor,
      dostupnost: p.dostupnost || "NA_STANJU",
      ocena: p.ocena || null,
      broj_recenzija: p.broj_recenzija || null,
      specifikacije: p.specifikacije ? JSON.stringify(p.specifikacije) : null,
      updated_at: runTs,
    }));

  // Broj proizvoda izvora PRE upserta — za zaštitu stale-cleanup-a.
  const { count: existingBefore } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("izvor", izvor);

  let imported = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("products").upsert(batch, {
      onConflict: "izvor,external_id",
    });
    if (error) {
      console.error(`   ⚠️ DB batch ${i}: ${error.message}`);
      errors += batch.length;
    } else {
      imported += batch.length;
    }
  }

  console.log(`   📊 DB: ${imported} upserted, ${errors} grešaka`);

  // Stale-cleanup: obriši proizvode ovog izvora koji NISU osveženi u ovom prolazu
  // (nestali sa sajta — duhovi). FK price_history je ON DELETE CASCADE.
  // ZAŠTITA: preskoči ako je scrape vratio <50% prethodnog broja (verovatno pao),
  // da delimično pao scrape ne obriše pola kataloga.
  if (errors === 0 && rows.length > 0) {
    const prag = (existingBefore || 0) * 0.5;
    if (!existingBefore || rows.length >= prag) {
      const { count: deleted, error: delErr } = await supabase
        .from("products")
        .delete({ count: "exact" })
        .eq("izvor", izvor)
        .lt("updated_at", runTs);
      if (delErr) {
        console.error(`   ⚠️ Stale-cleanup greška: ${delErr.message}`);
      } else if (deleted > 0) {
        console.log(`   🧹 Stale-cleanup: obrisano ${deleted} duha (nestali sa sajta)`);
      }
    } else {
      console.warn(
        `   ⚠️ Stale-cleanup PRESKOČEN: scrape vratio ${rows.length} < ${Math.round(prag)} (50% od ${existingBefore}) — moguć pad scrape-a`
      );
    }
  }
}

module.exports = { upsertProducts };

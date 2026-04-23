// Batch skripta za product matching
// Povlači sve proizvode iz baze, izračunava match_key, i ažurira
// Idempotentna — bezbedno za rerun posle svakog scrape-a

const { supabase } = require("./lib/supabase");
const { extractMatch } = require("./lib/model-extract");

const FETCH_SIZE = 1000;
const UPDATE_SIZE = 500;

// Prag za detekciju sumnjivih cena (outlier u grupi)
// Konzervativan prag — bolje propustiti neke nego lažno flagovati set-ove/kompletne pakete
const OUTLIER_MIN_GROUP = 3; // min ponuda u grupi za flagovanje
const OUTLIER_HIGH_MULT = 5.0; // > 5× medijane
const OUTLIER_LOW_MULT = 0.2; // < 0.2× (1/5) medijane

function median(sortedArr) {
  const n = sortedArr.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sortedArr[mid - 1] + sortedArr[mid]) / 2 : sortedArr[mid];
}

// Detektuje "set/komplet/paket" nazive — grupe sa mešanim konfiguracijama
// ne treba flagovati (jeftina solo verzija vs. skupi set su legitimni)
const SET_KEYWORDS = /(?<![\p{L}])(set|komplet|paket|promo\s*pak)(?![\p{L}])/iu;
function hasSetKeyword(naziv) {
  if (!naziv) return false;
  return SET_KEYWORDS.test(naziv) || naziv.includes(" + ");
}

function detectOutliers(updates) {
  const groups = {};
  for (const u of updates) {
    if (!u.match_key || !u.cena || u.cena <= 0) continue;
    if (!groups[u.match_key]) groups[u.match_key] = [];
    groups[u.match_key].push(u);
  }

  const flagged = new Set();
  for (const [, items] of Object.entries(groups)) {
    if (items.length < OUTLIER_MIN_GROUP) continue;
    // Skip heterogene grupe (mix solo/set/komplet) — varijacija je legitimna
    if (items.some((i) => hasSetKeyword(i.naziv))) continue;
    const sorted = items.map((i) => i.cena).sort((a, b) => a - b);
    const med = median(sorted);
    if (med <= 0) continue;
    const highLimit = med * OUTLIER_HIGH_MULT;
    const lowLimit = med * OUTLIER_LOW_MULT;
    for (const item of items) {
      if (item.cena > highLimit || item.cena < lowLimit) {
        flagged.add(item.id);
      }
    }
  }
  return flagged;
}

async function batchUpdateFlags(updates, flagged) {
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < updates.length; i += UPDATE_SIZE) {
    const batch = updates.slice(i, i + UPDATE_SIZE);
    const ids = batch.map((u) => u.id);
    const flags = batch.map((u) => flagged.has(u.id));

    const { error } = await supabase.rpc("bulk_update_cena_sumnjiva", { ids, flags });
    if (error) {
      console.error(`   ⚠️ Flags batch ${i}: ${error.message}`);
      errors += batch.length;
    } else {
      updated += batch.length;
    }
  }

  return { updated, errors };
}

async function fetchAllProducts() {
  const products = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, naziv, brend_normalized, cena")
      .range(offset, offset + FETCH_SIZE - 1);

    if (error) {
      console.error(`❌ Greška pri čitanju (offset ${offset}):`, error.message);
      break;
    }

    if (!data || data.length === 0) break;
    products.push(...data);
    offset += data.length;

    if (data.length < FETCH_SIZE) break;
  }

  return products;
}

async function batchUpdate(updates) {
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < updates.length; i += UPDATE_SIZE) {
    const batch = updates.slice(i, i + UPDATE_SIZE);

    const ids = batch.map((u) => u.id);
    const matchKeys = batch.map((u) => u.match_key);
    const models = batch.map((u) => u.extracted_model);

    const { data, error } = await supabase.rpc("bulk_update_match_keys", {
      ids,
      match_keys: matchKeys,
      models,
    });

    if (error) {
      console.error(`   ⚠️ Batch ${i}: ${error.message}`);
      errors += batch.length;
    } else {
      updated += batch.length;
    }

    // Progress log svakih 5000
    if ((i + UPDATE_SIZE) % 5000 < UPDATE_SIZE || i + UPDATE_SIZE >= updates.length) {
      console.log(`   📊 Progress: ${Math.min(i + UPDATE_SIZE, updates.length)}/${updates.length}`);
    }
  }

  return { updated, errors };
}

async function main() {
  console.log("🔗 Product matching — start\n");

  // 1. Fetch sve proizvode
  console.log("📥 Čitam proizvode iz baze...");
  const products = await fetchAllProducts();
  console.log(`   ${products.length} proizvoda učitano\n`);

  if (products.length === 0) {
    console.log("⚠️ Nema proizvoda u bazi!");
    return;
  }

  // 2. Izračunaj match_key za svaki
  console.log("🧮 Računam match_key...");
  let matched = 0;
  let unmatched = 0;
  const noModel = [];
  const noBrand = [];
  const updates = [];

  for (const p of products) {
    const { model, matchKey } = extractMatch(p.naziv, p.sku, p.brend_normalized);

    updates.push({
      id: p.id,
      match_key: matchKey,
      extracted_model: model,
      cena: p.cena,
      naziv: p.naziv,
    });

    if (matchKey) {
      matched++;
    } else {
      unmatched++;
      if (!p.brend_normalized) {
        noBrand.push(p.naziv?.substring(0, 60));
      } else {
        noModel.push(p.naziv?.substring(0, 60));
      }
    }
  }

  console.log(`   ✅ Matched: ${matched} (${((matched / products.length) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Unmatched: ${unmatched} (${((unmatched / products.length) * 100).toFixed(1)}%)`);
  console.log(`      - Bez brenda: ${noBrand.length}`);
  console.log(`      - Bez modela: ${noModel.length}`);
  console.log();

  // Log sample unmatched
  if (noModel.length > 0) {
    console.log("   Primeri bez modela (max 10):");
    noModel.slice(0, 10).forEach((n) => console.log(`     • ${n}`));
    console.log();
  }

  // 3. Ažuriraj bazu
  console.log("📤 Ažuriram bazu...");
  const { updated, errors } = await batchUpdate(updates);
  console.log(`   ✅ Ažurirano: ${updated}`);
  if (errors > 0) console.log(`   ❌ Grešaka: ${errors}`);
  console.log();

  // 3.5 Detekcija sumnjivih cena (outlier u grupi)
  console.log("🚨 Detekcija sumnjivih cena...");
  const flagged = detectOutliers(updates);
  console.log(`   Flagovano: ${flagged.size} proizvoda (prag: grupa ≥${OUTLIER_MIN_GROUP}, cena >${OUTLIER_HIGH_MULT}× ili <${OUTLIER_LOW_MULT.toFixed(2)}× medijane)`);
  const flagRes = await batchUpdateFlags(updates, flagged);
  console.log(`   ✅ Ažurirano: ${flagRes.updated}`);
  if (flagRes.errors > 0) console.log(`   ❌ Grešaka: ${flagRes.errors}`);
  console.log();

  // 4. Top grupe
  console.log("📊 Top 15 match_key grupa:");
  const groupCounts = {};
  for (const u of updates) {
    if (u.match_key) {
      groupCounts[u.match_key] = (groupCounts[u.match_key] || 0) + 1;
    }
  }

  const topGroups = Object.entries(groupCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  for (const [key, count] of topGroups) {
    console.log(`   ${String(count).padStart(3)} × ${key}`);
  }

  const totalGroups = Object.keys(groupCounts).length;
  const multiSourceGroups = Object.values(groupCounts).filter((c) => c > 1).length;
  console.log(`\n📈 Ukupno ${totalGroups} grupa, od toga ${multiSourceGroups} sa 2+ ponude`);
  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("💥 Fatalna greška:", err);
  process.exit(1);
});

// Dijagnostika: grupe sa velikim rasponom cena (potencijalni false matches)
// Čita sve proizvode sa match_key, grupiše, i listuje one gde je max/min > prag

const { supabase } = require("./lib/supabase");

const SPREAD_THRESHOLD = 2.0;
const FETCH_SIZE = 1000;

async function fetchAll() {
  const products = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, match_key, naziv, brend_normalized, cena, dostupnost, izvor, sku")
      .not("match_key", "is", null)
      .range(offset, offset + FETCH_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    products.push(...data);
    offset += data.length;
    if (data.length < FETCH_SIZE) break;
  }
  return products;
}

async function main() {
  console.log("Čitam proizvode...");
  const products = await fetchAll();
  console.log(`${products.length} proizvoda sa match_key\n`);

  const groups = {};
  for (const p of products) {
    if (!p.cena || p.cena <= 0) continue;
    if (!groups[p.match_key]) groups[p.match_key] = [];
    groups[p.match_key].push(p);
  }

  const multi = Object.entries(groups).filter(([, ps]) => ps.length > 1);
  console.log(`Grupa sa 2+ ponude: ${multi.length}`);

  const suspicious = [];
  for (const [key, ps] of multi) {
    const prices = ps.map((p) => p.cena);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const spread = max / min;
    if (spread > SPREAD_THRESHOLD) {
      suspicious.push({ key, ps, min, max, spread });
    }
  }

  suspicious.sort((a, b) => b.spread - a.spread);

  console.log(`\nGrupa sa spread > ${SPREAD_THRESHOLD}x: ${suspicious.length} (${((suspicious.length / multi.length) * 100).toFixed(1)}% multi-grupa)\n`);

  // Distribucija
  const buckets = { "2-3x": 0, "3-5x": 0, "5-10x": 0, "10x+": 0 };
  for (const s of suspicious) {
    if (s.spread < 3) buckets["2-3x"]++;
    else if (s.spread < 5) buckets["3-5x"]++;
    else if (s.spread < 10) buckets["5-10x"]++;
    else buckets["10x+"]++;
  }
  console.log("Distribucija:");
  for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(8)} ${v}`);
  console.log();

  // Top 25 worst
  console.log(`Top 25 najgorih (po spread-u):\n`);
  for (const { key, ps, min, max, spread } of suspicious.slice(0, 25)) {
    console.log(`  ${spread.toFixed(1)}x — ${key} (${ps.length} ponuda, ${min}–${max} RSD)`);
    for (const p of ps.slice().sort((a, b) => a.cena - b.cena)) {
      const naziv = (p.naziv || "").substring(0, 85);
      console.log(`     ${String(p.cena).padStart(8)} RSD  [${p.izvor.padEnd(18)}] ${naziv}`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error("Greška:", err);
  process.exit(1);
});

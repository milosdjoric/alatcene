// Klasifikacija artikala — jedan izvor istine za segregaciju alat / ne-alat.
//
// Domen sajta su ELEKTRIČNI i AKUMULATORSKI alati. Sve van toga (pribor,
// lampe, radio/gadgeti, baštenski alat, grejana odeća, perači, vodoinstalater)
// se SKLANJA — ne ulazi u bazu (db.js filtrira) i ne prikazuje se.
//
// Zadržavaju se kao alat: sav električni/aku alat + usisivači + baterije/punjači
// + tocila/stacionarne mašine + aparati za zavarivanje (odluka korisnika).
//
// Klasifikacija je po ključnim rečima u nazivu kategorije (hvata i buduće
// varijante naziva, ne fiksnu listu). NIKAD-izuzeci štite mašine-alate čije
// ime slučajno sadrži "pribor"/"oštrač"/"cevi".

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/š/g, "s")
    .replace(/đ/g, "dj")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/ž/g, "z");

// Ključne reči koje označavaju da kategorija NIJE električni/aku alat.
const SKLONI_KEYS = [
  // --- PRIBOR / potrošno ---
  "pribor", "dodaci", "dodatna oprema", "brusni papir", "brus papir",
  "cetk", "cetkic", "burgij", "rezni", "ploce za", "brusne ploce", "krune",
  "futer", "stezna glava", "stezne glave", "servisni komplet", "ulja masti",
  "graviranje", "dremel", "nastav", "list za", "separator", "brusni",
  // --- LAMPE / REFLEKTORI ---
  "lampa", "lampe", "reflektor", "led reflektor",
  // --- RADIO / ZVUČNICI / VENTILATORI ---
  "radio", "zvucnik", "ventilator", "bluetooth",
  // --- GREJANJE / ODEĆA / ostalo-nealat ---
  "grejac", "jakn", "prsluk", "majic", "cebe", "frizider",
  "aparati za kafu", "grejna odeca", "grejna",
  // --- BAŠTA ---
  "kosac", "kosil", "trimer", "ziva ograd", "zivu ograd", "prskalic",
  "travn", "za travu", "prozraciv", "robot kosac", "duvac lisc",
  "usisivaci lisca", "seckalic", "drobilic", "cepac", "bastens", "lancan",
  // --- PERAČI / PUMPE ---
  "perac pod", "peraci pod", "perac prozora", "peraci prozora",
  "vakuum pumpa", "pumpa za vodu", "aku pumpa", "aku perac",
  // --- VODOINSTALATER / CEVI ---
  "vodoinstalater", "pegle za spajanje", "pegla za pvc", "nareznic",
  "obradu cevi", "secenje i obradu cevi", "pumpe za instalacije",
];

// NIKAD ne sklanjaj — mašine-alati / pravi alat koje gornji ključevi lažno hvataju.
const NIKAD_KEYS = [
  "alat za cevi", "alat za secenje", "alat za obradu lima",
  "tocila ostraci", "ostraci", "ostrac", "ostrac burgija",
  "polir masine i pribor", "stacionarne brusilice i pribor",
  "usisivaci i pribor", "strugovi glodalice i pribor", "masine za plocice",
];

/**
 * Da li kategoriju treba skloniti (nije električni/aku alat).
 * @param {string|null|undefined} kategorija
 * @returns {boolean}
 */
function jeSklonjenaKategorija(kategorija) {
  if (!kategorija) return false; // bez kategorije ne sklanjamo (ne znamo)
  const n = norm(kategorija);
  if (NIKAD_KEYS.some((k) => n.includes(norm(k)))) return false;
  return SKLONI_KEYS.some((k) => n.includes(k));
}

module.exports = { jeSklonjenaKategorija };

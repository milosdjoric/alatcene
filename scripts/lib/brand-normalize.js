// CJS verzija brand normalizacije — deli logiku sa src/lib/brand-map.ts
// Ako menjaš mapu ovde, ažuriraj i tamo (i obrnuto)

const BRAND_MAP = {
  "bosch": "Bosch",
  "makita": "Makita",
  "einhell": "Einhell",
  "metabo": "Metabo",
  "dewalt": "DeWalt",
  "villager": "Villager",
  "ingco": "Ingco",
  "milwaukee": "Milwaukee",
  "hikoki": "HiKOKI",
  "stanley": "Stanley",
  "proxxon": "Proxxon",
  "scheppach": "Scheppach",
  "flex": "Flex",
  "dremel": "Dremel",
  "festool": "Festool",
  "yato": "Yato",
  "bosch diy": "Bosch DIY",
  "graphite": "Graphite",
  "wolfcraft": "Wolfcraft",
  "verto": "Verto",
  "ryobi": "Ryobi",
  "dck": "DCK",
  "eibenstock": "Eibenstock",
  "fieldmann": "Fieldmann",
  "deli": "Deli",
  "carat": "Carat",
  "bormann": "Bormann",
  "ferm": "Ferm",
  "bernardo - maschinen": "Bernardo",
  "cat": "CAT",
  "telwin": "Telwin",
  "rothenberger": "Rothenberger",
  "scangrip": "Scangrip",
  "agm": "AGM",
  "workers best": "Workers Best",
  "bihui": "Bihui",
  "daewoo": "Daewoo",
  "ridgid": "Ridgid",
  "garden": "Garden",
  "fein": "Fein",
  "femi": "Femi",
  "blade": "Blade",
  "collomix": "Collomix",
  "hazet": "Hazet",
  "echo": "Echo",
  "rems": "REMS",
  "gardenmaster": "Gardenmaster",
  "tyrolit": "Tyrolit",
  "gesipa": "Gesipa",
  "wadfow": "Wadfow",
  "machtig": "Machtig",
  "gude": "Güde",
  "güde": "Güde",
  "ruris": "Ruris",
  "evolution": "Evolution",
  "ks": "KS",
  "richmann": "Richmann",
  "kwb": "KWB",
  "beta": "Beta",
  "ronix": "Ronix",
  "neo": "NEO",
  "hitachi": "HiKOKI",
  "womax": "Womax",
  "womax premium": "Womax",
  "womax green power": "Womax",
  "senco": "Senco",
  "gardena": "Gardena",
  "wiha": "Wiha",
  "irimo": "Irimo",
  "vigor": "Vigor",
  "varta": "Varta",
  "deca": "Deca",
  "stiga": "Stiga",
  "stihl": "Stihl",
  "commel": "Commel",
  "tolsen": "Tolsen",
  "topex": "Topex",
  "unior": "Unior",
  "knipex": "Knipex",
  "extol": "Extol",
  "emos": "Emos",
  "trumpf": "Trumpf",
  "rubi": "Rubi",
  "raider": "Raider",
  "micron": "Micron",
  "levior": "Levior",
  "beorol": "Beorol",
  "gedore": "Gedore",
  "bosch expert": "Bosch",
  "esab": "ESAB",
  "holzmann maschinen": "Holzmann",
  "holzmann": "Holzmann",
  "mirka": "Mirka",
  "b&w": "B&W",
  "gys": "GYS",
  "högert technik": "Högert",
  "hogert": "Högert",
  "swisstech": "SwissTech",
  "winbag": "Winbag",
  "honda": "Honda",
  "klauke": "Klauke",
  "chicago": "Chicago Pneumatic",
  "chicago pneumatic": "Chicago Pneumatic",
  "lemania": "Lemania",
  "rem": "REM",
  "strong": "Strong",
  "karcher": "Kärcher",
  "kärcher": "Kärcher",
  "impakt": "Impakt",
  "max": "MAX",
  "wagner": "Wagner",
  "zipper": "Zipper",
  "xtar": "XTAR",
  "jei": "JEI",
  "hausmax": "Hausmax",
  "husqvarna": "Husqvarna",
  "novus": "Novus",
  "rapid": "Rapid",
  "wurth": "Würth",
  "limex": "Limex",
  "stocker": "Stocker",
  "bahco": "Bahco",
  "fervi": "Fervi",
  "zenesis": "Zenesis",
  "bohrcraft": "Bohrcraft",
  "klingspor": "Klingspor",
  "pilana": "Pilana",
  "bluebird": "Bluebird",
  "skil": "Skil",
  "profiair": "ProfiAir",
  "tjep": "TJEP",
  "oleo-mac": "Oleo-Mac",
  "avatar": "Avatar",
  "matrix": "Matrix",
  "heinner": "Heinner",
  "optrel": "Optrel",
  "bavaria": "Bavaria",
  "ingersoll": "Ingersoll Rand",
  "kaufmann": "Kaufmann",
  "weidmuller": "Weidmüller",
  "ega master": "EGA Master",
  "steinel": "Steinel",
  "sandberg": "Sandberg",
  "xiaomi": "Xiaomi",
  "usag": "USAG",
  "portwest": "Portwest",
  "greenlee": "Greenlee",
  "virutex": "Virutex",
  "pferd": "Pferd",
  "metallkraft": "Metallkraft",
  "bds": "BDS",
  "optimum": "Optimum",
  "hammer": "Hammer",
  "iskra": "Iskra",
  "total alati": "Total",
  "black+decker": "Black+Decker",
  "black&decker": "Black+Decker",
  "blackdecker": "Black+Decker",
  "boch": "Bosch",
  "matabo": "Metabo",
  "makira": "Makita",
  "\u041Cakita": "Makita",
  "borman": "Bormann",
  "maktec": "Makita",
  "ostalo": null,
  "ostali proizvodjaci": null,
  "super": null,
  "aku": null,
  "aku.": null,
  "akumulatorski": null,
  "akumulatorska": null,
  "akumulatorsko": null,
  "elektro": null,
  "električni": null,
  "električna": null,
  "brusilica": null,
  "testera": null,
  "trimer": null,
  "mikser": null,
  "usisivač": null,
  "mašina": null,
  "stacionarna": null,
  "recipro": null,
  "kružna": null,
  "čeona": null,
  "šlajferica": null,
  "udarna": null,
  "ručna": null,
  "rezna": null,
  "lenjir": null,
  "šipka": null,
  "mini": null,
  "set": null,
  "promo": null,
  "home": null,
  "fix": null,
  "black": null,
  "akcijski": null,
  "univerzalni": null,
  "3": null,
  "2": null,
  "5": null,
  "3 e": null,
};

const MODEL_NUMBER_PATTERN = /^[A-Z]{0,3}\d{2,}/i;

function normalizeBrand(raw) {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  const key = trimmed.toLowerCase();

  if (key in BRAND_MAP) {
    return BRAND_MAP[key];
  }

  if (MODEL_NUMBER_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// Brendovi za skeniranje naziva — samo ne-null, ključ dužine ≥3. Kratki ključevi
// ("ks", "b&w") su previše dvosmisleni za slepo skeniranje teksta. Duži ključevi
// idu prvi da "black+decker" pobedi pre nego što "decker"/"black" uhvati deo.
// Ključevi koji se kao reč prečesto javljaju u opisu, ne kao brend:
//   "max" → "SDS-max" (tip prihvata), "Pro Max". Skeniranje naziva ih preskače.
const NAME_SCAN_BLACKLIST = new Set(["max"]);

const NAME_SCAN_BRANDS = Object.entries(BRAND_MAP)
  .filter(([k, v]) => v && k.length >= 3 && !NAME_SCAN_BLACKLIST.has(k))
  .map(([k, v]) => ({ key: k, brand: v }))
  .sort((a, b) => b.key.length - a.key.length);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fallback ekstrakcija brenda iz NAZIVA kad scraped `brend` polje fali.
 * Skenira naziv kroz BRAND_MAP uz granicu reči (slova/cifre/+/& čine token,
 * tako da "rem" ne pogađa "kremen", a "black+decker" se hvata kao celina).
 * Vraća normalizovan brend ili null.
 */
function extractBrandFromName(naziv) {
  if (!naziv) return null;
  const hay = naziv.toLowerCase();
  for (const { key, brand } of NAME_SCAN_BRANDS) {
    const re = new RegExp(`(?:^|[^a-z0-9+&])${escapeRegex(key)}(?:[^a-z0-9+&]|$)`, "i");
    if (re.test(hay)) return brand;
  }
  return null;
}

/**
 * Glavni ulaz za scrapere/import: prvo scraped brend polje, pa fallback na naziv.
 */
function resolveBrand(brend, naziv) {
  return normalizeBrand(brend) ?? extractBrandFromName(naziv);
}

module.exports = { normalizeBrand, extractBrandFromName, resolveBrand, BRAND_MAP };

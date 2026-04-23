// Izvlači model number iz SKU ili naziva proizvoda
// Koristi se za kreiranje match_key = "Brend::MODEL"

// EAN/barcode pattern (8, 12, 13 cifara) — ovo NISU model brojevi
const EAN_PATTERN = /^\d{8}$|^\d{12,13}$/;

// SKU prefix pattern (npr. "BOSCH-06019K1021" → "06019K1021")
const SKU_PREFIX_PATTERN = /^[A-Z]+-(.+)$/i;

// Voltage/capacity/noise patterns da ih ne matchujemo kao modele
const NOISE_PATTERNS = /^\d+V$|^\d+Ah$|^\d+W$|^\d+mm$|^\d+V\d|^SDS$|^N\/A$|^LI-ION|^LION|^USB$|^LED$|MAH$/i;

// Bosch 10-cifreni katalog kodovi (alfanumerički, počinju sa 0 ili 2)
// Primeri: 0611272100, 06011C4020, 06019G030A, 2608580527
const BOSCH_CATALOG = /\b([02][0-9A-Z]{9})\b/i;

// Alfanumerički model — mora sadržati i slova i cifre, min 4 karaktera
// Primeri: DHP453Z, GBH2-26DRE, FDP200451-E, TC-CD18/35, GX-EID040-2, 51G540
const ALPHANUM_MODEL = /\b([A-Z0-9]{1,6}[-/]?[A-Z0-9]*\d[A-Z0-9/\-]*)\b/i;

// Čisti numerički katalog (5+ cifara, Einhell/Villager stil) — na kraju ili u zagradi
const NUMERIC_CATALOG = /\b(\d{5,8})\b/;

// Pattern za kodove u zagradama (kliklak stil)
const PAREN_CODE = /\(\s*([A-Z0-9][\w\-/. ]{2,}?)\s*\)/i;

// Pribor/rezervni delovi — reči koje signalizuju da je proizvod pribor za drugi alat
// (npr. "nož za HC 260", "filter vreća za DC500"). Ako se pojavljuju sa "za"
// u istom nazivu, model kod u nazivu verovatno pripada glavnom alatu, ne priboru.
// Koristi Unicode-safe boundary (\b u JS ne radi sa ž/č/š/đ).
const ACCESSORY_WORDS = /(?<![\p{L}])(nož(?:a|em|evi?|eva)?|disk(?:ovi)?|ploč[aei]|vreć[aei]|filter(?:a|i)?|papir(?:a|i)?|punjač(?:a|i)?|nastav(?:a)?k(?:a|u|om)?|pribor(?:a)?|kotur(?:a)?|kalup(?:a|i)?|dodat(?:a)?k(?:a|u)?|list(?:a|i|ovi)?|olovk[aei]|mlaznic[aei]|kutij[aei]|kom(?:p)?let(?:a)?|žic[aei]|set)(?![\p{L}])/iu;
const FOR_PREPOSITION = /(?<![\p{L}])za(?![\p{L}])/iu;

/**
 * Detektuje da li je naziv proizvoda pribor/rezervni deo
 * (ima accessory reč + "za" u nazivu)
 */
function isAccessory(naziv) {
  if (!naziv) return false;
  return ACCESSORY_WORDS.test(naziv) && FOR_PREPOSITION.test(naziv);
}

// Strip "+ poklon ..." tail — kod posle njega pripada poklonu, ne glavnom proizvodu
function stripPoklonTail(name) {
  return name.split(/\s*\+\s*poklon\b/i)[0].trim();
}

/**
 * Normalizuje SKU — stripuje prefix, whitespace, uppercase
 * Vraća null ako je EAN/barcode ili prazan
 */
function normalizeSku(sku) {
  if (!sku) return null;

  let cleaned = sku.trim();
  if (!cleaned) return null;

  // EAN barcode — ne može se koristiti za cross-source matching
  if (EAN_PATTERN.test(cleaned)) return null;

  // N/A i slični placeholder-i
  if (/^N\/?A$/i.test(cleaned) || /^-+$/.test(cleaned)) return null;

  // Strip vendor prefix (BOSCH-..., MAKITA-...)
  const prefixMatch = cleaned.match(SKU_PREFIX_PATTERN);
  if (prefixMatch) {
    cleaned = prefixMatch[1];
  }

  cleaned = cleaned.toUpperCase().replace(/\s+/g, "");
  return cleaned || null;
}

/**
 * Izvlači model number iz naziva proizvoda
 * Probira tier po tier dok ne nađe kandidata
 */
function extractModelFromName(naziv) {
  if (!naziv) return null;

  // Pribor filter — ako naziv sadrži accessory reč + "za", model u nazivu
  // referiše glavni alat; ne matchuj kroz naziv (proizvod ostaje solo)
  if (isAccessory(naziv)) return null;

  // Strip "+ poklon" tail da ne pokupimo model iz poklona
  let name = stripPoklonTail(naziv).trim();

  // 1. Kod u zagradama (kliklak stil): "( GX-EID040-2 )"
  const parenMatch = name.match(PAREN_CODE);
  if (parenMatch) {
    const candidate = parenMatch[1].trim().toUpperCase().replace(/\s+/g, "");
    if (candidate.length >= 4 && !NOISE_PATTERNS.test(candidate)) {
      return candidate;
    }
  }

  // 2. Bosch 10-cifreni katalog: "06019G030A" (može i 06019G030a)
  // Tražimo u celom stringu, uključujući ono posle |
  const boschMatch = name.match(BOSCH_CATALOG);
  if (boschMatch) {
    return boschMatch[1].toUpperCase();
  }

  // 3. Model sa razmakom (Einhell/Bosch stil): "TE-CD 18/2", "GKS 12V-26", "VLN 1120"
  // Pattern: 2-4 slova, opcionalno crtica + slova, razmak, broj sa opcionalnim sufixom
  const spacedModelRegex = /\b([A-Z]{2,4}(?:-[A-Z]{1,4})?\s+\d{1,5}[A-Z]*(?:[-/]\d{1,5}[A-Z]*)*)\b/gi;
  let spacedMatch;
  while ((spacedMatch = spacedModelRegex.exec(name)) !== null) {
    const candidate = spacedMatch[1];
    if (/[A-Za-z]/.test(candidate) && /\d/.test(candidate) && candidate.length >= 5) {
      // Ne matchuj ako je samo "Li 2" ili "Ah 3"
      const letterPart = candidate.split(/\s+/)[0];
      if (!NOISE_PATTERNS.test(letterPart) && !/^(Li|Ah|SDS|SET)$/i.test(letterPart)) {
        const upper = candidate.toUpperCase().replace(/\s+/g, " ");
        // Filtriraj voltaže: "XGT 40V", "GBA 12V", "12/24V"
        if (/\d+V$/i.test(upper) || /^\d+\/\d+V$/i.test(upper)) continue;
        return upper;
      }
    }
  }

  // 4. Alfanumerički model kod: DHP453Z, GBH2-26DRE, TC-CD18/35
  // Tražimo najduži match koji sadrži i slova i cifre
  const allMatches = [];
  const regex = new RegExp(ALPHANUM_MODEL.source, "gi");
  let m;
  while ((m = regex.exec(name)) !== null) {
    const candidate = m[1];
    // Mora sadržati i slova i cifre
    if (/[A-Za-z]/.test(candidate) && /\d/.test(candidate)) {
      // Filtriraj noise (18V, 2Ah, 500W, 230mm, SDS, 12/24V)
      if (!NOISE_PATTERNS.test(candidate) && candidate.length >= 4) {
        const upper = candidate.toUpperCase();
        if (/\d+V$/i.test(upper)) continue;
        allMatches.push(candidate);
      }
    }
  }

  if (allMatches.length > 0) {
    // Uzmi najduži kandidat (obično je model specifičniji od kratkih kodova)
    allMatches.sort((a, b) => b.length - a.length);
    return allMatches[0].toUpperCase();
  }

  // 5. Čisti numerički katalog (5-8 cifara, Einhell/Villager stil)
  const numMatch = name.match(NUMERIC_CATALOG);
  if (numMatch) {
    return numMatch[1];
  }

  return null;
}

/**
 * Glavna funkcija — vraća { model, matchKey }
 * @param {string|null} naziv - Naziv proizvoda
 * @param {string|null} sku - SKU iz scraped podataka
 * @param {string|null} brendNormalized - Normalizovani brend
 */
function extractMatch(naziv, sku, brendNormalized) {
  if (!brendNormalized) {
    return { model: null, matchKey: null };
  }

  // Probaj SKU prvo
  const normalizedSku = normalizeSku(sku);
  if (normalizedSku) {
    return {
      model: normalizedSku,
      matchKey: `${brendNormalized}::${normalizedSku}`,
    };
  }

  // Izvuci iz naziva
  const modelFromName = extractModelFromName(naziv);
  if (modelFromName) {
    return {
      model: modelFromName,
      matchKey: `${brendNormalized}::${modelFromName}`,
    };
  }

  return { model: null, matchKey: null };
}

module.exports = { extractMatch, normalizeSku, extractModelFromName, isAccessory };

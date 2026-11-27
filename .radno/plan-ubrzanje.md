# Plan ubrzanja aplikacije

## Dijagnoza (izmereno 2026-06-03)

| Upit | Vreme | Norma |
|---|---|---|
| `COUNT(*)` (38k redova) | **1.317ms** | <50ms |
| get_brand_counts (landing) | 2.866ms | <100ms |
| get_category_counts (landing) | 3.608ms | <100ms |
| search_grouped (prazna) | 5.437ms | <200ms |
| search_grouped (bosch) | 8.447ms | <300ms |
| └ price_history GROUP BY (deo) | 1.102ms | — |

**Dva uska grla, sabiraju se:**
1. **Instanca** — Nano free tier (1GB RAM, deljeni CPU, bez compute addon-a). `COUNT(*)` od 1,3s na 38k redova je dokaz da instanca davi — premalo RAM-a da keširaju tabele, sve sa diska.
2. **Dizajn upita** — `search_grouped` pravi 3 TEMP tabele po pozivu + `GROUP BY` nad celom `price_history` (1,48M redova) + `offers` podupit skenira `_filtered` 40× (po grupi na strani).

`price_history` = 1,48M redova (~38 po proizvodu, dnevni snapshotovi) dodatno opterećuje RAM na slaboj instanci.

---

## Plan po prioritetu (efekat / trud / trošak)

### 0. Compute upgrade — NAJVEĆI pojedinačni dobitak 💰
- Nano (1GB) → **Small/Medium** (2–4GB RAM, dedicated CPU) preko Supabase compute addon-a.
- Efekat: `COUNT` 1,3s → <50ms; sve 5–10× brže odjednom (tabele staju u RAM keš).
- Trošak: ~$15–60/mes. **Odluka korisnika** (jedino što košta).

### 1. Materijalizovati `historical_min` — besplatno, ~2h
- Nova kolona `products.historical_min_cena`, puni se pri scrape-u (kad već upisujemo `price_history`).
- Izbacuje `GROUP BY` nad 1,48M (1,1s) iz **svake** pretrage.

### 2. Kešitati landing podatke — besplatno, ~1h
- Next.js `unstable_cache` / `revalidate: 3600` na get_brand_counts, get_category_counts, COUNT.
- Menjaju se 1×/dan (posle scrape-a) → nema potrebe računati pri svakom otvaranju.
- Landing 2,5s → instant (osim prvog poziva na sat).

### 3. Materijalizovan view grupa — besplatno, ~1 dan
- Pre-izračunate grupe (`match_key` → min/max/popust/num_sources) u `MATERIALIZED VIEW`.
- `REFRESH` posle scrape-a (1×/dan).
- Pretraga postaje običan `SELECT` iz view-a + filteri + indeksi — bez 3 TEMP tabele i bez agregacije pri upitu. Najveći dizajn-dobitak.

### 4. Prorediti `price_history` — besplatno, ~2h
- Čuvati red samo kad se cena **promeni**, ne identične dnevne kopije.
- 1,48M → verovatno <200k. Pomaže #1, grafikon, i **smanjuje RAM pritisak** (bitno na slaboj instanci — pomaže i bez upgrade-a).

---

## Preporučeni redosled

**Ako ima budžeta:** #0 (instanca) → #1 → #2. Upgrade reši najviše, ostalo besplatno dočisti.

**Bez troška:** #4 (manje RAM pritiska) → #1 (izbaci GROUP BY) → #3 (view grupa) → #2 (keš). Realno može pod 1–2s i na Nano tier-u.

## Već urađeno
- Landing više ne zove `search_grouped` (bio 12s timeout → 2,5s). [page.tsx]

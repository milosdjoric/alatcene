# cenealata.xyz — Migracija na Next.js + Supabase + Vercel

## Kontekst

Trenutno: 17 Node.js scrapera, ~34k proizvoda u JSON fajlovima, statički index.html sa klijentskim pretragom. Radi lokalno na Mac-u.

Cilj: javno dostupan sajt sa serverskom pretragom, bazom podataka, i automatskim dnevnim scrapingom. Potpuno besplatno osim domena.

## Stack

| Servis | Šta radi | Cena |
|---|---|---|
| Vercel (free) | Next.js hosting, CDN, SSL | 0 EUR |
| Supabase (free) | PostgreSQL baza, search | 0 EUR |
| GitHub Actions (free) | Cron za dnevni scraping | 0 EUR |
| Cloudflare (free) | DNS | 0 EUR |
| cenealata.xyz | Domen | ~1-2 EUR/god |
| **Ukupno** | | **~0.15 EUR/mesec** |

## Implementacija — 6 faza

### Faza 1: Next.js scaffold + Git

- `git init` u postojećem folderu
- Scaffold Next.js app (App Router, TypeScript, Tailwind)
- Push na GitHub (potreban za Vercel + GitHub Actions)
- Struktura:
  ```
  src/app/page.tsx            — glavna stranica pretrage
  src/app/api/search/route.ts — API za pretragu
  src/app/layout.tsx          — layout, meta, font
  src/components/             — SearchBar, ProductCard, FilterBar, SortSelect, SourceBadge
  src/lib/supabase/           — server.ts, client.ts
  src/lib/types.ts            — Product interfejs
  src/lib/constants.ts        — SOURCES mapa (17 prodavnica + boje)
  scrapers/                   — postojećih 17 scrapera (ostaju)
  scrapers/lib/db.js          — NOVI: Supabase upsert helper
  scripts/import-existing.js  — NOVI: jednokratni import JSON → baza
  .github/workflows/scrape.yml — GitHub Actions cron
  ```

### Faza 2: Supabase baza

- Kreirati Supabase projekat (free tier)
- SQL migracije:

**Tabela `products`:**
- `id` BIGSERIAL PK
- `external_id`, `sku`, `naziv`, `brend`, `kategorija`, `parent_kategorija`
- `cena`, `redovna_cena`, `popust_procenat`, `popust_iznos` (INTEGER)
- `url`, `izvor`, `dostupnost`, `ocena`, `broj_recenzija`, `specifikacije`
- `scraped_at`, `updated_at` (TIMESTAMPTZ)
- **UNIQUE(izvor, url)** — za upsert

**Indexi:**
- `izvor`, `parent_kategorija`, `cena`, `popust_procenat`, `brend`
- **Trigram index** na `naziv` (za ILIKE pretragu na srpskom)
- `pg_trgm` extension

**RLS:** read-only za anon, write za service_role

**Tabela `price_history`** (opciono, za buduće praćenje cena):
- `product_id`, `cena`, `redovna_cena`, `recorded_at` (DATE)

### Faza 3: Scraper migracija

- `npm install @supabase/supabase-js`
- Novi fajl `scrapers/lib/db.js`:
  - Inicijalizuje Supabase klijent (service role key)
  - `upsertProducts(products)` — batch upsert po 500 redova
  - Mapira `product.id` → `external_id`
  - Conflict na `(izvor, url)`
- Svaki scraper dobija na kraj `main()`: `await upsertProducts(allProducts)`
- JSON backup ostaje tokom tranzicije
- `scrape-all.js` — dodati čišćenje starih proizvoda (koji nisu ažurirani danas)

### Faza 4: Next.js frontend

**API ruta `/api/search`:**
```
GET /api/search?q=bosch+busilica&izvor=shoppster&kategorija=Akumulatorski+alati&sort=price-asc&page=1&limit=50
```
- ILIKE sa trigramima za srpski (nema stemmera)
- Filteri po izvoru, kategoriji, cenovnom rangu
- Sortiranje: cena ↑↓, popust, naziv
- Paginacija: offset/limit

**Komponente:**
- `SearchBar` — debounced input (300ms), poziva /api/search
- `FilterBar` — 17 source dugmadi + 2 kategorije
- `SortSelect` — dropdown
- `ProductCard` — naziv (link), source badge, cena/stara cena/popust
- `ProductList` — lista + load more/paginacija
- `SourceBadge` — obojen badge po prodavnici

**Stil:** Tailwind, portovati iz postojećeg CSS-a. Bela pozadina kartica, siva pozadina, crveni akcent #e3131b.

### Faza 5: Deploy (Vercel + Cloudflare + GitHub Actions)

1. GitHub repo (već kreiran u Fazi 1)
2. Vercel: importovati repo, auto-detect Next.js
3. Env varijable u Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. GitHub Actions workflow `.github/workflows/scrape.yml`:
   - Cron: `0 4 * * *` (6h po srpskom vremenu = 4h UTC)
   - `npm ci`, `node scrape-all.js`
   - Secret: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
5. Domen cenealata.xyz → Cloudflare DNS → Vercel
6. Vercel custom domain setup

### Faza 6: Migracija podataka i go-live

1. Pokrenuti `scripts/import-existing.js` (import JSON → Supabase)
2. Verifikovati broj proizvoda
3. `npm run dev` lokalno, testirati pretragu
4. Push na GitHub → Vercel auto-deploy
5. Ručno triggerovati GitHub Actions workflow da testiramo scraping
6. DNS switch na cenealata.xyz
7. Ukloniti lokalni cron sa Mac-a

## Ključne odluke

- **Vercel free** umesto Hetzner + Coolify — 0 EUR, savršena Next.js integracija
- **GitHub Actions** umesto server cron-a — besplatno 2000 min/mesec, nama treba ~450
- **ILIKE + trigram** umesto full-text search — srpski nema stemmer
- **API route** umesto direktnog Supabase poziva iz browsera — bezbednije, cache-friendly
- **UNIQUE(izvor, url)** — URL je uvek stabilan, external_id ponekad nije
- **JSON backup ostaje** tokom tranzicije dok se pipeline ne dokaže

## Verifikacija

1. Lokalno: `npm run dev` → pretraži "bosch bušilica" → rezultati iz baze
2. API: `curl localhost:3000/api/search?q=makita` → JSON odgovor
3. Scraping: `node scrapers/shoppster.js` → proveri Supabase dashboard
4. GitHub Actions: ručno pokrenuti workflow, proveriti logove
5. Produkcija: otvoriti cenealata.xyz, potvrditi da pretraga radi
6. Cron: proveriti sutradan da li su podaci ažurirani

## Kritični fajlovi za modifikaciju

- `scrapers/*.js` (svih 17) — dodati db.js import
- `scrape-all.js` — Supabase cleanup
- `package.json` — nove zavisnosti
- `index.html` → zamenjuje se potpuno sa `src/app/page.tsx`
- NOVO: `.github/workflows/scrape.yml`
- NOVO: `scrapers/lib/db.js`
- NOVO: `scripts/import-existing.js`

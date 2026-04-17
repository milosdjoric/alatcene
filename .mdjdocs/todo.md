# cenealata.xyz — TODO

## Urađeno

- [x] 17 scrapera (shoppster, gama, superalati, prodavnicaalata, wobyhaus, timkomerc, amcarco, omni-alati, sbt-alati, najpovoljnijialati, eplaneta, metalflex, simns, bosshop, axisshop, kliklak, odigledolokomotive)
- [x] ~34k proizvoda scrape-ovano
- [x] Statički sajt sa pretragom (index.html)
- [x] scrape-all.js orchestrator + manifest.json
- [x] Git init + .gitignore
- [x] Next.js scaffold (App Router, TS, Tailwind)
- [x] @supabase/supabase-js instaliran
- [x] Supabase projekat kreiran (cenealata.xyz, Europe region, RLS uključen)
- [x] .env.local sa Supabase ključevima

## Sledeća sesija — redosled

### 1. Supabase baza
- [ ] SQL migracija u Supabase SQL Editor (products tabela, indexi, trigram, RLS)
- [ ] src/lib/supabase/server.ts i client.ts

### 2. Import podataka
- [ ] scrapers/lib/db.js (Supabase upsert helper)
- [ ] scripts/import-existing.js (import JSON → baza)
- [ ] Pokrenuti import, verifikovati ~34k redova u bazi

### 3. API ruta
- [ ] src/app/api/search/route.ts
- [ ] ILIKE + trigram pretraga
- [ ] Filteri (izvor, kategorija, cena), sortiranje, paginacija

### 4. Frontend (moderan dizajn)
- [ ] src/lib/constants.ts (SOURCES mapa)
- [ ] src/lib/types.ts (Product interfejs)
- [ ] src/components/ (SearchBar, ProductCard, FilterBar, SortSelect, SourceBadge)
- [ ] src/app/page.tsx + layout.tsx
- [ ] Responsive, Tailwind

### 5. Scraper integracija
- [ ] Modifikovati svih 17 scrapera da koriste db.js
- [ ] Ažurirati scrape-all.js (cleanup starih proizvoda)

### 6. Product Matching
- [x] SQL migracija: match_key + extracted_model kolone + indeks
- [x] scripts/lib/model-extract.js — extraction funkcija (SKU → regex → NULL)
- [x] scripts/match-products.js — batch skripta
- [x] Pokrenuti i verifikovati matching rezultate (81%+ matched, 6300+ grupa sa 2+ ponude)
- [x] GitHub Actions: dodati matching korak posle scrape-a
- [x] Supabase RPC: search_grouped + bulk_update_match_keys
- [x] src/lib/types.ts — ProductGroup, ProductOffer, GroupedSearchResponse
- [x] src/components/ProductGroupCard.tsx
- [x] src/components/ProductGroupGrid.tsx
- [x] src/app/proizvod/[matchKey]/page.tsx — stranica za poređenje cena
- [x] src/app/page.tsx — prebaciti na grupisane rezultate
- [ ] Testirati end-to-end u browseru

### 7. Deploy
- [ ] GitHub repo + push
- [ ] Vercel import + env varijable
- [ ] .github/workflows/scrape.yml (cron 0 4 * * * UTC = 6h srpsko)
- [ ] Cloudflare DNS za cenealata.xyz
- [ ] Vercel custom domain
- [ ] Testirati ceo flow end-to-end

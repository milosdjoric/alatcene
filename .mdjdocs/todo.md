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

- [x] GitHub repo + push
- [x] Vercel import + env varijable
- [x] .github/workflows/scrape.yml (cron 0 4 * * * UTC = 6h srpsko)
- [x] Domen cenealata.in.rs (mCloud, ističe 18.04.2027)
- [x] Vercel custom domain
- [ ] Testirati ceo flow end-to-end

### 8. Sanacija (2026-09-28)

- [x] price_history: obrisati duple indekse (uq_product_date, idx_price_history_product)
- [x] VACUUM FULL price_history — 437 MB → 102 MB (baza 437 MB, free limit 500 MB)
- [x] Pregledati nekomitovane izmene u src/ (ubrzanje iz plan-ubrzanje.md)
- [x] Lokalni build + commit + push (deploy na Vercel) — 1ae0ed2 READY
- [ ] Odluka: sajt ostaje ili ne → scrape cron (disabled_inactivity od 03.08.)

### 9. Header, font, analitika (2026-09-28)

- [x] Zajednički SiteHeader/SiteFooter (bili 4 različita header-a)
- [x] Broj prodavnica/alata iz baze (src/lib/site-stats.ts) umesto ručnih 17/18/19
- [x] Font Plus Jakarta Sans (Manrope → Jakarta; Euclid Flex odbačen — komercijalna licenca)
- [x] Primeniti migraciju 20260928130000_get_source_counts.sql na produkciju
- [x] Build + vizuelna provera + commit + push
- [ ] Info stranica: title "O sajtu — cenealata.in.rs" + template daje dupli naziv sajta
- [x] GA4 (G-PZJXB4GTK7) → @next/third-parties u layout.tsx, NEXT_PUBLIC_GA_ID samo na Vercel Production
- [ ] Posle deploy-a: proveriti GA Realtime da stižu pregledi
- [ ] Mobilna provera na pravom telefonu (headless Chrome ne ide ispod 500px)
- [ ] Cookie consent (Consent Mode v2) — odluka

### 10. Pretraga bez kvačica, po rečima (2026-09-28)

- [x] Uzrok: search_grouped radio naziv ILIKE '%fraza%' — "busilica"≠"bušilica" + tačna fraza ("bosch busilica" = 9 grupa, samo Boss Shop)
- [x] Migracija 20260928140000: unaccent, normalize_search(), products.naziv_search (generated), search_patterns(), search_grouped LIKE ALL — primenjena na produkciju
- [x] /api/search koristi isti search_patterns + naziv_search (commit 8faa008, lokalno)
- [ ] Verifikacija rezultata posle migracije (moj RPC poziv blokiran) — korisnik proverava u browseru; pre: bosch busilica=9, makita brusilica=23, aku srafilica=0
- [ ] Izmeriti brzinu nove pretrage; ako je spora → GIN trigram indeks na naziv_search (LIKE ALL niz ga možda ne koristi)
- [x] Push 8faa008

### 11. Čišćenje indeksa na products (~26 MB)

- [ ] Ponovo proveriti idx_scan pre brisanja
- [ ] Migracija DROP INDEX CONCURRENTLY: idx_products_naziv_trgm (22 MB, stara pretraga), idx_products_izvor (pokriva ga uq_izvor_external_id), idx_products_dostupnost (2 vrednosti), idx_products_hist_min (0 skenova)
- [ ] Pravilo: indeksi samo kroz migracije (svi na products su pravljeni ručno u dashboard-u)

### 12. Osnovni SEO

- [x] Google Search Console: TXT verifikacija dodata na Vercel DNS (DNS je na Vercel-u, ne mCloud)
- [ ] Search Console: Verify + prijaviti sitemap.xml (korisnik)
- [x] Proizvod: generateMetadata (naziv + najniža cena + broj prodavnica), canonical, OG, notFound() (status ostaje 200 zbog loading.tsx streaming-a, ali Next dodaje noindex)
- [x] JSON-LD: Product + AggregateOffer (proizvod), WebSite + SearchAction (početna)
- [x] Sitemap: 536 → 15.420 URL-ova (RPC get_sitemap_groups + paginacija, PostgREST limit 1000), stvarni lastModified
- [x] noindex,follow za pretragu/filtere; canonical za početnu i info
- [x] OG slika preko next/og (sajt); og:url više ne nasleđuje početnu
- [x] Info title duplikat, lang="sr-Latn"
- [x] 404/error stranice: naslov bio text-white (nevidljiv na svetloj temi)
- [ ] Posle deploy-a: Google Rich Results Test za jedan proizvod
- [ ] OG slika: učitati Plus Jakarta Sans (default font nema bold); kasnije OG po proizvodu (naziv + cena)

### 13. Kontrast i čitljivost

- [x] Pretraga provereno na produkciji: bosch busilica 9→781, makita brusilica 23→321, aku srafilica 0→77
- [x] Boje po WCAG AA: subtle 2.6→5.4:1, accent 3.9→5.5:1, muted 6→9.7:1, istorijski min (#0ea5e9 2.8:1) → token history 5.9:1
- [x] Font: osnova 17px, težina 500, sitni px tekst +1px
- [ ] Grafikon cena u headless screenshot-u prazan — proveriti u pravom browseru
- [ ] Boje prodavnica (SOURCES, npr. amcarco #84cc16) na beloj slabog kontrasta — badge-evi i legenda grafikona
- [ ] Prvi (hladni) upit pretrage 6–9 s posle deploy-a — pratiti

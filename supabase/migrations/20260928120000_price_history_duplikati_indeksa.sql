-- price_history je imao 3 identična indeksa nad (product_id, recorded_at):
-- dva UNIQUE constraint-a (price_history_product_date_uniq, uq_product_date)
-- i običan idx_price_history_product (0 skeniranja). Svaki ~71 MB.
-- Zadržavamo price_history_product_date_uniq (njega koristi ON CONFLICT u
-- record_price_change) — ostala dva su čist višak pri upisu i u RAM-u.

ALTER TABLE public.price_history DROP CONSTRAINT IF EXISTS uq_product_date;
DROP INDEX IF EXISTS public.idx_price_history_product;

-- Posle brisanja 1,48M → 126k redova (migracija 20260603200000) tabela i
-- indeksi nikad nisu sabijeni. VACUUM FULL ne može u transakciji — pokreće
-- se ručno, van migracije:
--   VACUUM (FULL, ANALYZE) public.price_history;

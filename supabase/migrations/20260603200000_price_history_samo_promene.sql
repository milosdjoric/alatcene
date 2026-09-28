-- price_history je rastao 1 red/proizvod/dan (dnevni snapshot) → 1,48M redova.
-- Dva trigera su upisivala: record_price_history (uvek dnevni) + record_price_change
-- (takođe dnevni zbog "last_date != CURRENT_DATE" uslova).
--
-- Sada: čuvamo red SAMO kad se cena promeni. Grafikon krajnju tačku (danas) dobija
-- iz trenutne products.cena (dodaje je API), pa ne moramo dnevne snapshotove.
-- Rezultat: price_history čuva korake cene umesto dnevnih kopija.

-- 1. Ukloni "uvek dnevni" trigger i njegovu funkciju.
DROP TRIGGER IF EXISTS trg_price_history ON products;
DROP FUNCTION IF EXISTS record_price_history();

-- 2. Zameni record_price_change: upiši samo kad se cena razlikuje od poslednje.
CREATE OR REPLACE FUNCTION public.record_price_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  last_cena INT;
BEGIN
  SELECT cena INTO last_cena
  FROM price_history
  WHERE product_id = NEW.id
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Prvi zapis ili stvarna promena cene → upiši (jedan red po danu max).
  IF last_cena IS NULL OR last_cena <> NEW.cena THEN
    INSERT INTO price_history (product_id, cena, redovna_cena, recorded_at)
    VALUES (NEW.id, NEW.cena, NEW.redovna_cena, CURRENT_DATE)
    ON CONFLICT (product_id, recorded_at)
    DO UPDATE SET cena = EXCLUDED.cena, redovna_cena = EXCLUDED.redovna_cena;
  END IF;

  RETURN NEW;
END;
$function$;

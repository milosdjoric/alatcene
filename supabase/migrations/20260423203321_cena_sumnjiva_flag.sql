-- Flag za sumnjive cene (outlier detekcija nakon matching-a)
-- TRUE ako je cena proizvoda > 3x ili < 1/3 medijane u njegovoj match_key grupi
-- Računa se batch-om u scripts/match-products.js posle match_key izračuna

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cena_sumnjiva BOOLEAN NOT NULL DEFAULT FALSE;

-- Bulk update RPC za flag (analogan bulk_update_match_keys)
CREATE OR REPLACE FUNCTION public.bulk_update_cena_sumnjiva(
  ids integer[],
  flags boolean[]
)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  updated INT := 0;
BEGIN
  FOR i IN 1..array_length(ids, 1) LOOP
    UPDATE products
    SET cena_sumnjiva = flags[i]
    WHERE id = ids[i];
    updated := updated + 1;
  END LOOP;
  RETURN updated;
END;
$function$;

-- Sitemap je radio SELECT match_key FROM products bez paginacije → PostgREST
-- vraća najviše 1000 redova, pa je sitemap imao ~534 od ~15.400 grupa.
-- Sada: jedna grupa po redu, sa stvarnim datumom poslednje izmene.
CREATE OR REPLACE FUNCTION public.get_sitemap_groups()
RETURNS TABLE (match_key text, last_modified timestamptz)
LANGUAGE sql
STABLE
AS $$
  SELECT match_key, max(updated_at)
  FROM products
  WHERE match_key IS NOT NULL
  GROUP BY match_key
  ORDER BY match_key;
$$;

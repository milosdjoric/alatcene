-- Broj proizvoda po prodavnici — jedini izvor za "N prodavnica / M alata" u UI
-- (header, footer, meta tagovi, info stranica). Ranije ručno upisano (17/18/19).
CREATE OR REPLACE FUNCTION public.get_source_counts()
RETURNS TABLE (izvor text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT izvor, count(*) FROM products GROUP BY izvor ORDER BY count(*) DESC;
$$;

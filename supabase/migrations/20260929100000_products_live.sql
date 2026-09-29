-- Posle gašenja scrape-a (03.08–29.09.2026) sajt je 57 dana prikazivao stare
-- cene kao aktuelne (npr. Shoppster 6.999 "na stanju", a stvarno 8.485, nema).
-- stale-cleanup briše samo proizvode prodavnice čiji je scrape USPEO — kad scraper
-- pukne, njegovi proizvodi ostaju sa zamrznutom cenom.
--
-- products_live = proizvodi osveženi u poslednja 3 dana. SVA čitanja za sajt idu
-- preko ovog view-a (pravilo na jednom mestu); products ostaje za upis.
-- Proizvodi prodavnice koja privremeno ne radi se ne prikazuju, ali se ne brišu —
-- istorija cena ostaje i vraća se čim scraper proradi.

CREATE OR REPLACE VIEW public.products_live AS
  SELECT * FROM public.products
  WHERE updated_at > now() - interval '3 days';

CREATE OR REPLACE FUNCTION public.get_brand_counts()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT brend_normalized AS name, COUNT(DISTINCT COALESCE(match_key, 'solo_' || id)) AS count
    FROM products_live
    WHERE brend_normalized IS NOT NULL
    GROUP BY brend_normalized
    ORDER BY count DESC
  ) t;
$function$;

CREATE OR REPLACE FUNCTION public.get_category_counts()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT parent_kategorija AS name, COUNT(DISTINCT COALESCE(match_key, 'solo_' || id)) AS count
    FROM products_live
    WHERE parent_kategorija IS NOT NULL
    GROUP BY parent_kategorija
    ORDER BY count DESC
  ) t;
$function$;

CREATE OR REPLACE FUNCTION public.get_source_counts()
 RETURNS TABLE(izvor text, count bigint)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT izvor, count(*) FROM products_live GROUP BY izvor ORDER BY count(*) DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_sitemap_groups()
 RETURNS TABLE(match_key text, last_modified timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT match_key, max(updated_at)
  FROM products_live
  WHERE match_key IS NOT NULL
  GROUP BY match_key
  ORDER BY match_key;
$function$;

CREATE OR REPLACE FUNCTION public.search_grouped(search_query text DEFAULT NULL::text, filter_brend text DEFAULT NULL::text, filter_izvor text DEFAULT NULL::text, filter_kategorija text DEFAULT NULL::text, filter_dostupnost text DEFAULT NULL::text, filter_cena_min integer DEFAULT NULL::integer, filter_cena_max integer DEFAULT NULL::integer, sort_by text DEFAULT 'cena_asc'::text, page_num integer DEFAULT 1, page_size integer DEFAULT 40)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  total_count INT;
  offset_val INT := (page_num - 1) * page_size;
  search_patterns TEXT[] := public.search_patterns(search_query);
BEGIN
  CREATE TEMP TABLE _filtered ON COMMIT DROP AS
  SELECT
    id,
    COALESCE(match_key, 'solo_' || id) AS group_key,
    match_key,
    naziv,
    brend_normalized,
    extracted_model,
    cena,
    redovna_cena,
    popust_procenat,
    historical_min_cena,
    url,
    izvor,
    dostupnost,
    cena_sumnjiva
  FROM products_live
  WHERE
    (search_patterns IS NULL OR naziv_search LIKE ALL (search_patterns))
    AND (filter_brend IS NULL OR brend_normalized = filter_brend)
    AND (filter_izvor IS NULL OR izvor = filter_izvor)
    AND (filter_kategorija IS NULL OR parent_kategorija = filter_kategorija)
    AND (filter_dostupnost IS NULL OR dostupnost = filter_dostupnost)
    AND (filter_cena_min IS NULL OR cena >= filter_cena_min)
    AND (filter_cena_max IS NULL OR cena <= filter_cena_max);

  SELECT COUNT(DISTINCT group_key) INTO total_count FROM _filtered;

  CREATE TEMP TABLE _groups ON COMMIT DROP AS
  SELECT
    f.group_key,
    MIN(f.match_key) AS match_key,
    MIN(f.brend_normalized) AS brend_normalized,
    MIN(f.extracted_model) AS extracted_model,
    MIN(f.naziv) AS naziv,
    COALESCE(
      MIN(f.cena) FILTER (WHERE f.dostupnost = 'NA_STANJU' AND NOT f.cena_sumnjiva),
      MIN(f.cena) FILTER (WHERE f.dostupnost = 'NA_STANJU'),
      MIN(f.cena)
    ) AS min_cena,
    COALESCE(
      MAX(f.cena) FILTER (WHERE f.dostupnost = 'NA_STANJU' AND NOT f.cena_sumnjiva),
      MAX(f.cena) FILTER (WHERE f.dostupnost = 'NA_STANJU'),
      MAX(f.cena)
    ) AS max_cena,
    COALESCE(
      MAX(f.redovna_cena - f.cena) FILTER (
        WHERE f.redovna_cena IS NOT NULL
          AND f.redovna_cena > f.cena
          AND NOT f.cena_sumnjiva
      ),
      0
    ) AS max_popust,
    COALESCE(
      MAX(f.popust_procenat) FILTER (WHERE NOT f.cena_sumnjiva),
      0
    ) AS max_popust_procenat,
    COUNT(DISTINCT f.izvor) AS num_sources,
    -- Materijalizovano: bez price_history JOIN-a.
    MIN(f.historical_min_cena) AS historical_min_cena
  FROM _filtered f
  GROUP BY f.group_key;

  CREATE TEMP TABLE _sorted_groups ON COMMIT DROP AS
  SELECT * FROM _groups
  ORDER BY
    CASE WHEN sort_by = 'cena_asc' THEN min_cena END ASC NULLS LAST,
    CASE WHEN sort_by = 'cena_desc' THEN min_cena END DESC NULLS LAST,
    CASE WHEN sort_by = 'usteda_desc' THEN max_popust END DESC NULLS LAST,
    CASE WHEN sort_by = 'naziv_asc' THEN naziv END ASC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN group_key END DESC NULLS LAST,
    CASE WHEN sort_by = 'popust_desc' THEN max_popust_procenat END DESC NULLS LAST,
    min_cena ASC NULLS LAST
  LIMIT page_size OFFSET offset_val;

  SELECT json_build_object(
    'groups', COALESCE((
      SELECT json_agg(
        json_build_object(
          'match_key', g.group_key,
          'brend_normalized', g.brend_normalized,
          'extracted_model', g.extracted_model,
          'naziv', g.naziv,
          'min_cena', g.min_cena,
          'max_cena', g.max_cena,
          'max_popust', g.max_popust,
          'max_popust_procenat', g.max_popust_procenat,
          'num_sources', g.num_sources,
          'historical_min_cena', g.historical_min_cena,
          'offers', (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', f.id,
                'izvor', f.izvor,
                'naziv', f.naziv,
                'cena', f.cena,
                'redovna_cena', f.redovna_cena,
                'popust_procenat', f.popust_procenat,
                'url', f.url,
                'dostupnost', f.dostupnost,
                'cena_sumnjiva', f.cena_sumnjiva
              ) ORDER BY
                CASE WHEN f.dostupnost = 'NA_STANJU' AND NOT f.cena_sumnjiva THEN 0
                     WHEN f.dostupnost = 'NA_STANJU' AND f.cena_sumnjiva THEN 1
                     WHEN f.dostupnost = 'RASPRODATO' AND NOT f.cena_sumnjiva THEN 2
                     ELSE 3 END ASC,
                f.cena ASC
            ), '[]'::json)
            FROM _filtered f
            WHERE f.group_key = g.group_key
          )
        )
      )
      FROM _sorted_groups g
    ), '[]'::json),
    'total', total_count,
    'page', page_num,
    'totalPages', CEIL(total_count::float / page_size)
  ) INTO result;

  RETURN result;
END;
$function$;

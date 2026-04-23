-- search_grouped: u agregaciji min_cena / max_cena i u sortiranju ponuda
-- ignoriši ponude sa cena_sumnjiva = TRUE (outlier detekcija u match-products.js).
-- Fallback: ako su SVE ponude sumnjive, koristi sve (da grupa ostane vidljiva).
-- Takođe proširuje _filtered da uključi cena_sumnjiva i propušta ga u offers JSON.

CREATE OR REPLACE FUNCTION public.search_grouped(
  search_query text DEFAULT NULL::text,
  filter_brend text DEFAULT NULL::text,
  filter_izvor text DEFAULT NULL::text,
  filter_kategorija text DEFAULT NULL::text,
  filter_dostupnost text DEFAULT NULL::text,
  filter_cena_min integer DEFAULT NULL::integer,
  filter_cena_max integer DEFAULT NULL::integer,
  sort_by text DEFAULT 'cena_asc'::text,
  page_num integer DEFAULT 1,
  page_size integer DEFAULT 40
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  total_count INT;
  offset_val INT := (page_num - 1) * page_size;
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
    url,
    izvor,
    dostupnost,
    cena_sumnjiva
  FROM products
  WHERE
    (search_query IS NULL OR naziv ILIKE '%' || search_query || '%')
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
    -- Preferiraj: NA_STANJU + nije sumnjiva → NA_STANJU (bilo sumnjiva) → sve
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
    COUNT(DISTINCT f.izvor) AS num_sources,
    MIN(ph.min_hist) AS historical_min_cena
  FROM _filtered f
  LEFT JOIN (
    SELECT product_id, MIN(cena) AS min_hist
    FROM price_history
    GROUP BY product_id
  ) ph ON ph.product_id = f.id
  GROUP BY f.group_key;

  CREATE TEMP TABLE _sorted_groups ON COMMIT DROP AS
  SELECT * FROM _groups
  ORDER BY
    CASE WHEN sort_by = 'cena_asc' THEN min_cena END ASC NULLS LAST,
    CASE WHEN sort_by = 'cena_desc' THEN min_cena END DESC NULLS LAST,
    CASE WHEN sort_by = 'usteda_desc' THEN (max_cena - min_cena) END DESC NULLS LAST,
    CASE WHEN sort_by = 'naziv_asc' THEN naziv END ASC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN group_key END DESC NULLS LAST,
    CASE WHEN sort_by = 'popust_desc' THEN min_cena END ASC NULLS LAST,
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

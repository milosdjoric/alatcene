import { createServerClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants";
import { searchParamsSchema, validateParams } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const raw = Object.fromEntries(searchParams.entries());
  const parsed = validateParams(searchParamsSchema, raw);
  if (!parsed.success) return parsed.error;

  const { q, brend, izvor, dostupnost, cena_min, cena_max, sort, page } =
    parsed.data;
  const limit = PAGE_SIZE;

  const supabase = createServerClient();

  let query = supabase.from("products_live").select("*", { count: "exact" });

  if (q) {
    // Ista normalizacija kao search_grouped (bez kvačica, po rečima, sve reči
    // moraju da postoje) — logika živi samo u SQL funkciji search_patterns.
    const { data: patterns, error: patternsError } = await supabase.rpc(
      "search_patterns",
      { q },
    );
    if (patternsError) {
      return Response.json({ error: patternsError.message }, { status: 500 });
    }
    if (patterns) {
      // likeAllOf spaja šablone zarezom — navodnici da reč sa zarezom ili
      // zagradom ne pokvari PostgREST listu.
      const quoted = (patterns as string[]).map(
        (p) => `"${p.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
      );
      query = query.likeAllOf("naziv_search", quoted);
    }
  }
  if (brend) {
    query = query.eq("brend_normalized", brend);
  }
  if (izvor) {
    query = query.eq("izvor", izvor);
  }
  if (dostupnost) {
    query = query.eq("dostupnost", dostupnost);
  }
  if (cena_min !== undefined) {
    query = query.gte("cena", cena_min);
  }
  if (cena_max !== undefined) {
    query = query.lte("cena", cena_max);
  }

  switch (sort) {
    case "cena_desc":
      query = query.order("cena", { ascending: false });
      break;
    case "popust_desc":
      query = query.order("popust_procenat", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    case "naziv_asc":
      query = query.order("naziv", { ascending: true });
      break;
    case "newest":
      query = query.order("updated_at", { ascending: false });
      break;
    case "usteda_desc":
      // Ušteda = popust po proizvodu (redovna_cena - cena), kolona popust_iznos.
      query = query.order("popust_iznos", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    case "cena_asc":
    default:
      query = query.order("cena", { ascending: true });
      break;
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    products: data,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}

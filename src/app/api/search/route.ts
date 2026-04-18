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

  let query = supabase.from("products").select("*", { count: "exact" });

  if (q) {
    query = query.ilike("naziv", `%${q}%`);
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
      query = query.order("usteda", { ascending: false, nullsFirst: false });
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

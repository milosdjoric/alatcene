import { createServerClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const brend = searchParams.get("brend");
  const izvor = searchParams.get("izvor");
  const dostupnost = searchParams.get("dostupnost");
  const cenaMin = searchParams.get("cena_min");
  const cenaMax = searchParams.get("cena_max");
  const sort = searchParams.get("sort") || "cena_asc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = PAGE_SIZE;

  const supabase = createServerClient();

  let query = supabase
    .from("products")
    .select("*", { count: "exact" });

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
  if (cenaMin) {
    query = query.gte("cena", parseInt(cenaMin));
  }
  if (cenaMax) {
    query = query.lte("cena", parseInt(cenaMax));
  }

  switch (sort) {
    case "cena_desc":
      query = query.order("cena", { ascending: false });
      break;
    case "popust_desc":
      query = query.order("popust_procenat", { ascending: false, nullsFirst: false });
      break;
    case "naziv_asc":
      query = query.order("naziv", { ascending: true });
      break;
    case "newest":
      query = query.order("updated_at", { ascending: false });
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

import { createServerClient } from "@/lib/supabase/server";
import { matchKeySchema, validateParams } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchKey: string }> }
) {
  const { matchKey } = await params;
  const decodedKey = decodeURIComponent(matchKey);

  const parsed = validateParams(matchKeySchema, decodedKey);
  if (!parsed.success) return parsed.error;

  const supabase = createServerClient();

  // Nađi sve product_id-jeve za ovaj match_key
  const { data: products } = await supabase
    .from("products")
    .select("id, izvor")
    .eq("match_key", parsed.data);

  if (!products || products.length === 0) {
    return Response.json([]);
  }

  const productIds = products.map((p) => p.id);
  const izvorMap = Object.fromEntries(products.map((p) => [p.id, p.izvor]));

  // Povuci price history za sve
  const { data: history, error } = await supabase
    .from("price_history")
    .select("product_id, cena, recorded_at")
    .in("product_id", productIds)
    .order("recorded_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Dodaj izvor na svaki zapis
  const result = (history ?? []).map((h) => ({
    ...h,
    izvor: izvorMap[h.product_id],
  }));

  return Response.json(result);
}

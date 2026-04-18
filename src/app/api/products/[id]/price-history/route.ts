import { createServerClient } from "@/lib/supabase/server";
import { productIdSchema, validateParams } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const parsed = validateParams(productIdSchema, id);
  if (!parsed.success) return parsed.error;

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("price_history")
    .select("cena, redovna_cena, recorded_at")
    .eq("product_id", parsed.data)
    .order("recorded_at", { ascending: true })
    .limit(90);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

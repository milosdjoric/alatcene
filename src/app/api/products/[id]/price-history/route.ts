import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("price_history")
    .select("cena, redovna_cena, recorded_at")
    .eq("product_id", id)
    .order("recorded_at", { ascending: true })
    .limit(90);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

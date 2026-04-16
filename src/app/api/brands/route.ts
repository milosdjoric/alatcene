import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("brend_normalized")
    .not("brend_normalized", "is", null)
    .order("brend_normalized");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Distinct + count
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const b = row.brend_normalized;
    counts[b] = (counts[b] || 0) + 1;
  }

  const brands = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return Response.json(brands);
}

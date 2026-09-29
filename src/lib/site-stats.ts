import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export interface SiteStats {
  /** Broj proizvoda po prodavnici (ključ = izvor), sortirano opadajuće. */
  sources: { izvor: string; count: number }[];
  storeCount: number;
  productCount: number;
  /** ISO timestamp poslednjeg ažuriranja bilo kog proizvoda. */
  lastUpdated: string | null;
}

async function fetchSiteStats(): Promise<SiteStats> {
  const supabase = createServerClient();
  const [counts, last] = await Promise.all([
    supabase.rpc("get_source_counts"),
    supabase
      .from("products_live")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single(),
  ]);
  if (counts.error)
    throw new Error(`get_source_counts: ${counts.error.message}`);

  const sources = (counts.data ?? []) as { izvor: string; count: number }[];
  return {
    sources,
    storeCount: sources.length,
    productCount: sources.reduce((sum, s) => sum + Number(s.count), 0),
    lastUpdated: last.data?.updated_at ?? null,
  };
}

// Menja se ~1×/dan (posle scrape-a) — keš 1h, deljen između header-a,
// footer-a, meta tagova i info stranice.
export const getSiteStats = unstable_cache(fetchSiteStats, ["site-stats"], {
  revalidate: 3600,
});

export function formatCount(n: number): string {
  return n.toLocaleString("sr-RS");
}

export function formatDate(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleDateString("sr-RS", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";
}

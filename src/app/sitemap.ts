import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/constants";

// Podaci se menjaju 1×/dan (scrape) — sitemap se ne računa pri svakom zahtevu.
export const revalidate = 86400;

// PostgREST vraća najviše 1000 redova po zahtevu (i za RPC) — čitamo u stranama.
const PAGE = 1000;

async function fetchAllGroups() {
  const supabase = createServerClient();
  const all: { match_key: string; last_modified: string }[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .rpc("get_sitemap_groups")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`get_sitemap_groups: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const groups = await fetchAllGroups();
  const lastUpdate = groups.reduce(
    (max, g) => (g.last_modified > max ? g.last_modified : max),
    "",
  );

  return [
    {
      url: SITE_URL,
      lastModified: lastUpdate || undefined,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/info`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...groups.map((g) => ({
      url: `${SITE_URL}/proizvod/${encodeURIComponent(g.match_key)}`,
      lastModified: g.last_modified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}

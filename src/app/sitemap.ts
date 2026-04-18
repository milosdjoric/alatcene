import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("products")
    .select("match_key")
    .not("match_key", "is", null);

  const uniqueKeys = [...new Set((data ?? []).map((r) => r.match_key))];

  const productUrls: MetadataRoute.Sitemap = uniqueKeys.map((key) => ({
    url: `https://cenealata.in.rs/proizvod/${encodeURIComponent(key)}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    {
      url: "https://cenealata.in.rs",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: "https://cenealata.in.rs/info",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...productUrls,
  ];
}

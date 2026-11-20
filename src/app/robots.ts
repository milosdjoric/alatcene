import type { MetadataRoute } from "next";

// Sajt je privatan (Basic Auth u middleware-u) — ne indeksirati ništa.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}

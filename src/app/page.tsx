import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants";
import type { Product } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import FilterSidebar from "@/components/FilterSidebar";
import ProductGrid from "@/components/ProductGrid";
import SortSelect from "@/components/SortSelect";
import Pagination from "@/components/Pagination";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

async function fetchProducts(params: Record<string, string | undefined>) {
  const supabase = createServerClient();

  const q = params.q?.trim();
  const brend = params.brend;
  const izvor = params.izvor;
  const dostupnost = params.dostupnost;
  const cenaMin = params.cena_min;
  const cenaMax = params.cena_max;
  const sort = params.sort || "cena_asc";
  const page = Math.max(1, parseInt(params.page || "1"));

  let query = supabase.from("products").select("*", { count: "exact" });

  if (q) query = query.ilike("naziv", `%${q}%`);
  if (brend) query = query.eq("brend_normalized", brend);
  if (izvor) query = query.eq("izvor", izvor);
  if (dostupnost) query = query.eq("dostupnost", dostupnost);
  if (cenaMin) query = query.gte("cena", parseInt(cenaMin));
  if (cenaMax) query = query.lte("cena", parseInt(cenaMax));

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
    default:
      query = query.order("cena", { ascending: true });
  }

  const offset = (page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data, count } = await query;

  return {
    products: (data ?? []) as Product[],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  };
}

async function fetchBrands() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("products")
    .select("brend_normalized")
    .not("brend_normalized", "is", null);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const b = row.brend_normalized;
    counts[b] = (counts[b] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const [result, brands] = await Promise.all([
    fetchProducts(params),
    fetchBrands(),
  ]);

  const page = parseInt(params.page || "1");

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center gap-4">
          <a href="/" className="text-xl font-bold text-zinc-900 flex-shrink-0">
            cene<span className="text-blue-600">alata</span>.xyz
          </a>
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="flex gap-6">
          {/* Sidebar */}
          <Suspense>
            <FilterSidebar brands={brands} />
          </Suspense>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <span className="text-sm text-zinc-500">
                {result.total.toLocaleString("sr-RS")} rezultata
              </span>
              <Suspense>
                <SortSelect />
              </Suspense>
            </div>
            <ProductGrid products={result.products} />
            <Suspense>
              <Pagination totalPages={result.totalPages} currentPage={page} />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-zinc-400">
          cenealata.xyz — Poređenje cena alata iz 17 srpskih prodavnica
        </div>
      </footer>
    </>
  );
}

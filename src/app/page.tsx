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
  const q = params.q || "";

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-6">
            <a href="/" className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xl font-bold tracking-tight text-slate-900">cene</span>
              <span className="text-xl font-bold tracking-tight text-blue-600">alata</span>
              <span className="text-sm text-slate-400 font-medium">.xyz</span>
            </a>
            <div className="flex-1 max-w-2xl">
              <Suspense>
                <SearchBar />
              </Suspense>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="bg-slate-100 px-2 py-1 rounded-md font-medium">17 prodavnica</span>
              <span className="bg-slate-100 px-2 py-1 rounded-md font-medium">34k+ alata</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        <div className="lg:flex lg:gap-8">
          {/* Sidebar */}
          <Suspense>
            <FilterSidebar brands={brands} />
          </Suspense>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <div>
                {q && (
                  <h1 className="text-lg font-semibold text-slate-900 mb-0.5">
                    Rezultati za &quot;{q}&quot;
                  </h1>
                )}
                <p className="text-sm text-slate-500">
                  {result.total.toLocaleString("sr-RS")} {result.total === 1 ? "proizvod" : result.total < 5 ? "proizvoda" : "proizvoda"}
                </p>
              </div>
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
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">cenealata.xyz</span>
              <span className="text-slate-400">—</span>
              <span className="text-sm text-slate-500">Poređenje cena alata iz 17 prodavnica</span>
            </div>
            <p className="text-xs text-slate-400">
              Cene se ažuriraju svakog dana u 06:00
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

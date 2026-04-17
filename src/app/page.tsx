import { Suspense } from "react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants";
import type { Product, GroupedSearchResponse } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import FilterSidebar from "@/components/FilterSidebar";
import ActiveFilters from "@/components/ActiveFilters";
import ProductGroupGrid from "@/components/ProductGroupGrid";
import ProductGroupList from "@/components/ProductGroupList";
import SortSelect from "@/components/SortSelect";
import Pagination from "@/components/Pagination";
import ProductCard from "@/components/ProductCard";
import ViewToggle from "@/components/ViewToggle";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

async function fetchGroupedProducts(params: Record<string, string | undefined>): Promise<GroupedSearchResponse> {
  const supabase = createServerClient();

  const { data, error } = await supabase.rpc("search_grouped", {
    search_query: params.q?.trim() || null,
    filter_brend: params.brend || null,
    filter_izvor: params.izvor || null,
    filter_kategorija: params.kategorija || null,
    filter_dostupnost: params.dostupnost || null,
    filter_cena_min: params.cena_min ? parseInt(params.cena_min) : null,
    filter_cena_max: params.cena_max ? parseInt(params.cena_max) : null,
    sort_by: params.sort || "cena_asc",
    page_num: Math.max(1, parseInt(params.page || "1")),
    page_size: PAGE_SIZE,
  });

  if (error) {
    console.error("search_grouped error:", error);
    return { groups: [], total: 0, page: 1, totalPages: 0 };
  }

  return data as GroupedSearchResponse;
}

async function fetchBrands() {
  const supabase = createServerClient();
  const { data } = await supabase.rpc("get_brand_counts");
  return (data ?? []) as { name: string; count: number }[];
}

async function fetchCategories() {
  const supabase = createServerClient();
  const { data } = await supabase.rpc("get_category_counts");
  return (data ?? []) as { name: string; count: number }[];
}

async function fetchTopDeals() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("dostupnost", "NA_STANJU")
    .not("popust_procenat", "is", null)
    .gte("popust_procenat", 15)
    .order("popust_procenat", { ascending: false })
    .limit(8);

  return (data ?? []) as Product[];
}

function hasActiveFilters(params: Record<string, string | undefined>): boolean {
  return !!(params.q || params.brend || params.izvor || params.kategorija || params.dostupnost || params.cena_min || params.cena_max || params.sort || params.page);
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const isLanding = !hasActiveFilters(params);

  const [result, brands, categories, topDeals] = await Promise.all([
    fetchGroupedProducts(params),
    fetchBrands(),
    fetchCategories(),
    isLanding ? fetchTopDeals() : Promise.resolve([]),
  ]);

  const page = parseInt(params.page || "1");
  const q = params.q || "";
  const view = params.prikaz || "lista";

  return (
    <>
      {/* Header — floating glassmorphism */}
      <div className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 pt-3">
        <header className="max-w-[1400px] mx-auto bg-[#16181d]/80 backdrop-blur-xl border border-[#2a2d35]/60 rounded-lg shadow-lg shadow-black/20">
          <div className="flex items-center h-12 px-4 gap-4">
            <a href="/" className="flex items-center gap-0.5 flex-shrink-0">
              <span className="text-lg font-bold tracking-tight text-[#e0e2e7]">cene</span>
              <span className="text-lg font-bold tracking-tight text-[#c8e64a]">alata</span>
              <span className="text-[10px] text-[#555963] font-normal ml-0.5">.xyz</span>
            </a>

            {!isLanding && (
              <div className="flex-1 max-w-2xl">
                <Suspense>
                  <SearchBar />
                </Suspense>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#555963] ml-auto">
              <span><span className="text-[#8b8f9a]">19</span> prod.</span>
              <span className="w-px h-3 bg-[#2a2d35]" />
              <span><span className="text-[#8b8f9a]">{result.total.toLocaleString("sr-RS")}</span> alata</span>
            </div>

            <Link href="/info" className="text-[11px] text-[#555963] hover:text-[#c8e64a] transition-colors">
              info
            </Link>
          </div>
        </header>
      </div>

      {/* Hero — samo na landing-u */}
      {isLanding && (
        <section className="border-b border-[#2a2d35]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="max-w-2xl mx-auto text-center mb-10">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                <span className="text-[#e0e2e7]">Pronađi </span>
                <span className="text-[#c8e64a]">najbolju cenu</span>
              </h1>
              <p className="text-[#8b8f9a] text-lg">
                19 prodavnica. 34.000+ alata. Jedno mesto.
              </p>
            </div>
            <div className="max-w-xl mx-auto mb-12">
              <Suspense>
                <SearchBar />
              </Suspense>
            </div>

            {/* Kategorije */}
            {categories.length > 0 && (
              <div className="max-w-3xl mx-auto">
                <div className="flex flex-wrap justify-center gap-2">
                  {categories.slice(0, 12).map((cat) => (
                    <Link
                      key={cat.name}
                      href={`/?kategorija=${encodeURIComponent(cat.name)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-none bg-[#16181d] border border-[#2a2d35] hover:border-[#c8e64a] text-sm text-[#8b8f9a] hover:text-[#c8e64a] transition-colors cursor-pointer"
                    >
                      {cat.name}
                      <span className="text-xs text-[#555963]">{cat.count.toLocaleString("sr-RS")}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Top popusti — samo na landing-u */}
      {isLanding && topDeals.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-[#e0e2e7] uppercase tracking-wider">Najveći popusti</h2>
            <Link
              href="/?sort=popust_desc&dostupnost=NA_STANJU"
              className="text-sm text-[#c8e64a] hover:text-[#a8c230] font-medium transition-colors"
            >
              Prikaži sve →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topDeals.map((product) => (
              <ProductCard key={`deal-${product.id}`} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Main — pretraga/filteri */}
      {!isLanding && (
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
          <div className="lg:flex lg:gap-6">
            {/* Sidebar */}
            <Suspense>
              <FilterSidebar brands={brands} categories={categories} />
            </Suspense>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Aktivni filteri */}
              <Suspense>
                <ActiveFilters />
              </Suspense>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3 sm:gap-4">
                <div>
                  {q && (
                    <h1 className="text-base font-bold text-[#e0e2e7] mb-0.5">
                      &quot;{q}&quot;
                    </h1>
                  )}
                  <p className="text-sm text-[#555963]">
                    {result.total.toLocaleString("sr-RS")} rezultata
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Suspense>
                    <ViewToggle />
                  </Suspense>
                  <Suspense>
                    <SortSelect />
                  </Suspense>
                </div>
              </div>

              {view === "lista" ? (
                <ProductGroupList groups={result.groups} />
              ) : (
                <ProductGroupGrid groups={result.groups} />
              )}

              <Suspense>
                <Pagination totalPages={result.totalPages} currentPage={page} />
              </Suspense>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-[#2a2d35] mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#8b8f9a]">cenealata.xyz</span>
              <span className="text-[#2a2d35]">/</span>
              <span className="text-[#555963]">19 prodavnica</span>
              <span className="text-[#2a2d35]">/</span>
              <Link href="/info" className="text-[#555963] hover:text-[#c8e64a] transition-colors">
                info
              </Link>
            </div>
            <p className="text-xs text-[#555963]">
              ažurirano svaki dan // 06:00
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

import { Suspense } from "react";
import { unstable_cache } from "next/cache";
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

async function fetchLastUpdated(): Promise<string | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("products")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  return data?.updated_at ?? null;
}

async function fetchTotalCount(): Promise<number> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
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

// Brendovi, kategorije i ukupan broj menjaju se ~1×/dan (posle scrape-a) a upiti
// su spori — keširamo na 1h umesto da ih računamo pri svakom otvaranju.
const getCachedBrands = unstable_cache(fetchBrands, ["brand-counts"], { revalidate: 3600 });
const getCachedCategories = unstable_cache(fetchCategories, ["category-counts"], { revalidate: 3600 });
const getCachedTotalCount = unstable_cache(fetchTotalCount, ["total-count"], { revalidate: 3600 });

function hasActiveFilters(params: Record<string, string | undefined>): boolean {
  return !!(params.q || params.brend || params.izvor || params.kategorija || params.dostupnost || params.cena_min || params.cena_max || params.sort || params.page);
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const isLanding = !hasActiveFilters(params);

  const emptyResult: GroupedSearchResponse = { groups: [], total: 0, page: 1, totalPages: 0 };
  const [result, brands, categories, topDeals, lastUpdated, totalCount] = await Promise.all([
    // Na landing-u ne zovemo skupi search_grouped RPC (timeout-uje) — landing
    // koristi samo brendove/kategorije/popuste.
    isLanding ? Promise.resolve(emptyResult) : fetchGroupedProducts(params),
    getCachedBrands(),
    getCachedCategories(),
    isLanding ? fetchTopDeals() : Promise.resolve([]),
    fetchLastUpdated(),
    getCachedTotalCount(),
  ]);

  const page = parseInt(params.page || "1");
  const q = params.q || "";
  const view = params.prikaz || "lista";

  return (
    <>
      {/* Header — floating glassmorphism */}
      <div className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 pt-3">
        <header className="max-w-[1400px] mx-auto bg-surface/80 backdrop-blur-xl border border-border/60 rounded-lg shadow-lg shadow-black/20">
          <div className="flex items-center h-12 px-4 gap-4">
            <a href="/" className="flex items-center gap-0.5 flex-shrink-0">
              <span className="text-lg font-bold tracking-tight text-accent">cene</span><span className="text-lg font-light tracking-tight text-foreground">alata</span><span className="text-xs text-subtle font-normal ml-0.5">.in.rs</span>
            </a>

            {!isLanding && (
              <div className="flex-1 max-w-2xl">
                <Suspense>
                  <SearchBar />
                </Suspense>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-3 text-[11px] text-subtle ml-auto">
              <span><span className="text-muted">19</span> prod.</span>
              <span className="w-px h-3 bg-border" />
              <span><span className="text-muted">{totalCount.toLocaleString("sr-RS")}</span> alata</span>
            </div>

            <Link href="/info" className="text-[11px] text-subtle hover:text-accent transition-colors">
              info
            </Link>
          </div>
        </header>
      </div>

      {/* ===== LANDING ===== */}
      {isLanding && (
        <>
          {/* Hero */}
          <section className="border-b border-border bg-surface">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
              <div className="max-w-2xl mx-auto text-center mb-8">
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
                  <span className="text-foreground">Uporedi cene alata, </span>
                  <span className="text-accent">nađi najnižu</span>
                </h1>
                <p className="text-muted text-base sm:text-lg">
                  Svi alati iz 18 prodavnica na jednom mestu — sa istorijom cena.
                </p>
              </div>
              <div className="max-w-xl mx-auto">
                <Suspense>
                  <SearchBar />
                </Suspense>
              </div>
            </div>
          </section>

          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Dva sveta */}
            <section className="py-10">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto">
                <Link
                  href="/?kategorija=Akumulatorski%20alati&sort=popust_desc"
                  className="group rounded-xl border border-border bg-surface p-5 sm:p-8 hover:border-accent hover:shadow-md transition-all"
                >
                  <div className="text-3xl sm:text-4xl mb-3">🔋</div>
                  <div className="text-base sm:text-lg font-bold text-foreground">Akumulatorski alati</div>
                  <div className="text-xs sm:text-sm text-muted mt-1">Bušilice, brusilice, testere…</div>
                  <div className="mt-3 text-sm font-medium text-accent">Pogledaj →</div>
                </Link>
                <Link
                  href="/?kategorija=Električni%20alati&sort=popust_desc"
                  className="group rounded-xl border border-border bg-surface p-5 sm:p-8 hover:border-accent hover:shadow-md transition-all"
                >
                  <div className="text-3xl sm:text-4xl mb-3">🔌</div>
                  <div className="text-base sm:text-lg font-bold text-foreground">Električni alati</div>
                  <div className="text-xs sm:text-sm text-muted mt-1">220V mašine za radionicu</div>
                  <div className="mt-3 text-sm font-medium text-accent">Pogledaj →</div>
                </Link>
              </div>
            </section>

            {/* Brendovi */}
            {brands.length > 0 && (
              <section className="py-6">
                <h2 className="text-xs font-bold text-subtle uppercase tracking-wider mb-3">Po brendu</h2>
                <div className="flex flex-wrap gap-2">
                  {brands.slice(0, 10).map((b) => (
                    <Link
                      key={b.name}
                      href={`/?brend=${encodeURIComponent(b.name)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border hover:border-accent text-sm font-medium text-foreground hover:text-accent transition-colors"
                    >
                      {b.name}
                      <span className="text-xs text-subtle">{b.count.toLocaleString("sr-RS")}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Kategorije */}
            {categories.length > 0 && (
              <section className="py-6">
                <h2 className="text-xs font-bold text-subtle uppercase tracking-wider mb-3">Kategorije</h2>
                <div className="flex flex-wrap gap-2">
                  {categories.slice(0, 16).map((cat) => (
                    <Link
                      key={cat.name}
                      href={`/?kategorija=${encodeURIComponent(cat.name)}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border hover:border-accent text-sm text-muted hover:text-accent transition-colors"
                    >
                      {cat.name}
                      <span className="text-xs text-subtle">{cat.count.toLocaleString("sr-RS")}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Najveći popusti */}
            {topDeals.length > 0 && (
              <section className="py-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-foreground">🔥 Najveći popusti</h2>
                  <Link
                    href="/?sort=popust_desc&dostupnost=NA_STANJU"
                    className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
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
          </div>
        </>
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
                    <h1 className="text-base font-bold text-foreground mb-0.5">
                      &quot;{q}&quot;
                    </h1>
                  )}
                  <p className="text-sm text-subtle">
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
      <footer className="border-t border-border mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">cenealata.in.rs</span>
              <span className="text-border">/</span>
              <span className="text-subtle">19 prodavnica</span>
              <span className="text-border">/</span>
              <Link href="/info" className="text-subtle hover:text-accent transition-colors">
                info
              </Link>
            </div>
            <p className="text-xs text-subtle">
              cene ažurirane {lastUpdated
                ? new Date(lastUpdated).toLocaleDateString("sr-RS", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

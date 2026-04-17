import { Suspense } from "react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/constants";
import type { Product } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import FilterSidebar from "@/components/FilterSidebar";
import ActiveFilters from "@/components/ActiveFilters";
import ProductGrid from "@/components/ProductGrid";
import SortSelect from "@/components/SortSelect";
import Pagination from "@/components/Pagination";
import ProductCard from "@/components/ProductCard";
import ProductList from "@/components/ProductList";
import ViewToggle from "@/components/ViewToggle";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

async function fetchProducts(params: Record<string, string | undefined>) {
  const supabase = createServerClient();

  const q = params.q?.trim();
  const brend = params.brend;
  const izvor = params.izvor;
  const kategorija = params.kategorija;
  const dostupnost = params.dostupnost;
  const cenaMin = params.cena_min;
  const cenaMax = params.cena_max;
  const sort = params.sort || "cena_asc";
  const page = Math.max(1, parseInt(params.page || "1"));

  let query = supabase.from("products").select("*", { count: "exact" });

  if (q) query = query.ilike("naziv", `%${q}%`);
  if (brend) query = query.eq("brend_normalized", brend);
  if (izvor) query = query.eq("izvor", izvor);
  if (kategorija) query = query.eq("parent_kategorija", kategorija);
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

async function fetchCategories() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("products")
    .select("parent_kategorija")
    .not("parent_kategorija", "is", null);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const k = row.parent_kategorija;
    counts[k] = (counts[k] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
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
    fetchProducts(params),
    fetchBrands(),
    fetchCategories(),
    isLanding ? fetchTopDeals() : Promise.resolve([]),
  ]);

  const page = parseInt(params.page || "1");
  const q = params.q || "";
  const view = params.prikaz || "grid";

  return (
    <>
      {/* Header */}
      <header className="bg-[#16181d] border-b border-[#2a2d35] sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-6">
            <a href="/" className="flex items-center gap-0.5 flex-shrink-0">
              <span className="text-lg font-bold tracking-tight text-[#e0e2e7]">cene</span>
              <span className="text-lg font-bold tracking-tight text-[#c8e64a]">alata</span>
              <span className="text-xs text-[#555963] font-normal ml-0.5">.xyz</span>
            </a>
            {!isLanding && (
              <div className="flex-1 max-w-2xl">
                <Suspense>
                  <SearchBar />
                </Suspense>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-3 text-xs text-[#8b8f9a] ml-auto">
              <span>17 prodavnica</span>
              <span className="text-[#2a2d35]">/</span>
              <span>34k+ alata</span>
            </div>
          </div>
        </div>
      </header>

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
                17 prodavnica. 34.000+ alata. Jedno mesto.
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
              <div className="flex items-center justify-between mb-5 gap-4">
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
                <ProductList products={result.products} />
              ) : (
                <ProductGrid products={result.products} />
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
              <span className="text-[#555963]">17 prodavnica</span>
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

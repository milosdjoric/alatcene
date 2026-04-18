import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import SourceBadge from "@/components/SourceBadge";
import PriceChart from "@/components/PriceChart";
import { SOURCES } from "@/lib/constants";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("sr-RS").format(price);
}

interface PageProps {
  params: Promise<{ matchKey: string }>;
}

export default async function ProductComparePage({ params }: PageProps) {
  const { matchKey } = await params;
  const decodedKey = decodeURIComponent(matchKey);

  const supabase = createServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("match_key", decodedKey)
    .order("cena", { ascending: true });

  const products = (data ?? []) as Product[];

  // Istorijski minimum
  const productIds = (data ?? []).map((p: { id: number }) => p.id);
  const { data: histMin } = productIds.length > 0
    ? await supabase
        .from("price_history")
        .select("cena")
        .in("product_id", productIds)
        .order("cena", { ascending: true })
        .limit(1)
    : { data: null };
  const historicalMin = histMin?.[0]?.cena ?? null;

  if (products.length === 0) {
    return (
      <>
        <header className="bg-[#16181d] border-b border-[#2a2d35] sticky top-0 z-40">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-14 gap-3">
              <Link href="/" className="flex items-center gap-0.5">
                <span className="text-lg font-bold tracking-tight text-[#e0e2e7]">cene</span>
                <span className="text-lg font-bold tracking-tight text-[#c8e64a]">alata</span>
                <span className="text-xs text-[#555963] font-normal ml-0.5">.xyz</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-[#8b8f9a]">Proizvod nije pronađen.</p>
          <Link href="/" className="text-[#c8e64a] hover:underline mt-4 inline-block">
            &larr; Nazad na pretragu
          </Link>
        </main>
      </>
    );
  }

  const best = products[0];
  const worst = products[products.length - 1];
  const brand = best.brend_normalized;
  const savings = products.length > 1 ? worst.cena - best.cena : 0;

  return (
    <>
      {/* Header */}
      <header className="bg-[#16181d] border-b border-[#2a2d35] sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-3">
            <Link href="/" className="flex items-center gap-0.5 flex-shrink-0">
              <span className="text-lg font-bold tracking-tight text-[#c8e64a]">cene</span><span className="text-lg font-light tracking-tight text-[#e0e2e7]">alata</span>
            </Link>
            <span className="text-[#2a2d35] mx-2">/</span>
            <span className="text-sm text-[#8b8f9a] truncate">{best.naziv}</span>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Nazad */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#555963] hover:text-[#c8e64a] transition-colors mb-6"
        >
          &larr; Nazad na pretragu
        </Link>

        {/* Zaglavlje proizvoda */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-[#e0e2e7] mb-2">
            {best.naziv}
          </h1>
          <div className="flex items-center gap-3 text-sm text-[#555963]">
            {brand && <span>{brand}</span>}
            <span>u {products.length} {products.length === 1 ? "prodavnici" : products.length < 5 ? "prodavnice" : "prodavnica"}</span>
          </div>
        </div>

        {/* Sumarni blok */}
        {products.length > 1 && (
          <div className={`grid gap-3 mb-8 ${historicalMin != null ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
            <div className="bg-[#16181d] border border-[#2a2d35] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#555963] mb-1">Najniža cena</p>
              <p className="text-xl font-bold text-[#c8e64a]">{formatPrice(best.cena)} <span className="text-xs font-normal text-[#555963]">RSD</span></p>
            </div>
            <div className="bg-[#16181d] border border-[#2a2d35] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#555963] mb-1">Najviša cena</p>
              <p className="text-xl font-bold text-[#e0e2e7]">{formatPrice(worst.cena)} <span className="text-xs font-normal text-[#555963]">RSD</span></p>
            </div>
            <div className="bg-[#16181d] border border-[#2a2d35] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#555963] mb-1">Ušteda</p>
              <p className="text-xl font-bold text-[#c8e64a]">{formatPrice(savings)} <span className="text-xs font-normal text-[#555963]">RSD</span></p>
            </div>
            {historicalMin != null && (
              <div className="bg-[#16181d] border border-[#2a2d35] p-4">
                <p className="text-[10px] uppercase tracking-wider text-[#555963] mb-1">Istorijski min</p>
                <p className="text-xl font-bold text-[#0ea5e9]">{formatPrice(historicalMin)} <span className="text-xs font-normal text-[#555963]">RSD</span></p>
              </div>
            )}
          </div>
        )}

        {/* Grafikon kretanja cena */}
        <div className="mb-8">
          <PriceChart matchKey={decodedKey} />
        </div>

        {/* Tabela ponuda */}
        <div className="bg-[#16181d] border border-[#2a2d35]">
          <div className="px-4 py-3 border-b border-[#2a2d35]">
            <h2 className="text-sm font-bold text-[#e0e2e7] uppercase tracking-wider">Ponude</h2>
          </div>

          <div className="divide-y divide-[#2a2d35]">
            {products.map((product, i) => {
              const sourceInfo = SOURCES[product.izvor];
              const isFirst = i === 0;
              const outOfStock = product.dostupnost === "RASPRODATO";

              return (
                <a
                  key={product.id}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-[#1a1c22] transition-colors ${outOfStock ? "opacity-40" : ""}`}
                >
                  {/* Rang */}
                  <span className={`text-sm font-bold w-6 text-center flex-shrink-0 ${isFirst ? "text-[#c8e64a]" : "text-[#555963]"}`}>
                    {i + 1}.
                  </span>

                  {/* Prodavnica */}
                  <div className="flex-1 min-w-0">
                    <SourceBadge izvor={product.izvor} />
                    {sourceInfo && (
                      <span className="text-[10px] text-[#555963] ml-2">{sourceInfo.url}</span>
                    )}
                  </div>

                  {/* Popust */}
                  {product.popust_procenat && product.popust_procenat >= 5 && (
                    <span className="text-[11px] font-bold text-[#c8e64a] flex-shrink-0">
                      -{product.popust_procenat}%
                    </span>
                  )}

                  {/* Stara cena */}
                  {product.redovna_cena && product.redovna_cena > product.cena && (
                    <span className="text-xs text-[#555963] line-through flex-shrink-0">
                      {formatPrice(product.redovna_cena)}
                    </span>
                  )}

                  {/* Cena */}
                  <span className={`text-base font-bold flex-shrink-0 ${isFirst ? "text-[#c8e64a]" : "text-[#e0e2e7]"}`}>
                    {formatPrice(product.cena)} <span className="text-xs font-normal text-[#555963]">RSD</span>
                  </span>

                  {/* Dostupnost */}
                  {outOfStock && (
                    <span className="text-[10px] uppercase tracking-wider text-[#555963] flex-shrink-0">rasprodato</span>
                  )}

                  {/* Arrow */}
                  <span className="text-[#555963] flex-shrink-0">&rarr;</span>
                </a>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2d35] mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[#8b8f9a]">cenealata.xyz</span>
              <span className="text-[#2a2d35]">/</span>
              <span className="text-xs text-[#555963]">
                cene ažurirane {products.length > 0
                  ? new Date(
                      products.reduce((latest, p) => p.updated_at > latest ? p.updated_at : latest, products[0].updated_at)
                    ).toLocaleDateString("sr-RS", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </span>
            </div>
            <Link href="/info" className="text-[#555963] hover:text-[#c8e64a] transition-colors">
              info
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

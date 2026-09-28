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
    .order("dostupnost", { ascending: true })
    .order("cena_sumnjiva", { ascending: true })
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
        <header className="bg-surface border-b border-border sticky top-0 z-40">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-14 gap-3">
              <Link href="/" className="flex items-center gap-0.5">
                <span className="text-lg font-bold tracking-tight text-foreground">cene</span>
                <span className="text-lg font-bold tracking-tight text-accent">alata</span>
                <span className="text-xs text-subtle font-normal ml-0.5">.in.rs</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-muted">Proizvod nije pronađen.</p>
          <Link href="/" className="text-accent hover:underline mt-4 inline-block">
            &larr; Nazad na pretragu
          </Link>
        </main>
      </>
    );
  }

  const best = products[0];
  const brand = best.brend_normalized;
  const trusted = products.filter((p) => !p.cena_sumnjiva);
  const bestTrusted = trusted[0] ?? best;
  const worstTrusted = trusted[trusted.length - 1] ?? products[products.length - 1];
  // Ušteda = najveći akcijski popust (redovna − akcijska cena) među ponudama,
  // NE raspon cena između prodavnica. Realna ušteda je popust na jednom proizvodu.
  const savings = trusted.reduce(
    (max, p) =>
      p.redovna_cena && p.redovna_cena > p.cena
        ? Math.max(max, p.redovna_cena - p.cena)
        : max,
    0
  );

  return (
    <>
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-3">
            <Link href="/" className="flex items-center gap-0.5 flex-shrink-0">
              <span className="text-lg font-bold tracking-tight text-accent">cene</span><span className="text-lg font-light tracking-tight text-foreground">alata</span>
            </Link>
            <span className="text-border mx-2">/</span>
            <span className="text-sm text-muted truncate">{best.naziv}</span>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Nazad */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-accent transition-colors mb-6"
        >
          &larr; Nazad na pretragu
        </Link>

        {/* Zaglavlje proizvoda */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
            {best.naziv}
          </h1>
          <div className="flex items-center gap-3 text-sm text-subtle">
            {brand && <span>{brand}</span>}
            <span>u {products.length} {products.length === 1 ? "prodavnici" : products.length < 5 ? "prodavnice" : "prodavnica"}</span>
          </div>
        </div>

        {/* Sumarni blok */}
        {products.length > 1 && (
          <div className={`grid gap-3 mb-8 ${historicalMin != null ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
            <div className="bg-surface border border-border p-4">
              <p className="text-[10px] uppercase tracking-wider text-subtle mb-1">Najniža cena</p>
              <p className="text-xl font-bold text-accent">{formatPrice(bestTrusted.cena)} <span className="text-xs font-normal text-subtle">RSD</span></p>
            </div>
            <div className="bg-surface border border-border p-4">
              <p className="text-[10px] uppercase tracking-wider text-subtle mb-1">Najviša cena</p>
              <p className="text-xl font-bold text-foreground">{formatPrice(worstTrusted.cena)} <span className="text-xs font-normal text-subtle">RSD</span></p>
            </div>
            <div className="bg-surface border border-border p-4">
              <p className="text-[10px] uppercase tracking-wider text-subtle mb-1">Ušteda</p>
              {savings > 0 ? (
                <p className="text-xl font-bold text-accent">{formatPrice(savings)} <span className="text-xs font-normal text-subtle">RSD</span></p>
              ) : (
                <p className="text-xl font-bold text-subtle">&mdash;</p>
              )}
            </div>
            {historicalMin != null && (
              <div className="bg-surface border border-border p-4">
                <p className="text-[10px] uppercase tracking-wider text-subtle mb-1">Istorijski min</p>
                <p className="text-xl font-bold text-[#0ea5e9]">{formatPrice(historicalMin)} <span className="text-xs font-normal text-subtle">RSD</span></p>
              </div>
            )}
          </div>
        )}

        {/* Grafikon kretanja cena */}
        <div className="mb-8">
          <PriceChart matchKey={decodedKey} />
        </div>

        {/* Tabela ponuda */}
        <div className="bg-surface border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Ponude</h2>
          </div>

          <div className="divide-y divide-border">
            {products.map((product, i) => {
              const sourceInfo = SOURCES[product.izvor];
              const isFirst = i === 0 && !product.cena_sumnjiva;
              const outOfStock = product.dostupnost === "RASPRODATO";
              const suspicious = product.cena_sumnjiva;

              return (
                <a
                  key={product.id}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-surface transition-colors ${outOfStock ? "opacity-40" : ""}`}
                >
                  {/* Rang */}
                  <span className={`text-sm font-bold w-6 text-center flex-shrink-0 ${isFirst ? "text-accent" : "text-subtle"}`}>
                    {i + 1}.
                  </span>

                  {/* Prodavnica */}
                  <div className="flex-1 min-w-0">
                    <SourceBadge izvor={product.izvor} />
                    {sourceInfo && (
                      <span className="text-[10px] text-subtle ml-2">{sourceInfo.url}</span>
                    )}
                  </div>

                  {suspicious ? (
                    /* Sentinel/sumnjiva cena — lažan broj se ne prikazuje;
                       uputi korisnika da proveri pravu cenu kod prodavnice */
                    <span
                      className="text-sm font-medium text-muted flex-shrink-0"
                      title="Cena na ovom sajtu izgleda kao greška ili placeholder — proveri direktno kod prodavnice"
                    >
                      Proveri cenu
                    </span>
                  ) : (
                    <>
                      {/* Popust */}
                      {product.popust_procenat && product.popust_procenat >= 5 && (
                        <span className="text-[11px] font-bold text-accent flex-shrink-0">
                          -{product.popust_procenat}%
                        </span>
                      )}

                      {/* Stara cena */}
                      {product.redovna_cena && product.redovna_cena > product.cena && (
                        <span className="text-xs text-subtle line-through flex-shrink-0">
                          {formatPrice(product.redovna_cena)}
                        </span>
                      )}

                      {/* Cena */}
                      <span className={`text-base font-bold flex-shrink-0 ${isFirst ? "text-accent" : "text-foreground"}`}>
                        {formatPrice(product.cena)} <span className="text-xs font-normal text-subtle">RSD</span>
                      </span>
                    </>
                  )}

                  {/* Dostupnost */}
                  {outOfStock && (
                    <span className="text-[10px] uppercase tracking-wider text-subtle flex-shrink-0">rasprodato</span>
                  )}

                  {/* Arrow */}
                  <span className="text-subtle flex-shrink-0">&rarr;</span>
                </a>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted">cenealata.in.rs</span>
              <span className="text-border">/</span>
              <span className="text-xs text-subtle">
                cene ažurirane {products.length > 0
                  ? new Date(
                      products.reduce((latest, p) => p.updated_at > latest ? p.updated_at : latest, products[0].updated_at)
                    ).toLocaleDateString("sr-RS", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </span>
            </div>
            <Link href="/info" className="text-subtle hover:text-accent transition-colors">
              info
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SourceBadge from "@/components/SourceBadge";
import PriceChart from "@/components/PriceChart";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { SITE_URL, SOURCES } from "@/lib/constants";
import { getProductGroup, formatPrice } from "@/lib/product-group";
import type { Product } from "@/lib/types";

interface PageProps {
  params: Promise<{ matchKey: string }>;
}

function storesLabel(n: number): string {
  return n === 1 ? "prodavnici" : n < 5 ? "prodavnice" : "prodavnica";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { matchKey } = await params;
  const decodedKey = decodeURIComponent(matchKey);
  const { products, trusted } = await getProductGroup(decodedKey);
  // Zbog root loading.tsx odgovor se strimuje sa statusom 200 — notFound()
  // tada ubacuje <meta name="robots" content="noindex">, pa Google ne indeksira
  // nepostojeće proizvode (umesto prazne stranice sa "index, follow").
  if (products.length === 0) notFound();

  const best = trusted[0] ?? products[0];
  const n = products.length;
  const title = `${best.naziv} — cena od ${formatPrice(best.cena)} RSD`;
  const description =
    n > 1
      ? `Uporedi cene: ${best.naziv} u ${n} ${storesLabel(n)}, od ${formatPrice(best.cena)} RSD. Istorija cena i najniža ponuda na jednom mestu.`
      : `${best.naziv} — ${formatPrice(best.cena)} RSD. Istorija cena i praćenje popusta.`;
  const url = `${SITE_URL}/proizvod/${encodeURIComponent(decodedKey)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    // openGraph stranice zamenjuje layout-ov u celosti — slika mora eksplicitno.
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "cenealata.in.rs",
      locale: "sr_RS",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
  };
}

// schema.org Product + AggregateOffer — Google može da prikaže raspon cena
// i broj prodavnica u rezultatima pretrage.
function productJsonLd(products: Product[], trusted: Product[], url: string) {
  const offers = trusted.length > 0 ? trusted : products;
  const prices = offers.map((p) => p.cena);
  const inStock = offers.some((p) => p.dostupnost === "NA_STANJU");
  const best = offers[0];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: best.naziv,
    ...(best.brend_normalized && { brand: { "@type": "Brand", name: best.brend_normalized } }),
    ...(best.kategorija && { category: best.kategorija }),
    url,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "RSD",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: offers.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}

export default async function ProductComparePage({ params }: PageProps) {
  const { matchKey } = await params;
  const decodedKey = decodeURIComponent(matchKey);
  const { products, trusted, historicalMin } = await getProductGroup(decodedKey);

  if (products.length === 0) notFound();

  const best = products[0];
  const brand = best.brend_normalized;
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

  const jsonLd = productJsonLd(products, trusted, `${SITE_URL}/proizvod/${encodeURIComponent(decodedKey)}`);

  return (
    <>
      <script
        type="application/ld+json"
        // < escape-ovan da naziv proizvoda ne može da zatvori <script> tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader showSearch />

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
            <span>u {products.length} {storesLabel(products.length)}</span>
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

      <SiteFooter />
    </>
  );
}

import Link from "next/link";
import type { ProductGroup } from "@/lib/types";
import SourceBadge from "./SourceBadge";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("sr-RS").format(price);
}

export default function ProductGroupCard({ group }: { group: ProductGroup }) {
  const isSolo = group.num_sources === 1;
  const bestOffer = group.offers[0]; // offers are sorted by cena ASC
  const hasMultiplePrices = group.min_cena !== group.max_cena;

  // Solo proizvod — link na spoljni sajt
  if (isSolo && bestOffer) {
    return (
      <a
        href={bestOffer.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex flex-col bg-surface border border-border p-4 transition-all duration-200 hover:border-accent/40 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <SourceBadge izvor={bestOffer.izvor} />
          {bestOffer.dostupnost === "RASPRODATO" && (
            <span className="text-[11px] uppercase tracking-wider text-subtle">rasprodato</span>
          )}
        </div>

        <h3 className="text-[14px] leading-snug font-medium text-muted line-clamp-2 mb-2 group-hover:text-foreground transition-colors min-h-[2.5rem]">
          {group.naziv}
        </h3>

        {group.brend_normalized && (
          <span className="text-xs text-subtle mb-3">{group.brend_normalized}</span>
        )}

        <div className="mt-auto pt-3 border-t border-border">
          <span className={`text-xl font-bold tracking-tight ${bestOffer.cena_sumnjiva ? "text-warning" : "text-foreground"}`}>
            {formatPrice(group.min_cena)}
            <span className="text-xs font-normal text-subtle ml-1">RSD</span>
          </span>
          {bestOffer.cena_sumnjiva && (
            <div className="text-[11px] text-warning mt-0.5" title="Cena izgleda kao greška">moguća greška?</div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity bg-accent-bright/10 py-1.5">
          <span>Pogledaj &rarr;</span>
        </div>
      </a>
    );
  }

  // Grupisani proizvod — link na stranicu za poređenje
  return (
    <Link
      href={`/proizvod/${encodeURIComponent(group.match_key)}`}
      className="group relative flex flex-col bg-surface border border-border p-4 transition-all duration-200 hover:border-accent/40 cursor-pointer"
    >
      {/* Badge — broj prodavnica */}
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase bg-accent-bright/15 text-accent">
          {group.num_sources} {group.num_sources === 1 ? "prodavnica" : group.num_sources < 5 ? "prodavnice" : "prodavnica"}
        </span>
      </div>

      {/* Naziv */}
      <h3 className="text-[14px] leading-snug font-medium text-muted line-clamp-2 mb-2 group-hover:text-foreground transition-colors min-h-[2.5rem]">
        {group.naziv}
      </h3>

      {/* Brend */}
      {group.brend_normalized && (
        <span className="text-xs text-subtle mb-3">{group.brend_normalized}</span>
      )}

      {/* Cene */}
      <div className="mt-auto pt-3 border-t border-border">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-xl font-bold tracking-tight ${bestOffer?.cena_sumnjiva ? "text-warning" : "text-accent"}`}>
            {formatPrice(group.min_cena)}
            <span className="text-xs font-normal text-subtle ml-1">RSD</span>
          </span>
          {hasMultiplePrices && !bestOffer?.cena_sumnjiva && (
            <span className="text-xs text-subtle">
              — {formatPrice(group.max_cena)} RSD
            </span>
          )}
        </div>
        {bestOffer?.cena_sumnjiva && (
          <div className="text-[11px] text-warning mt-0.5" title="Cena izgleda kao greška">moguća greška?</div>
        )}
      </div>

      {/* Istorijski minimum */}
      {group.historical_min_cena != null && (
        <div className="mt-2 text-[12px] text-subtle">
          Istorijski najniža: <span className="text-history">{formatPrice(group.historical_min_cena)} RSD</span>
        </div>
      )}

      {/* Top ponude */}
      <div className="mt-3 flex flex-col gap-1.5">
        {group.offers.slice(0, 3).map((offer) => (
          <div key={offer.id} className="flex items-center justify-between">
            <SourceBadge izvor={offer.izvor} />
            <span className={`text-xs font-medium ${offer.cena_sumnjiva ? "text-warning" : "text-muted"}`}>
              {formatPrice(offer.cena)} RSD
              {offer.cena_sumnjiva && <span className="ml-1" title="Moguća greška">⚠</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Hover CTA */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity bg-accent-bright/10 py-1.5">
        <span>Uporedi cene &rarr;</span>
      </div>
    </Link>
  );
}

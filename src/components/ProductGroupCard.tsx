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
        className="group relative flex flex-col bg-[#16181d] border border-[#2a2d35] p-4 transition-all duration-200 hover:border-[#c8e64a]/40 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <SourceBadge izvor={bestOffer.izvor} />
          {bestOffer.dostupnost === "RASPRODATO" && (
            <span className="text-[10px] uppercase tracking-wider text-[#555963]">rasprodato</span>
          )}
        </div>

        <h3 className="text-[13px] leading-snug font-medium text-[#8b8f9a] line-clamp-2 mb-2 group-hover:text-[#e0e2e7] transition-colors min-h-[2.5rem]">
          {group.naziv}
        </h3>

        {group.brend_normalized && (
          <span className="text-xs text-[#555963] mb-3">{group.brend_normalized}</span>
        )}

        <div className="mt-auto pt-3 border-t border-[#2a2d35]">
          <span className={`text-xl font-bold tracking-tight ${bestOffer.cena_sumnjiva ? "text-[#f59e0b]" : "text-[#e0e2e7]"}`}>
            {formatPrice(group.min_cena)}
            <span className="text-xs font-normal text-[#555963] ml-1">RSD</span>
          </span>
          {bestOffer.cena_sumnjiva && (
            <div className="text-[10px] text-[#f59e0b] mt-0.5" title="Cena izgleda kao greška">moguća greška?</div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-[#c8e64a] opacity-0 group-hover:opacity-100 transition-opacity bg-[#c8e64a]/10 py-1.5">
          <span>Pogledaj &rarr;</span>
        </div>
      </a>
    );
  }

  // Grupisani proizvod — link na stranicu za poređenje
  return (
    <Link
      href={`/proizvod/${encodeURIComponent(group.match_key)}`}
      className="group relative flex flex-col bg-[#16181d] border border-[#2a2d35] p-4 transition-all duration-200 hover:border-[#c8e64a]/40 cursor-pointer"
    >
      {/* Badge — broj prodavnica */}
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#c8e64a]/15 text-[#c8e64a]">
          {group.num_sources} {group.num_sources === 1 ? "prodavnica" : group.num_sources < 5 ? "prodavnice" : "prodavnica"}
        </span>
      </div>

      {/* Naziv */}
      <h3 className="text-[13px] leading-snug font-medium text-[#8b8f9a] line-clamp-2 mb-2 group-hover:text-[#e0e2e7] transition-colors min-h-[2.5rem]">
        {group.naziv}
      </h3>

      {/* Brend */}
      {group.brend_normalized && (
        <span className="text-xs text-[#555963] mb-3">{group.brend_normalized}</span>
      )}

      {/* Cene */}
      <div className="mt-auto pt-3 border-t border-[#2a2d35]">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-xl font-bold tracking-tight ${bestOffer?.cena_sumnjiva ? "text-[#f59e0b]" : "text-[#c8e64a]"}`}>
            {formatPrice(group.min_cena)}
            <span className="text-xs font-normal text-[#555963] ml-1">RSD</span>
          </span>
          {hasMultiplePrices && !bestOffer?.cena_sumnjiva && (
            <span className="text-xs text-[#555963]">
              — {formatPrice(group.max_cena)} RSD
            </span>
          )}
        </div>
        {bestOffer?.cena_sumnjiva && (
          <div className="text-[10px] text-[#f59e0b] mt-0.5" title="Cena izgleda kao greška">moguća greška?</div>
        )}
      </div>

      {/* Istorijski minimum */}
      {group.historical_min_cena != null && (
        <div className="mt-2 text-[11px] text-[#555963]">
          Istorijski najniža: <span className="text-[#0ea5e9]">{formatPrice(group.historical_min_cena)} RSD</span>
        </div>
      )}

      {/* Top ponude */}
      <div className="mt-3 flex flex-col gap-1.5">
        {group.offers.slice(0, 3).map((offer) => (
          <div key={offer.id} className="flex items-center justify-between">
            <SourceBadge izvor={offer.izvor} />
            <span className={`text-xs font-medium ${offer.cena_sumnjiva ? "text-[#f59e0b]" : "text-[#8b8f9a]"}`}>
              {formatPrice(offer.cena)} RSD
              {offer.cena_sumnjiva && <span className="ml-1" title="Moguća greška">⚠</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Hover CTA */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-[#c8e64a] opacity-0 group-hover:opacity-100 transition-opacity bg-[#c8e64a]/10 py-1.5">
        <span>Uporedi cene &rarr;</span>
      </div>
    </Link>
  );
}

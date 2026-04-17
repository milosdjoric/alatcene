import Link from "next/link";
import type { ProductGroup } from "@/lib/types";
import SourceBadge from "./SourceBadge";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("sr-RS").format(price);
}

export default function ProductGroupList({ groups }: { groups: ProductGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 border border-[#2a2d35] flex items-center justify-center mb-5">
          <svg className="h-8 w-8 text-[#555963]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-[#e0e2e7] text-base font-bold mb-1">Nema rezultata</p>
        <p className="text-[#555963] text-sm">Pokušaj sa drugačijom pretragom ili ukloni neke filtere</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {groups.map((group) => {
        const isSolo = group.num_sources === 1;
        const bestOffer = group.offers[0];
        const hasMultiplePrices = group.min_cena !== group.max_cena;

        const content = (
          <div className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-[#16181d] border border-[#2a2d35] px-4 py-3 transition-all duration-200 hover:border-[#c8e64a]/40 cursor-pointer">
            {/* Badge */}
            <div className="flex-shrink-0 w-24 sm:w-28">
              {isSolo && bestOffer ? (
                <SourceBadge izvor={bestOffer.izvor} />
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-[#c8e64a]/15 text-[#c8e64a]">
                  {group.num_sources} {group.num_sources < 5 ? "prod." : "prod."}
                </span>
              )}
            </div>

            {/* Naziv + brend */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm text-[#8b8f9a] truncate group-hover:text-[#e0e2e7] transition-colors">
                {group.naziv}
              </h3>
              <div className="flex items-center gap-2">
                {group.brend_normalized && (
                  <span className="text-xs text-[#555963]">{group.brend_normalized}</span>
                )}
                {group.historical_min_cena != null && (
                  <span className="text-[10px] text-[#555963]">
                    ist. min: {formatPrice(group.historical_min_cena)} RSD
                  </span>
                )}
              </div>
            </div>

            {/* Ponude inline (desktop) */}
            {!isSolo && (
              <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                {group.offers.slice(0, 3).map((offer) => (
                  <div key={offer.id} className="flex items-center gap-1.5">
                    <SourceBadge izvor={offer.izvor} />
                    <span className="text-xs text-[#8b8f9a]">{formatPrice(offer.cena)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Cena */}
            <div className="flex-shrink-0 text-right">
              <span className={`text-lg font-bold tracking-tight ${isSolo ? "text-[#e0e2e7]" : "text-[#c8e64a]"}`}>
                {formatPrice(group.min_cena)}
                <span className="text-xs font-normal text-[#555963] ml-1">RSD</span>
              </span>
              {hasMultiplePrices && (
                <div className="text-[10px] text-[#555963]">
                  — {formatPrice(group.max_cena)} RSD
                </div>
              )}
            </div>

            {/* Arrow */}
            <svg className="hidden sm:block h-4 w-4 text-[#2a2d35] group-hover:text-[#c8e64a] flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        );

        if (isSolo && bestOffer) {
          return (
            <a key={group.match_key} href={bestOffer.url} target="_blank" rel="noopener noreferrer">
              {content}
            </a>
          );
        }

        return (
          <Link key={group.match_key} href={`/proizvod/${encodeURIComponent(group.match_key)}`}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

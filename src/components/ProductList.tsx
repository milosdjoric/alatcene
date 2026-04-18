import type { Product } from "@/lib/types";
import SourceBadge from "./SourceBadge";
import PriceTag from "./PriceTag";

export default function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) {
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
      {products.map((product) => {
        const outOfStock = product.dostupnost === "RASPRODATO";
        return (
          <a
            key={`${product.izvor}-${product.external_id}`}
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-[#16181d] border border-[#2a2d35] px-4 py-3 transition-all duration-200 hover:border-[#c8e64a]/40 cursor-pointer ${outOfStock ? "opacity-40" : ""}`}
          >
            <div className="flex items-center gap-3 sm:contents">
              <div className="flex-shrink-0 w-24 sm:w-28">
                <SourceBadge izvor={product.izvor} />
              </div>
              {product.popust_procenat && product.popust_procenat >= 10 && (
                <span className="sm:hidden flex-shrink-0 bg-[#c8e64a] text-[#0c0d10] text-[11px] font-bold px-2 py-0.5">
                  -{product.popust_procenat}%
                </span>
              )}
              <div className="sm:hidden flex-shrink-0 ml-auto">
                <PriceTag
                  cena={product.cena}
                  redovna_cena={product.redovna_cena}
                  popust_procenat={product.popust_procenat}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm text-[#8b8f9a] truncate group-hover:text-[#e0e2e7] transition-colors">
                {product.naziv}
              </h3>
              {product.brend_normalized && (
                <span className="text-xs text-[#555963]">{product.brend_normalized}</span>
              )}
            </div>
            {product.popust_procenat && product.popust_procenat >= 10 && (
              <span className="hidden sm:inline-flex flex-shrink-0 bg-[#c8e64a] text-[#0c0d10] text-[11px] font-bold px-2 py-0.5">
                -{product.popust_procenat}%
              </span>
            )}
            <div className="hidden sm:block flex-shrink-0 text-right">
              <PriceTag
                cena={product.cena}
                redovna_cena={product.redovna_cena}
                popust_procenat={product.popust_procenat}
              />
            </div>
            <svg className="hidden sm:block h-4 w-4 text-[#2a2d35] group-hover:text-[#c8e64a] flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        );
      })}
    </div>
  );
}

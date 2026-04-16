import type { Product } from "@/lib/types";
import SourceBadge from "./SourceBadge";
import PriceTag from "./PriceTag";

export default function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.dostupnost === "RASPRODATO";

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex flex-col bg-white rounded-2xl border border-slate-200 p-5 transition-all duration-200 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 ${outOfStock ? "opacity-60" : ""}`}
    >
      {/* Popust badge */}
      {product.popust_procenat && product.popust_procenat >= 10 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
          -{product.popust_procenat}%
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <SourceBadge izvor={product.izvor} />
        {outOfStock && (
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Rasprodato</span>
        )}
      </div>

      <h3 className="text-[13px] leading-snug font-medium text-slate-700 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors min-h-[2.5rem]">
        {product.naziv}
      </h3>

      {product.brend_normalized && (
        <span className="text-xs text-slate-400 font-medium mb-3">{product.brend_normalized}</span>
      )}

      <div className="mt-auto pt-3 border-t border-slate-100">
        <PriceTag
          cena={product.cena}
          redovna_cena={product.redovna_cena}
          popust_procenat={product.popust_procenat}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 rounded-lg py-1.5">
        <span>Pogledaj na sajtu</span>
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  );
}

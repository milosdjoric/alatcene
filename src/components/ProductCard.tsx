import type { Product } from "@/lib/types";
import SourceBadge from "./SourceBadge";
import PriceTag from "./PriceTag";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white rounded-xl border border-zinc-200 p-4 hover:shadow-md hover:border-zinc-300 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <SourceBadge izvor={product.izvor} />
        {product.dostupnost === "RASPRODATO" && (
          <span className="text-xs text-zinc-400 font-medium">Rasprodato</span>
        )}
      </div>

      <h3 className="text-sm font-medium text-zinc-800 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors min-h-[2.5rem]">
        {product.naziv}
      </h3>

      {product.brend_normalized && (
        <span className="text-xs text-zinc-500 mb-3">{product.brend_normalized}</span>
      )}

      <div className="mt-auto pt-2">
        <PriceTag
          cena={product.cena}
          redovna_cena={product.redovna_cena}
          popust_procenat={product.popust_procenat}
        />
      </div>

      <div className="mt-2 flex items-center gap-1 text-xs text-zinc-400 group-hover:text-blue-500 transition-colors">
        <span>Pogledaj na sajtu</span>
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  );
}

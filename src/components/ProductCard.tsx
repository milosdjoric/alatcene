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
      className={`group relative flex flex-col bg-[#16181d] border border-[#2a2d35] p-4 transition-all duration-200 hover:border-[#c8e64a]/40 cursor-pointer ${outOfStock ? "opacity-40" : ""}`}
    >
      {/* Popust badge */}
      {product.popust_procenat && product.popust_procenat >= 10 && (
        <div className="absolute top-0 right-0 bg-[#c8e64a] text-[#0c0d10] text-[11px] font-bold px-2 py-0.5">
          -{product.popust_procenat}%
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <SourceBadge izvor={product.izvor} />
        {outOfStock && (
          <span className="text-[10px] uppercase tracking-wider text-[#555963]">rasprodato</span>
        )}
      </div>

      <h3 className="text-[13px] leading-snug font-medium text-[#8b8f9a] line-clamp-2 mb-2 group-hover:text-[#e0e2e7] transition-colors min-h-[2.5rem]">
        {product.naziv}
      </h3>

      {product.brend_normalized && (
        <span className="text-xs text-[#555963] mb-3">{product.brend_normalized}</span>
      )}

      <div className="mt-auto pt-3 border-t border-[#2a2d35]">
        <PriceTag
          cena={product.cena}
          redovna_cena={product.redovna_cena}
          popust_procenat={product.popust_procenat}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-[#c8e64a] opacity-0 group-hover:opacity-100 transition-opacity bg-[#c8e64a]/10 py-1.5">
        <span>Pogledaj →</span>
      </div>
    </a>
  );
}

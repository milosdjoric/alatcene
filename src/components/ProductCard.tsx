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
      className={`group relative flex flex-col bg-surface border border-border p-4 transition-all duration-200 hover:border-accent/40 cursor-pointer ${outOfStock ? "opacity-40" : ""}`}
    >
      {/* Popust badge */}
      {product.popust_procenat && product.popust_procenat >= 10 && (
        <div className="absolute top-0 right-0 bg-accent-bright text-foreground text-[12px] font-bold px-2 py-0.5">
          -{product.popust_procenat}%
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <SourceBadge izvor={product.izvor} />
        {outOfStock && (
          <span className="text-[11px] uppercase tracking-wider text-subtle">rasprodato</span>
        )}
      </div>

      <h3 className="text-[14px] leading-snug font-medium text-muted line-clamp-2 mb-2 group-hover:text-foreground transition-colors min-h-[2.5rem]">
        {product.naziv}
      </h3>

      {product.brend_normalized && (
        <span className="text-xs text-subtle mb-3">{product.brend_normalized}</span>
      )}

      <div className="mt-auto pt-3 border-t border-border">
        <PriceTag
          cena={product.cena}
          redovna_cena={product.redovna_cena}
          popust_procenat={product.popust_procenat}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity bg-accent-bright/10 py-1.5">
        <span>Pogledaj →</span>
      </div>
    </a>
  );
}

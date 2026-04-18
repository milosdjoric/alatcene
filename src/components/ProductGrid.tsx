import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: Product[] }) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {products.map((product) => (
        <ProductCard key={`${product.izvor}-${product.external_id}`} product={product} />
      ))}
    </div>
  );
}

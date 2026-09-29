import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export interface ProductGroupData {
  /** Sve ponude: prvo na stanju, pa pouzdane cene, pa po ceni rastuće. */
  products: Product[];
  /** Ponude bez sumnjive cene (za raspon cena, uštedu i JSON-LD). */
  trusted: Product[];
  historicalMin: number | null;
}

// cache() — generateMetadata i stranica u istom zahtevu dele jedan upit.
export const getProductGroup = cache(
  async (matchKey: string): Promise<ProductGroupData> => {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("products_live")
      .select("*")
      .eq("match_key", matchKey)
      .order("dostupnost", { ascending: true })
      .order("cena_sumnjiva", { ascending: true })
      .order("cena", { ascending: true });

    const products = (data ?? []) as Product[];

    const productIds = products.map((p) => p.id);
    const { data: histMin } =
      productIds.length > 0
        ? await supabase
            .from("price_history")
            .select("cena")
            .in("product_id", productIds)
            .order("cena", { ascending: true })
            .limit(1)
        : { data: null };

    return {
      products,
      trusted: products.filter((p) => !p.cena_sumnjiva),
      historicalMin: histMin?.[0]?.cena ?? null,
    };
  },
);

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("sr-RS").format(price);
}

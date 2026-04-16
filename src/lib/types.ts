export interface Product {
  id: number;
  external_id: string;
  sku: string | null;
  naziv: string;
  brend: string | null;
  brend_normalized: string | null;
  kategorija: string | null;
  parent_kategorija: string | null;
  cena: number;
  redovna_cena: number | null;
  popust_procenat: number | null;
  popust_iznos: number | null;
  url: string;
  izvor: string;
  dostupnost: "NA_STANJU" | "RASPRODATO";
  ocena: number | null;
  broj_recenzija: number | null;
  specifikacije: string[] | null;
  updated_at: string;
}

export interface SearchParams {
  q?: string;
  brend?: string;
  izvor?: string;
  parent_kategorija?: string;
  dostupnost?: string;
  cena_min?: number;
  cena_max?: number;
  sort?: "cena_asc" | "cena_desc" | "popust_desc" | "naziv_asc" | "newest";
  page?: number;
}

export interface SearchResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PricePoint {
  recorded_at: string;
  cena: number;
  redovna_cena: number | null;
}

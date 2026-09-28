"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SOURCES } from "@/lib/constants";

const FILTER_LABELS: Record<string, string> = {
  brend: "Brend",
  izvor: "Prodavnica",
  kategorija: "Kategorija",
  dostupnost: "Dostupnost",
  cena_min: "Cena od",
  cena_max: "Cena do",
};

const DOSTUPNOST_LABELS: Record<string, string> = {
  NA_STANJU: "Na stanju",
  RASPRODATO: "Rasprodato",
};

function formatValue(key: string, value: string): string {
  if (key === "izvor") return SOURCES[value]?.label || value;
  if (key === "dostupnost") return DOSTUPNOST_LABELS[value] || value;
  if (key === "cena_min" || key === "cena_max") return `${Number(value).toLocaleString("sr-RS")} RSD`;
  return value;
}

export default function ActiveFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterKeys = ["brend", "izvor", "kategorija", "dostupnost", "cena_min", "cena_max"];
  const activeFilters = filterKeys
    .map((key) => ({ key, value: searchParams.get(key) }))
    .filter((f): f is { key: string; value: string } => f.value !== null);

  if (activeFilters.length === 0) return null;

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    const sort = searchParams.get("sort");
    params.set("sort", sort || "cena_asc");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {activeFilters.map(({ key, value }) => (
        <button
          key={key}
          onClick={() => removeFilter(key)}
          className="inline-flex items-center gap-1.5 px-3 py-1 border border-accent/30 bg-accent-bright/5 text-accent text-sm hover:bg-accent-bright/10 transition-colors cursor-pointer"
        >
          <span className="text-accent/50 text-xs">{FILTER_LABELS[key]}:</span>
          {formatValue(key, value)}
          <svg className="h-3 w-3 text-accent/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}
      {activeFilters.length > 1 && (
        <button
          onClick={clearAll}
          className="text-xs text-subtle hover:text-foreground px-2 py-1 transition-colors cursor-pointer"
        >
          obriši sve
        </button>
      )}
    </div>
  );
}

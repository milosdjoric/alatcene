"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SOURCES } from "@/lib/constants";

interface Brand {
  name: string;
  count: number;
}

export default function FilterSidebar({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);

  const activeBrend = searchParams.get("brend") || "";
  const activeIzvor = searchParams.get("izvor") || "";
  const activeDostupnost = searchParams.get("dostupnost") || "";
  const activeCenaMin = searchParams.get("cena_min") || "";
  const activeCenaMax = searchParams.get("cena_max") || "";

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    router.push(`/?${params.toString()}`);
  }

  const hasFilters = activeBrend || activeIzvor || activeDostupnost || activeCenaMin || activeCenaMax;
  const visibleBrands = showAllBrands ? brands : brands.slice(0, 20);

  const content = (
    <div className="space-y-6">
      {/* Dostupnost */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-2">Dostupnost</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={activeDostupnost === "NA_STANJU"}
            onChange={(e) => setFilter("dostupnost", e.target.checked ? "NA_STANJU" : "")}
            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-zinc-600">Samo na stanju</span>
        </label>
      </div>

      {/* Brend */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-2">Brend</h3>
        {activeBrend && (
          <button
            onClick={() => setFilter("brend", "")}
            className="mb-2 text-xs text-blue-600 hover:underline"
          >
            Poništi izbor ({activeBrend})
          </button>
        )}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {visibleBrands.map((b) => (
            <button
              key={b.name}
              onClick={() => setFilter("brend", b.name === activeBrend ? "" : b.name)}
              className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                b.name === activeBrend
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {b.name} <span className="text-zinc-400">({b.count})</span>
            </button>
          ))}
        </div>
        {brands.length > 20 && (
          <button
            onClick={() => setShowAllBrands(!showAllBrands)}
            className="mt-1 text-xs text-blue-600 hover:underline"
          >
            {showAllBrands ? "Prikaži manje" : `Prikaži sve (${brands.length})`}
          </button>
        )}
      </div>

      {/* Izvor */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-2">Prodavnica</h3>
        {activeIzvor && (
          <button
            onClick={() => setFilter("izvor", "")}
            className="mb-2 text-xs text-blue-600 hover:underline"
          >
            Poništi izbor
          </button>
        )}
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {Object.entries(SOURCES).map(([key, source]) => (
            <button
              key={key}
              onClick={() => setFilter("izvor", key === activeIzvor ? "" : key)}
              className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 transition-colors ${
                key === activeIzvor
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: source.color }}
              />
              {source.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cena */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-2">Cena (RSD)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Od"
            defaultValue={activeCenaMin}
            onBlur={(e) => setFilter("cena_min", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setFilter("cena_min", (e.target as HTMLInputElement).value)}
            className="w-full px-2 py-1.5 rounded border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-zinc-400 text-sm">-</span>
          <input
            type="number"
            placeholder="Do"
            defaultValue={activeCenaMax}
            onBlur={(e) => setFilter("cena_max", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setFilter("cena_max", (e.target as HTMLInputElement).value)}
            className="w-full px-2 py-1.5 rounded border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="w-full py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          Obriši sve filtere
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filteri
        {hasFilters && (
          <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            !
          </span>
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-full bg-white p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Filteri</h2>
              <button onClick={() => setMobileOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {content}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-6">
          {content}
        </div>
      </aside>
    </>
  );
}

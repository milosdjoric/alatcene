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
  const visibleBrands = showAllBrands ? brands : brands.slice(0, 15);

  const content = (
    <div className="space-y-6">
      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="w-full py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
        >
          Obriši sve filtere
        </button>
      )}

      {/* Dostupnost */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Dostupnost</h3>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={activeDostupnost === "NA_STANJU"}
            onChange={(e) => setFilter("dostupnost", e.target.checked ? "NA_STANJU" : "")}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
          />
          <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Samo na stanju</span>
        </label>
      </div>

      {/* Cena */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cena (RSD)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Od"
            defaultValue={activeCenaMin}
            onBlur={(e) => setFilter("cena_min", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setFilter("cena_min", (e.target as HTMLInputElement).value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
          />
          <span className="text-slate-300">—</span>
          <input
            type="number"
            placeholder="Do"
            defaultValue={activeCenaMax}
            onBlur={(e) => setFilter("cena_max", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setFilter("cena_max", (e.target as HTMLInputElement).value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Brend */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Brend</h3>
        {activeBrend && (
          <button
            onClick={() => setFilter("brend", "")}
            className="mb-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {activeBrend}
          </button>
        )}
        <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
          {visibleBrands.map((b) => (
            <button
              key={b.name}
              onClick={() => setFilter("brend", b.name === activeBrend ? "" : b.name)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-all ${
                b.name === activeBrend
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{b.name}</span>
              <span className="text-slate-400 ml-1 text-xs">{b.count}</span>
            </button>
          ))}
        </div>
        {brands.length > 15 && (
          <button
            onClick={() => setShowAllBrands(!showAllBrands)}
            className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {showAllBrands ? "Prikaži manje" : `+ još ${brands.length - 15} brendova`}
          </button>
        )}
      </div>

      {/* Izvor */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Prodavnica</h3>
        {activeIzvor && (
          <button
            onClick={() => setFilter("izvor", "")}
            className="mb-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Poništi
          </button>
        )}
        <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
          {Object.entries(SOURCES).map(([key, source]) => (
            <button
              key={key}
              onClick={() => setFilter("izvor", key === activeIzvor ? "" : key)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm flex items-center gap-2.5 transition-all ${
                key === activeIzvor
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filteri
          {hasFilters && (
            <span className="bg-blue-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
              !
            </span>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-[calc(100%-3rem)] bg-white p-6 overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">Filteri</h2>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
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
      <aside className="hidden lg:block w-60 flex-shrink-0">
        <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Filteri</h2>
          {content}
        </div>
      </aside>
    </>
  );
}

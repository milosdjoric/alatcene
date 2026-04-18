"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SOURCES } from "@/lib/constants";

interface FilterItem {
  name: string;
  count: number;
}

export default function FilterSidebar({
  brands,
  categories,
}: {
  brands: FilterItem[];
  categories: FilterItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const activeBrend = searchParams.get("brend") || "";
  const activeIzvor = searchParams.get("izvor") || "";
  const activeKategorija = searchParams.get("kategorija") || "";
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
    const sort = searchParams.get("sort");
    params.set("sort", sort || "cena_asc");
    router.push(`/?${params.toString()}`);
  }

  const hasFilters = activeBrend || activeIzvor || activeKategorija || activeDostupnost || activeCenaMin || activeCenaMax;
  const visibleBrands = showAllBrands ? brands : brands.slice(0, 15);
  const visibleCategories = showAllCategories ? categories : categories.slice(0, 10);

  const content = (
    <div className="space-y-6">
      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors border border-red-400/30 cursor-pointer"
        >
          obriši sve filtere
        </button>
      )}

      {/* Dostupnost */}
      <div>
        <h3 className="text-[10px] font-bold text-[#555963] uppercase tracking-[0.15em] mb-3">Dostupnost</h3>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={activeDostupnost === "NA_STANJU"}
            onChange={(e) => setFilter("dostupnost", e.target.checked ? "NA_STANJU" : "")}
            className="w-4 h-4 rounded-none border-[#2a2d35] bg-[#0c0d10] text-[#c8e64a] focus:ring-[#c8e64a]/30"
          />
          <span className="text-sm text-[#8b8f9a] group-hover:text-[#e0e2e7] transition-colors">Samo na stanju</span>
        </label>
      </div>

      {/* Kategorija */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-[#555963] uppercase tracking-[0.15em] mb-3">Kategorija</h3>
          {activeKategorija && (
            <button
              onClick={() => setFilter("kategorija", "")}
              className="mb-2 flex items-center gap-1 text-xs text-[#c8e64a] cursor-pointer"
            >
              × {activeKategorija}
            </button>
          )}
          <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
            {visibleCategories.map((c) => (
              <button
                key={c.name}
                onClick={() => setFilter("kategorija", c.name === activeKategorija ? "" : c.name)}
                className={`w-full text-left px-2 py-1.5 text-sm transition-colors cursor-pointer ${
                  c.name === activeKategorija
                    ? "bg-[#c8e64a]/10 text-[#c8e64a] font-medium"
                    : "text-[#8b8f9a] hover:text-[#e0e2e7] hover:bg-[#1e2027]"
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[#555963] ml-1 text-xs">{c.count}</span>
              </button>
            ))}
          </div>
          {categories.length > 10 && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="mt-2 text-xs text-[#c8e64a]/70 hover:text-[#c8e64a] cursor-pointer"
            >
              {showAllCategories ? "prikaži manje" : `+ još ${categories.length - 10}`}
            </button>
          )}
        </div>
      )}

      {/* Cena */}
      <div>
        <h3 className="text-[10px] font-bold text-[#555963] uppercase tracking-[0.15em] mb-3">Cena (RSD)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Od"
            defaultValue={activeCenaMin}
            onBlur={(e) => setFilter("cena_min", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setFilter("cena_min", (e.target as HTMLInputElement).value)}
            className="w-full px-3 py-2 rounded-none border border-[#2a2d35] bg-[#0c0d10] text-sm text-[#e0e2e7] focus:outline-none focus:border-[#c8e64a] transition-colors"
          />
          <span className="text-[#555963]">—</span>
          <input
            type="number"
            placeholder="Do"
            defaultValue={activeCenaMax}
            onBlur={(e) => setFilter("cena_max", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setFilter("cena_max", (e.target as HTMLInputElement).value)}
            className="w-full px-3 py-2 rounded-none border border-[#2a2d35] bg-[#0c0d10] text-sm text-[#e0e2e7] focus:outline-none focus:border-[#c8e64a] transition-colors"
          />
        </div>
      </div>

      {/* Brend */}
      <div>
        <h3 className="text-[10px] font-bold text-[#555963] uppercase tracking-[0.15em] mb-3">Brend</h3>
        {activeBrend && (
          <button
            onClick={() => setFilter("brend", "")}
            className="mb-2 flex items-center gap-1 text-xs text-[#c8e64a] cursor-pointer"
          >
            × {activeBrend}
          </button>
        )}
        <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
          {visibleBrands.map((b) => (
            <button
              key={b.name}
              onClick={() => setFilter("brend", b.name === activeBrend ? "" : b.name)}
              className={`w-full text-left px-2 py-1.5 text-sm transition-colors cursor-pointer ${
                b.name === activeBrend
                  ? "bg-[#c8e64a]/10 text-[#c8e64a] font-medium"
                  : "text-[#8b8f9a] hover:text-[#e0e2e7] hover:bg-[#1e2027]"
              }`}
            >
              <span>{b.name}</span>
              <span className="text-[#555963] ml-1 text-xs">{b.count}</span>
            </button>
          ))}
        </div>
        {brands.length > 15 && (
          <button
            onClick={() => setShowAllBrands(!showAllBrands)}
            className="mt-2 text-xs text-[#c8e64a]/70 hover:text-[#c8e64a] cursor-pointer"
          >
            {showAllBrands ? "prikaži manje" : `+ još ${brands.length - 15}`}
          </button>
        )}
      </div>

      {/* Izvor */}
      <div>
        <h3 className="text-[10px] font-bold text-[#555963] uppercase tracking-[0.15em] mb-3">Prodavnica</h3>
        {activeIzvor && (
          <button
            onClick={() => setFilter("izvor", "")}
            className="mb-2 flex items-center gap-1 text-xs text-[#c8e64a] cursor-pointer"
          >
            × poništi
          </button>
        )}
        <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
          {Object.entries(SOURCES).map(([key, source]) => (
            <button
              key={key}
              onClick={() => setFilter("izvor", key === activeIzvor ? "" : key)}
              className={`w-full text-left px-2 py-1.5 text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                key === activeIzvor
                  ? "bg-[#c8e64a]/10 text-[#c8e64a] font-medium"
                  : "text-[#8b8f9a] hover:text-[#e0e2e7] hover:bg-[#1e2027]"
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
          className="flex items-center gap-2 px-4 py-3 border border-[#2a2d35] bg-[#16181d] text-sm text-[#8b8f9a] hover:border-[#c8e64a]/40 transition-colors cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          filteri
          {hasFilters && (
            <span className="bg-[#c8e64a] text-[#0c0d10] text-[10px] font-bold w-5 h-5 flex items-center justify-center">
              !
            </span>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-[calc(100%-3rem)] bg-[#16181d] p-6 overflow-y-auto border-l border-[#2a2d35]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-[#e0e2e7] uppercase tracking-wider">Filteri</h2>
              <button onClick={() => setMobileOpen(false)} className="text-[#555963] hover:text-[#e0e2e7] transition-colors cursor-pointer">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {content}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <div className="sticky top-20 bg-[#16181d] border border-[#2a2d35] p-4">
          <h2 className="text-[10px] font-bold text-[#555963] uppercase tracking-[0.15em] mb-4">Filteri</h2>
          {content}
        </div>
      </aside>
    </>
  );
}

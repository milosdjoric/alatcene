"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SORT_OPTIONS } from "@/lib/constants";

export default function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "cena_asc";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  return (
    <select
      value={currentSort}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

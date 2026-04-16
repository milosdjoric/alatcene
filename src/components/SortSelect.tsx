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
      className="px-3 py-2 rounded-none border border-[#2a2d35] bg-[#16181d] text-sm text-[#8b8f9a] focus:outline-none focus:border-[#c8e64a] cursor-pointer transition-colors"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

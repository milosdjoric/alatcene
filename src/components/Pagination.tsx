"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function Pagination({
  totalPages,
  currentPage,
}: {
  totalPages: number;
  currentPage: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-10">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 text-sm text-[#8b8f9a] hover:text-[#c8e64a] disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        ← prev
      </button>
      <div className="flex items-center gap-0.5">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-2 text-[#555963] text-sm">...</span>
          ) : (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`w-10 h-10 text-sm font-bold transition-colors cursor-pointer ${
                p === currentPage
                  ? "bg-[#c8e64a] text-[#0c0d10]"
                  : "text-[#8b8f9a] hover:text-[#c8e64a]"
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 text-sm text-[#8b8f9a] hover:text-[#c8e64a] disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        next →
      </button>
    </div>
  );
}

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
  }

  // Prikaži max 7 stranica oko trenutne
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
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        &larr;
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-zinc-400">...</span>
        ) : (
          <button
            key={p}
            onClick={() => goToPage(p)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              p === currentPage
                ? "bg-blue-600 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        &rarr;
      </button>
    </div>
  );
}

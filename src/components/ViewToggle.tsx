"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function ViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("prikaz") || "lista";

  function setView(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "lista") {
      params.delete("prikaz");
    } else {
      params.set("prikaz", v);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex items-center border border-[#2a2d35] overflow-hidden">
      <button
        onClick={() => setView("grid")}
        className={`p-2.5 transition-colors cursor-pointer ${
          view === "grid" ? "bg-[#c8e64a]/10 text-[#c8e64a]" : "text-[#555963] hover:text-[#8b8f9a]"
        }`}
        title="Grid prikaz"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
      <button
        onClick={() => setView("lista")}
        className={`p-2.5 transition-colors cursor-pointer ${
          view === "lista" ? "bg-[#c8e64a]/10 text-[#c8e64a]" : "text-[#555963] hover:text-[#8b8f9a]"
        }`}
        title="Lista prikaz"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}

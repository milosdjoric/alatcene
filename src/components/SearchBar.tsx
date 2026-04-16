"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useEffect } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const q = searchParams.get("q") || "";

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = q;
  }, [q]);

  function handleInput(value: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      params.delete("page");
      router.push(`/?${params.toString()}`);
    }, 300);
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="relative w-full max-w-2xl">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        defaultValue={q}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="Pretraži alate... (npr. Bosch brusilica)"
        className="w-full pl-10 pr-10 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
      />
      {q && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

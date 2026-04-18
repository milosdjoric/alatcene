"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 text-5xl text-[#c8e64a]">⚠</div>
      <h1 className="mb-2 text-2xl font-semibold text-white">
        Došlo je do greške
      </h1>
      <p className="mb-8 max-w-md text-[#8b8d93]">
        Nešto nije u redu. Pokušaj ponovo ili se vrati na početnu stranicu.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="rounded-lg border border-[#c8e64a] px-5 py-2.5 text-sm font-medium text-[#c8e64a] transition-colors hover:bg-[#c8e64a]/10"
        >
          Pokušaj ponovo
        </button>
        <Link
          href="/"
          className="rounded-lg bg-[#16181d] px-5 py-2.5 text-sm font-medium text-[#e0e2e7] transition-colors hover:bg-[#1e2027]"
        >
          Početna stranica
        </Link>
      </div>
    </div>
  );
}

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
      <div className="mb-6 text-5xl text-accent">⚠</div>
      <h1 className="mb-2 text-2xl font-semibold text-white">
        Došlo je do greške
      </h1>
      <p className="mb-8 max-w-md text-muted">
        Nešto nije u redu. Pokušaj ponovo ili se vrati na početnu stranicu.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="rounded-lg border border-accent px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent-bright/10"
        >
          Pokušaj ponovo
        </button>
        <Link
          href="/"
          className="rounded-lg bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          Početna stranica
        </Link>
      </div>
    </div>
  );
}

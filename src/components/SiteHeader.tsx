import { Suspense } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { getSiteStats, formatCount } from "@/lib/site-stats";

interface SiteHeaderProps {
  /** Pretraga u header-u (landing je ima u hero sekciji, pa je tamo isključena). */
  showSearch?: boolean;
}

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-baseline flex-shrink-0 text-lg tracking-tight"
    >
      <span className="font-extrabold text-accent">cene</span>
      <span className="font-medium text-foreground">alata</span>
      <span className="ml-0.5 text-xs font-medium text-subtle">.in.rs</span>
    </Link>
  );
}

export default async function SiteHeader({ showSearch = false }: SiteHeaderProps) {
  const { storeCount, productCount } = await getSiteStats();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4 sm:gap-6">
          <Logo />

          {showSearch && (
            <div className="flex-1 max-w-xl">
              <Suspense>
                <SearchBar />
              </Suspense>
            </div>
          )}

          <nav className="ml-auto flex items-center gap-4 text-xs text-subtle">
            <span className="hidden md:inline">
              <span className="font-semibold text-muted">{storeCount}</span>{" "}
              prodavnica
              <span className="mx-2 text-border">·</span>
              <span className="font-semibold text-muted">
                {formatCount(productCount)}
              </span>{" "}
              alata
            </span>
            <Link
              href="/info"
              className="font-medium text-muted hover:text-accent transition-colors"
            >
              O sajtu
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

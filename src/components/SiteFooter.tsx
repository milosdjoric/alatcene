import Link from "next/link";
import { getSiteStats, formatDate } from "@/lib/site-stats";

export default async function SiteFooter() {
  const { storeCount, lastUpdated } = await getSiteStats();

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">cenealata.in.rs</span>
            <span className="text-border">/</span>
            <span className="text-subtle">{storeCount} prodavnica</span>
            <span className="text-border">/</span>
            <Link
              href="/info"
              className="text-subtle hover:text-accent transition-colors"
            >
              O sajtu
            </Link>
          </div>
          <p className="text-xs text-subtle">
            cene ažurirane {formatDate(lastUpdated)}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen px-4 py-8">
      {/* Header skeleton */}
      <div className="mx-auto mb-8 max-w-7xl">
        <div className="h-8 w-48 animate-pulse rounded bg-[#16181d]" />
      </div>

      {/* Search bar skeleton */}
      <div className="mx-auto mb-8 max-w-3xl">
        <div className="h-12 w-full animate-pulse rounded-lg bg-[#16181d]" />
      </div>

      {/* Grid skeleton */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl bg-[#16181d]"
          />
        ))}
      </div>
    </div>
  );
}

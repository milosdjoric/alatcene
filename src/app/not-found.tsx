import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 text-8xl font-bold text-[#c8e64a]">404</div>
      <h1 className="mb-2 text-2xl font-semibold text-white">
        Stranica nije pronađena
      </h1>
      <p className="mb-8 max-w-md text-[#8b8d93]">
        Tražena stranica ne postoji ili je uklonjena.
      </p>
      <Link
        href="/"
        className="rounded-lg border border-[#c8e64a] px-5 py-2.5 text-sm font-medium text-[#c8e64a] transition-colors hover:bg-[#c8e64a]/10"
      >
        Nazad na početnu
      </Link>
    </div>
  );
}

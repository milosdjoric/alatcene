import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getSiteStats, formatCount } from "@/lib/site-stats";
import "./globals.css";

// Variable font — sve težine (200–800) u jednom fajlu, pa nema liste weight-a.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-main",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { storeCount, productCount } = await getSiteStats();
  const title = `cenealata.in.rs — Uporedi cene alata iz ${storeCount} prodavnica`;
  const description = `${storeCount} prodavnica. ${formatCount(productCount)} alata. Jedno mesto za upoređivanje cena.`;

  return {
    title: { default: title, template: "%s | cenealata.in.rs" },
    description: `Pretraži i uporedi cene električnih i akumulatorskih alata iz ${storeCount} srpskih online prodavnica. Bosch, Makita, DeWalt, Milwaukee i drugi brendovi.`,
    metadataBase: new URL("https://cenealata.in.rs"),
    openGraph: {
      title,
      description,
      url: "https://cenealata.in.rs",
      siteName: "cenealata.in.rs",
      locale: "sr_RS",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "cenealata.in.rs — Uporedi cene alata",
      description,
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#f6f7f9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background font-[var(--font-main)] text-foreground antialiased">
        {children}
      </body>
      {/* GA4 samo gde je ID postavljen (Vercel Production) — lokalni dev i
          preview deploy-i ne ulaze u statistiku. */}
      {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
    </html>
  );
}

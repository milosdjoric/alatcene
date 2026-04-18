import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-main",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "cenealata.in.rs — Uporedi cene alata iz 17 prodavnica",
    template: "%s | cenealata.in.rs",
  },
  description:
    "Pretraži i uporedi cene električnih i akumulatorskih alata iz 17 srpskih online prodavnica. Bosch, Makita, DeWalt, Milwaukee i 150+ brendova.",
  metadataBase: new URL("https://cenealata.in.rs"),
  openGraph: {
    title: "cenealata.in.rs — Uporedi cene alata iz 17 prodavnica",
    description:
      "17 prodavnica. 34.000+ alata. Jedno mesto za upoređivanje cena.",
    url: "https://cenealata.in.rs",
    siteName: "cenealata.in.rs",
    locale: "sr_RS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "cenealata.in.rs — Uporedi cene alata",
    description:
      "17 prodavnica. 34.000+ alata. Jedno mesto za upoređivanje cena.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0d10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" className={`${spaceGrotesk.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#0c0d10] font-[var(--font-main)] text-[#e0e2e7] antialiased">
        {children}
      </body>
    </html>
  );
}

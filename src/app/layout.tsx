import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-main",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "cenealata.xyz — Uporedi cene alata iz 17 prodavnica",
  description:
    "Pretraži i uporedi cene električnih i akumulatorskih alata iz 17 srpskih online prodavnica. Bosch, Makita, DeWalt, Milwaukee i 150+ brendova.",
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

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
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
    <html lang="sr" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#f8fafc] font-[var(--font-geist)] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

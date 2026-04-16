import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "cenealata.xyz — Uporedi cene alata",
  description:
    "Pretraži i uporedi cene električnih i akumulatorskih alata iz 17 srpskih online prodavnica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 font-[var(--font-geist)]">
        {children}
      </body>
    </html>
  );
}

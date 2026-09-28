import { ImageResponse } from "next/og";
import { getSiteStats, formatCount } from "@/lib/site-stats";

// Slika koju Viber/Facebook/X/Slack prikazuju uz podeljen link.
// Tekst bez kvačica — podrazumevani font ImageResponse-a ne mora da ima latin-ext.
export const alt = "cenealata.in.rs — uporedi cene alata";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 86400;

export default async function OgImage() {
  const { storeCount, productCount } = await getSiteStats();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "#f6f7f9",
        color: "#1a1d23",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", fontSize: 44 }}>
        <span style={{ color: "#5f8f12", fontWeight: 800 }}>cene</span>
        <span style={{ fontWeight: 500 }}>alata</span>
        <span style={{ color: "#98a0ad", fontSize: 28, marginLeft: 4 }}>
          .in.rs
        </span>
      </div>
      <div
        style={{
          fontSize: 84,
          fontWeight: 800,
          lineHeight: 1.05,
          marginTop: 40,
          letterSpacing: -2,
        }}
      >
        Uporedi cene alata
      </div>
      <div style={{ fontSize: 36, color: "#5b6472", marginTop: 28 }}>
        {`${storeCount} prodavnica · ${formatCount(productCount)} alata · istorija cena`}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 56,
          height: 10,
          width: 160,
          background: "#c8e64a",
        }}
      />
    </div>,
    size,
  );
}

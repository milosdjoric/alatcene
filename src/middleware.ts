import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-XSS-Protection": "0",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  // Sajt je privatan — ni jedan odgovor (ni 401) ne sme u indeks.
  "X-Robots-Tag": "noindex, nofollow",
};

function withSecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

// Poređenje u konstantnom vremenu: oba ulaza se heširaju (jednaka dužina),
// pa se prolazi kroz sve bajtove bez ranog izlaska — vreme odgovora ne
// otkriva koliko se karaktera poklopilo.
async function safeEqual(a: string, b: string) {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

function decodeBasicAuth(header: string | null) {
  if (!header?.startsWith("Basic ")) return null;
  try {
    return atob(header.slice(6).trim());
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const user = process.env.SITE_USER;
  const pass = process.env.SITE_PASS;

  if (!user || !pass) {
    // Fail-closed: bez podešenih kredencijala produkcija se ne otvara.
    // Lokalno (next dev) pušta bez zaštite radi lakšeg razvoja.
    if (process.env.NODE_ENV === "production") {
      return withSecurityHeaders(
        new NextResponse("Pristup nije podešen.", { status: 503 }),
      );
    }
    return withSecurityHeaders(NextResponse.next());
  }

  const provided = decodeBasicAuth(request.headers.get("authorization"));
  if (provided !== null && (await safeEqual(provided, `${user}:${pass}`))) {
    return withSecurityHeaders(NextResponse.next());
  }

  return withSecurityHeaders(
    new NextResponse("Potrebna je prijava.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="cenealata", charset="UTF-8"',
      },
    }),
  );
}

// Svaka putanja — stranice, API, slike, statika.
export const config = {
  matcher: ["/:path*"],
};

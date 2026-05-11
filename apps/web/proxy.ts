import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const trustedOrigins = new Set([
  "https://forex-ai-radar-web.vercel.app",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
]);

function contentSecurityPolicy(request: NextRequest): string {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api-production-76b1.up.railway.app";
  const requestOrigin = request.nextUrl.origin;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://s3.tradingview.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    `connect-src 'self' ${requestOrigin} ${apiBase} https://www.tradingview.com https://s.tradingview.com https://s3.tradingview.com wss://*.tradingview.com`,
    "font-src 'self' data:",
    "frame-src https://www.tradingview.com https://s.tradingview.com https://s3.tradingview.com",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get("origin");

  response.headers.set("Content-Security-Policy", contentSecurityPolicy(request));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Vary", "Origin");

  if (origin && trustedOrigins.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    response.headers.set("Access-Control-Allow-Origin", request.nextUrl.origin);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};

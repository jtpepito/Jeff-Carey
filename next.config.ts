import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
// Inline scripts and styles are how Next boots the page, so they stay allowed; everything else must come from
// this site. Product photos the admin pastes may come from any https host, and the checkout previews receipts
// from blob: URLs.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // The Docker image runs the standalone server; local builds stay as they are.
  output: process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // Puts the stylesheet in the HTML so the first paint doesn't wait on a second request.
  // Receipts are uploaded with the order (default limit 1 MB); the app itself refuses anything over 5 MB.
  experimental: { inlineCss: false, serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;

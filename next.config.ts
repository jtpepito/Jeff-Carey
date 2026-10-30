import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

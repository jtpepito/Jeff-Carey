import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // Puts the stylesheet in the HTML so the first paint doesn't wait on a second request.
  experimental: { inlineCss: true },
};

export default nextConfig;

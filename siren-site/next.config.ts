import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local SVG icons are trusted; allow them to be served through next/image.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;

import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/cart", "/checkout", "/profile/", "/favorites", "/search"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

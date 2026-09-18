import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getStorefrontCategories, getStorefrontCollections, getStorefrontPosts, getStorefrontProducts } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, collections, posts] = await Promise.all([
    getStorefrontProducts().catch(() => []), getStorefrontCategories().catch(() => []), getStorefrontCollections().catch(() => []), getStorefrontPosts().catch(() => []),
  ]);
  const staticRoutes = ["/", "/shop", "/collections", "/lookbook", "/blog", "/delivery-payment", "/returns", "/records"];
  return [
    ...staticRoutes.map((path) => ({ url: absoluteUrl(path), changeFrequency: "weekly" as const, priority: path === "/" ? 1 : 0.7 })),
    ...categories.filter((item) => item.isVisible).map((item) => ({ url: absoluteUrl(`/shop/${encodeURIComponent(item.slug)}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...collections.filter((item) => item.isVisible).map((item) => ({ url: absoluteUrl(`/collections/${encodeURIComponent(item.slug)}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((item) => ({ url: absoluteUrl(`/products/${encodeURIComponent(item.slug)}`), lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.9 })),
    ...posts.map((item) => ({ url: absoluteUrl(`/blog/${encodeURIComponent(item.slug)}/0`), lastModified: item.publishedAt ? new Date(item.publishedAt) : undefined, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}

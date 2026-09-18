import type { Metadata } from "next";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://sirencloths.uz").replace(/\/$/, "");
export const brandName = "SIREN";

export function absoluteUrl(path = "/") {
  return path.startsWith("http") ? path : `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata({ title, description, path = "/", image, noIndex = false }: {
  title: string; description: string; path?: string; image?: string; noIndex?: boolean;
}): Metadata {
  const canonical = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: "website", title, description, url: canonical, siteName: brandName, ...(image ? { images: [{ url: absoluteUrl(image), alt: title }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [absoluteUrl(image)] } : {}) },
  };
}

export function jsonLd(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

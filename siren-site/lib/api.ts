import type { Product } from './data';

export type ApiProduct = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  price: string;
  currencyCode: string;
  media: Array<{ url: string; alt?: string; position?: number }>;
  variants: Array<{ id: string; sku: string; color?: string | null; size?: string | null; price?: string | null; inventoryQuantity: number; isActive?: boolean; attributes?: Record<string, unknown> }>;
  category?: { name: string } | null;
  metadata?: { article?: string; sizeGuideImageUrl?: string };
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type ApiMusicRecord = {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverImageUrl?: string | null;
  position: number;
};
export type ApiLookbookEntry = {
  id: string;
  title: string;
  imageUrl: string;
  caption?: string | null;
  targetUrl?: string | null;
  position: number;
};
export type ApiBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  seo?: Record<string, unknown>;
};
export type ApiPage = {
  id: string;
  slug: string;
  title: string;
  seo?: Record<string, unknown>;
  sections?: Array<{ id: string; type: string; content: Record<string, unknown> }>;
};
export type ApiBanner = {
  id: string;
  title: string;
  imageUrl: string;
  mobileImageUrl?: string | null;
  targetUrl?: string | null;
  linkLabel: string;
  textShadow: boolean;
  position: number;
};
export type ApiCustomSection = {
  id: string;
  name: string;
  isActive?: boolean;
  isDuplicate?: boolean;
  layoutType?: "collection" | "promo" | "tactical";
  linkLabel: string;
  targetUrl: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  shadow: boolean;
  mobileHeight: number;
  borderRadius: number;
  cartEnabled: boolean;
  cartItems: string[];
  desktopCartItems?: string[];
  mobileCartItems?: string[];
  cartSwipe: boolean;
  cartLayout: "horizontal" | "vertical";
  desktopTextPosition: string;
  mobileTextPosition: string;
  desktopBannerAlign: "left" | "center" | "right";
  mobileBannerAlign: "full" | "center";
  desktopCartPosition: "left" | "right" | "below";
  mobileCartPosition: "left" | "right" | "below";
  mobileTemplate?: "stack-top" | "stack-middle" | "swipe-below";
  placement: number;
  sortOrder?: number;
  sectionKind?: "banner" | "banner-cart";
  desktopBannerTemplate?: "two-main-small" | "two-small-main" | "two-equal" | "one-max";
  mobileBannerTemplate?: "one-full-one-max" | "one-max-one-full" | "two-max" | "one-full";
  desktopName?: string;
  mobileName?: string;
  desktopLink?: string;
  mobileLink?: string;
  desktopLinkLabel?: string;
  mobileLinkLabel?: string;
  desktopShadow?: boolean;
  mobileShadow?: boolean;
  bannerItems?: Array<{ id: string; desktopImageUrl: string; mobileImageUrl: string; targetUrl: string; linkLabel: string; desktopName?: string; mobileName?: string; desktopLink?: string; mobileLink?: string; desktopLinkLabel?: string; mobileLinkLabel?: string; desktopShadow?: boolean; mobileShadow?: boolean }>;
};

export async function getStorefrontProducts(): Promise<ApiProduct[]> {
  const response = await fetch(`${apiBaseUrl}/catalog/products`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load products');
  return response.json() as Promise<ApiProduct[]>;
}

export async function getStorefrontProduct(slug: string): Promise<ApiProduct> {
  const response = await fetch(`${apiBaseUrl}/catalog/products/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load product');
  return response.json() as Promise<ApiProduct>;
}

export async function getStorefrontRecords(): Promise<ApiMusicRecord[]> {
  const response = await fetch(`${apiBaseUrl}/content/records`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load records');
  return response.json() as Promise<ApiMusicRecord[]>;
}

export async function getStorefrontBanners(): Promise<ApiBanner[]> {
  const response = await fetch(`${apiBaseUrl}/content/banners`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load banners');
  return response.json() as Promise<ApiBanner[]>;
}

export async function getStorefrontLookbook(): Promise<ApiLookbookEntry[]> {
  const response = await fetch(`${apiBaseUrl}/content/lookbook`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load lookbook');
  return response.json() as Promise<ApiLookbookEntry[]>;
}

export async function getStorefrontPosts(): Promise<ApiBlogPost[]> {
  const response = await fetch(`${apiBaseUrl}/content/posts`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load posts');
  return response.json() as Promise<ApiBlogPost[]>;
}

export async function getCustomSections(): Promise<ApiCustomSection[]> {
  const response = await fetch(`${apiBaseUrl}/content/custom-sections`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load custom sections');
  return response.json() as Promise<ApiCustomSection[]>;
}

export async function getStorefrontPage(slug: string): Promise<ApiPage> {
  const response = await fetch(`${apiBaseUrl}/content/pages/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load page');
  return response.json() as Promise<ApiPage>;
}

export function formatStorePrice(price: string, currencyCode: string) {
  const value = Number(price);
  if (!Number.isFinite(value)) return price;
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value).replace(/\u00A0/g, '.') } ${currencyCode === 'UZS' ? 'СУМ' : currencyCode}`;
}

export function storefrontProductPrice(product: Pick<ApiProduct, 'price' | 'variants'>) {
  const basePrice = Number(product.price);
  if (Number.isFinite(basePrice) && basePrice > 0) return String(basePrice);
  const prices = product.variants
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? String(Math.min(...prices)) : product.price;
}

export function storefrontProductImages(product: Pick<ApiProduct, 'media' | 'variants'>) {
  const media = [...(product.media ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => item.url?.trim())
    .filter((url): url is string => Boolean(url));
  const variantImages = product.variants.flatMap((variant) =>
    Array.isArray(variant.attributes?.images)
      ? variant.attributes.images.filter((image): image is string => typeof image === 'string' && Boolean(image.trim()))
      : [],
  );
  return [...new Set([...media, ...variantImages])];
}

// A colour owns its own variant image collection. Product-level media is
// useful for listings, but must not be mixed into a selected colour gallery.
export function storefrontProductImagesByColor(product: Pick<ApiProduct, 'variants'>) {
  return product.variants.reduce<Record<string, string[]>>((groups, variant) => {
    const color = (variant.color || 'Default').trim().toLocaleLowerCase('uz-UZ');
    const images = Array.isArray(variant.attributes?.images)
      ? variant.attributes.images.filter((image): image is string => typeof image === 'string' && Boolean(image.trim()))
      : [];
    if (images.length) groups[color] = [...new Set([...(groups[color] ?? []), ...images])];
    return groups;
  }, {});
}

export type StorefrontProduct = Product & { category?: string };

const colorKey = (value?: string | null) => (value || "Default").trim().toLocaleLowerCase("uz-UZ");
const colorSlug = (value?: string | null) => colorKey(value).replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "default";

/**
 * Produces visual colour cards without duplicating products in storage. A card
 * always routes to the parent product and the exact size SKU remains inside
 * Product Detail / Cart.
 */
export function toStorefrontColorCards(products: ApiProduct[]): StorefrontProduct[] {
  return products.flatMap((product) => {
    const grouped = new Map<string, ApiProduct["variants"]>();
    product.variants.forEach((variant) => {
      const key = colorKey(variant.color);
      grouped.set(key, [...(grouped.get(key) ?? []), variant]);
    });
    if (!grouped.size) return [toStorefrontProduct(product)];

    const fallbackImages = storefrontProductImages(product);
    return [...grouped.entries()].map(([key, variants]) => {
      const representative = variants[0];
      const colorImages = [...new Set(variants.flatMap((variant) =>
        Array.isArray(variant.attributes?.images)
          ? variant.attributes.images.filter((image): image is string => typeof image === "string" && Boolean(image.trim()))
          : [],
      ))];
      const images = colorImages.length ? colorImages : fallbackImages;
      const usableVariants = variants.filter((variant) => variant.isActive !== false);
      const prices = usableVariants.map((variant) => Number(variant.price)).filter((value) => Number.isFinite(value) && value > 0);
      const rawColor = representative.color || "Default";
      return {
        id: product.slug,
        cardId: `${product.id}-${key}`,
        image: images[0] || "/images/p1.jpg",
        hoverImage: images[1],
        alt: `${product.title} — ${rawColor}`,
        title: product.title,
        color: rawColor.toUpperCase(),
        colorSlug: colorSlug(rawColor),
        available: usableVariants.some((variant) => variant.inventoryQuantity > 0),
        availableSizes: usableVariants.filter((variant) => variant.inventoryQuantity > 0).map((variant) => variant.size || "").filter(Boolean),
        price: formatStorePrice(prices.length ? String(Math.min(...prices)) : storefrontProductPrice(product), product.currencyCode),
        category: product.category?.name,
      };
    });
  });
}

export function toStorefrontProduct(product: ApiProduct): StorefrontProduct {
  return {
    id: product.slug,
    image: storefrontProductImages(product)[0] || '/images/p1.jpg',
    alt: product.title,
    title: product.title,
    color: product.variants[0]?.color?.toUpperCase() ?? 'GRAY',
    price: formatStorePrice(storefrontProductPrice(product), product.currencyCode),
    category: product.category?.name,
  };
}

import Footer from "@/components/Footer";
import Recommendation from "@/components/Recommendation";
import LocalizedProductDetail from "@/components/LocalizedProductDetail";
import ProductColorGallery from "@/components/ProductColorGallery";
import { T } from "@/components/LanguageProvider";
import { heroProducts } from "@/lib/data";
import { formatStorePrice, getStorefrontProduct, getStorefrontProducts, storefrontProductImages, storefrontProductImagesByColor, storefrontProductPrice, toStorefrontColorCards, type ApiProduct } from "@/lib/api";
import type { Product } from "@/lib/data";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ color?: string | string[] }> };

const colorSlug = (color: string) => (color || "Default").trim().toLocaleLowerCase("uz-UZ").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "default";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await getStorefrontProduct(id);
    const image = product.seo?.image || storefrontProductImages(product)[0];
    const description = product.seo?.description?.trim() || product.description?.trim() || `Shop ${product.title} by PREVAILEN. Explore available sizes, colours and delivery details.`;
    return pageMetadata({ title: product.seo?.title?.trim() || product.title, description, path: `/products/${encodeURIComponent(product.slug)}`, image });
  } catch {
    return pageMetadata({ title: "Product", description: "Explore PREVAILEN streetwear products.", path: `/products/${encodeURIComponent(id)}`, noIndex: true });
  }
}

export default async function ProductDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  let apiProduct: ApiProduct | null = null;
  try { apiProduct = await getStorefrontProduct(id); } catch { /* legacy demo product fallback */ }
  const legacy = !apiProduct ? heroProducts.find((item) => item.id === id) : undefined;
  if (!apiProduct && !legacy) return <div><T text="notFound" /></div>;

  const images = apiProduct ? storefrontProductImages(apiProduct) : [legacy!.image];
  const imagesByColor = apiProduct ? storefrontProductImagesByColor(apiProduct) : { default: [legacy!.image] };
  const image = images[0] || "/images/p1.jpg";
  const title = apiProduct?.title ?? legacy!.title;
  const price = apiProduct ? formatStorePrice(storefrontProductPrice(apiProduct), apiProduct.currencyCode) : legacy!.price;
  const variants = apiProduct?.variants ?? [];
  const requestedColor = Array.isArray(query.color) ? query.color[0] : query.color;
  const initialColor = variants.find((variant) => colorSlug(variant.color || "Default") === requestedColor)?.color || variants[0]?.color || "Default";
  const article = apiProduct?.metadata?.article || variants[0]?.sku || "";
  const canonicalPath = `/products/${encodeURIComponent(apiProduct?.slug ?? id)}`;
  const productSchema = apiProduct ? {
    "@context": "https://schema.org", "@type": "Product", name: title,
    description: apiProduct.description || `PREVAILEN ${title}`,
    image: images.map((item) => absoluteUrl(item)), sku: variants[0]?.sku || article || undefined,
    brand: { "@type": "Brand", name: "PREVAILEN" },
    offers: {
      "@type": "Offer", url: absoluteUrl(canonicalPath), priceCurrency: apiProduct.currencyCode || "UZS",
      price: String(storefrontProductPrice(apiProduct)), itemCondition: "https://schema.org/NewCondition",
      availability: variants.some((variant) => variant.inventoryQuantity > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  } : null;
  const breadcrumbSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
    ...(apiProduct?.category?.name ? [{ "@type": "ListItem", position: 3, name: apiProduct.category.name, item: absoluteUrl("/shop") }] : []),
    { "@type": "ListItem", position: apiProduct?.category?.name ? 4 : 3, name: title, item: absoluteUrl(canonicalPath) },
  ] };
  let recommendationProducts: Product[] = heroProducts.filter((product) => product.id !== id);
  try {
    const catalogue = await getStorefrontProducts();
    const cards = toStorefrontColorCards(catalogue).filter((product) => product.id !== (apiProduct?.slug ?? id));
    if (cards.length) recommendationProducts = cards;
  } catch { /* Keep the legacy cards available when the catalogue cannot load. */ }
  // Each product page request uses a fresh order, so returning to a product or
  // refreshing the page naturally shows a different selection first.
  recommendationProducts = recommendationProducts
    .map((product) => ({ product, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ product }) => product);

  return <>
    {productSchema && <JsonLd data={productSchema} />}
    <JsonLd data={breadcrumbSchema} />
    <main className="product-detail">
      <ProductColorGallery key={apiProduct?.id ?? legacy!.id} productId={apiProduct?.id ?? legacy!.id} initialColor={initialColor} imagesByColor={imagesByColor} fallbackImages={images.length ? images : [image]} alt={title} />
      <div className="product-detail-info">
        {apiProduct
          ? <LocalizedProductDetail product={apiProduct} image={image} price={price} initialColor={initialColor} article={article} />
          : <LocalizedProductDetail product={{ id: legacy!.id, slug: legacy!.id, title, description: "", price: "", currencyCode: "UZS", media: [], variants: [] }} image={image} price={price} initialColor={initialColor} article={article} />}
      </div>
    </main>
    <div className="product-detail-recommendations"><Recommendation products={recommendationProducts} /></div>
    <Footer />
  </>;
}

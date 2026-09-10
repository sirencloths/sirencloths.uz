import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import Recommendation from "@/components/Recommendation";
import ProductInfoAccordion from "@/components/ProductInfoAccordion";
import ProductDetailClient from "@/components/ProductDetailClient";
import ProductColorGallery from "@/components/ProductColorGallery";
import { T } from "@/components/LanguageProvider";
import { heroProducts } from "@/lib/data";
import { formatStorePrice, getStorefrontProduct, storefrontProductImages, storefrontProductImagesByColor, storefrontProductPrice, type ApiProduct } from "@/lib/api";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ color?: string | string[] }> };

const colorSlug = (color: string) => (color || "Default").trim().toLocaleLowerCase("uz-UZ").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "default";

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

  return <>
    <FixedTop />
    <main className="product-detail">
      <ProductColorGallery productId={apiProduct?.id ?? legacy!.id} initialColor={initialColor} imagesByColor={imagesByColor} fallbackImages={images.length ? images : [image]} alt={title} />
      <div className="product-detail-info">
        <div className="product-detail-breadcrumb"><a href="/"><T text="home" /></a><span>&gt;</span><span>{title}</span></div>
        <h1 className="product-detail-title">{title}</h1>
        <p className="product-detail-price">{price}</p>
        {article && <p className="product-detail-sku">ARTIKUL: {article}</p>}
        <ProductDetailClient id={apiProduct?.id ?? legacy!.id} title={title} price={price} image={image} variants={variants} initialColor={initialColor} sizeGuideImageUrl={apiProduct?.metadata?.sizeGuideImageUrl} />
        <ProductInfoAccordion description={apiProduct?.description} article={article} />
      </div>
    </main>
    <div className="product-detail-recommendations"><Recommendation /></div>
    <Footer />
  </>;
}

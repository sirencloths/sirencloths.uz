"use client";

import ProductDetailClient from "@/components/ProductDetailClient";
import ProductInfoAccordion from "@/components/ProductInfoAccordion";
import { useLanguage } from "@/components/LanguageProvider";
import type { ApiProduct } from "@/lib/api";
import { localizeStorefrontProduct } from "@/lib/api";

type Props = {
  product: ApiProduct;
  image: string;
  price: string;
  initialColor?: string;
  article: string;
};

/** Keeps product page copy in sync with the visitor's locale after hydration. */
export default function LocalizedProductDetail({ product, image, price, initialColor, article }: Props) {
  const { locale } = useLanguage();
  const localized = localizeStorefrontProduct(product, locale);
  return <>
    <h1 className="product-detail-title">{localized.title}</h1>
    <ProductDetailClient id={product.id} title={localized.title} price={price} currencyCode={product.currencyCode} image={image} variants={product.variants} initialColor={initialColor} sizeGuideImageUrl={product.metadata?.sizeGuideImageUrl} />
    <ProductInfoAccordion description={localized.description} article={article} />
  </>;
}

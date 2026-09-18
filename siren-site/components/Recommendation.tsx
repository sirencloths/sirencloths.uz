"use client";

import { useLanguage } from "./LanguageProvider";
import { heroProducts } from "@/lib/data";
import type { Product } from "@/lib/data";
import { getStorefrontProducts, toStorefrontColorCards } from "@/lib/api";
import ProductCard from "./ProductCard";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Recommendation({ products: suppliedProducts }: { products?: Product[] }) {
  const { t, locale } = useLanguage();
  const [catalogueProducts, setCatalogueProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (suppliedProducts?.length) return;
    let active = true;
    void getStorefrontProducts().then((items) => {
      if (!active) return;
      setCatalogueProducts(toStorefrontColorCards(items)
        .map((product) => ({ product, order: Math.random() }))
        .sort((left, right) => left.order - right.order)
        .map(({ product }) => product));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [suppliedProducts]);
  const products = suppliedProducts?.length ? suppliedProducts : catalogueProducts.length ? catalogueProducts : heroProducts;
  const title = {
    en: "Other products", uz: "Boshqa mahsulotlar", ru: "Другие товары", ja: "その他の商品",
    tr: "Diğer ürünler", ko: "다른 상품", de: "Andere Produkte", fr: "Autres produits",
    es: "Otros productos", zh: "其他商品", it: "Altri prodotti",
  }[locale];

  return (
    <section className="recommendation-section">
      <div className="recommendation-header">
        <h2>{title}</h2>
        <Link className="recommendation-shop-link" href="/shop">{t("go")}</Link>
      </div>

      <div className="recommendation-grid">
        {products.map((product, index) => (
          <ProductCard key={`${product.id}-${index}`} product={product} />
        ))}
      </div>
    </section>
  );
}

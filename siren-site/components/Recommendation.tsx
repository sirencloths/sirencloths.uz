"use client";

import { useLanguage } from "./LanguageProvider";
import { heroProducts } from "@/lib/data";
import ProductCard from "./ProductCard";

export default function Recommendation() {
  const { t } = useLanguage();
  const products = [...heroProducts, ...heroProducts, ...heroProducts].slice(0, 12);

  return (
    <section className="recommendation-section">
      <div className="recommendation-header">
        <h2>РЕКОМЕНДУЕМ</h2>
        <a href="/shop">{t("go")}</a>
      </div>

      <div className="recommendation-grid">
        {products.map((product, index) => (
          <ProductCard key={`${product.id}-${index}`} product={product} />
        ))}
      </div>
    </section>
  );
}

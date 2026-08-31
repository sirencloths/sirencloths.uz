"use client";

import Image from "next/image";
import { heroProducts } from "@/lib/data";
import ProductCard from "./ProductCard";
import { useLanguage } from "./LanguageProvider";

export default function Tactical() {
  const { t } = useLanguage();

  return (
    <section className="tactical" aria-label="Тактичные">
      <a className="tactical-banner" href="#">
        <Image
          src="/images/banner.jpg"
          alt={t("tactical")}
          width={1920}
          height={1080}
        />
        <span className="tactical-banner-copy">
          <span>{t("tactical")}</span>
          <b>{t("go")}</b>
        </span>
      </a>

      <div className="tactical-products">
        {heroProducts.slice(1, 3).map((product) => (
          <ProductCard key={product.id} product={product} small />
        ))}
      </div>
    </section>
  );
}

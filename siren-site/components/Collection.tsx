"use client";

import Image from "next/image";
import { collectionSideProducts } from "@/lib/data";
import ProductCard from "./ProductCard";
import { useLanguage } from "./LanguageProvider";

export default function Collection() {
  const { t } = useLanguage();

  return (
    <section className="collection" id="collections">
      <div className="collection-side">
        {collectionSideProducts.map((product, i) => (
          <ProductCard key={i} product={product} small />
        ))}
      </div>

      <a className="collection-banner" href="#">
        <Image
          src="/images/collection-banner.jpg"
          alt="Новая коллекция SIREN"
          width={1336}
          height={900}
        />
        <span className="banner-copy banner-copy--dark">
          <span>
            {t("newCollection")}
          </span>
          <b>{t("go")}</b>
        </span>
      </a>
    </section>
  );
}

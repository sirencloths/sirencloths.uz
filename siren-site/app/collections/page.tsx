"use client";

import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import Image from "next/image";
import { heroProducts, type Product } from "@/lib/data";
import CollectionsCarousel from "@/components/CollectionsCarousel";
import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";
import { getStorefrontProducts, toStorefrontColorCards } from "@/lib/api";

export default function CollectionsPage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>(heroProducts);
  useEffect(() => { void getStorefrontProducts().then((items) => { if (items.length) setProducts(toStorefrontColorCards(items)); }).catch(() => undefined); }, []);

  return (
    <>
      <FixedTop />

      <main className="collections-page">

        {/* TITLE */}
        <div className="collections-page-heading">
          <h1>{t("collections")}</h1>

          <div className="collections-page-breadcrumb">
            <a href="/">{t("home")}</a>
            <span>&gt;</span>
            <span>{t("collections")}</span>
          </div>
        </div>

        <section className="collections-page-content">
          <CollectionFeature image="/images/collection-banner.jpg" title={t("newCollection")} go={t("go")} />

          <CollectionsCarousel products={products} initialOffset={1} />
        </section>

        <section className="collections-page-content collections-page-content--reverse">
          <CollectionsCarousel products={products} initialOffset={1} />

          <CollectionFeature
            image="/images/large-banner.jpg"
            className="collections-page-feature--right"
            title={t("newCollection")}
            go={t("go")}
          />
        </section>
      </main>

      <Footer />
    </>
  );
}

function CollectionFeature({
  image,
  className = "",
  title,
  go,
}: {
  image: string;
  className?: string;
  title: string;
  go: string;
}) {
  return (
    <div className={`collections-page-feature ${className}`}>
      <a href="#" className="collections-page-feature-link">
        <Image
          src={image}
          alt={title}
          width={460}
          height={490}
          className="collections-page-feature-image"
        />

        <div className="collections-page-feature-text">
          <strong>{title}</strong>
          <span>{go}</span>
        </div>
      </a>
    </div>
  );
}

import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import Recommendation from "@/components/Recommendation";
import ProductInfoAccordion from "@/components/ProductInfoAccordion";
import ProductDetailClient from "@/components/ProductDetailClient";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import { T } from "@/components/LanguageProvider";

import { heroProducts } from "@/lib/data";

import Image from "next/image";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const product = heroProducts.find(
    (item) => item.id === id
  );

  if (!product) {
    return <div><T text="notFound" /></div>;
  }

  return (
    <>
      <FixedTop />

      <main className="product-detail">

        {/* =========================
            CHAP TOMON — RASMLAR
        ========================= */}

        <ProductImageCarousel image={product.image} alt={product.title} />

        <div className="product-detail-images product-detail-images--desktop">

          <div className="product-detail-image">
            <Image
              src={product.image}
              alt={product.title}
              width={865}
              height={865}
              priority
            />
          </div>

          <div className="product-detail-image">
            <Image
              src={product.image}
              alt={product.title}
              width={865}
              height={865}
            />
          </div>

        </div>

        {/* =========================
            O'NG TOMON — PRODUCT INFO
        ========================= */}

        <div className="product-detail-info">

          {/* BREADCRUMB */}

          <div className="product-detail-breadcrumb">
            <a href="/"><T text="home" /></a>

            <span>&gt;</span>

            <span>
              {product.title}
            </span>
          </div>

          {/* TITLE */}

          <h1 className="product-detail-title">
            {product.title}
          </h1>

          {/* PRICE */}

          <p className="product-detail-price">
            {product.price}
          </p>

          {/* COLOR + SIZE + CART */}

          <ProductDetailClient
            id={product.id}
            title={product.title}
            price={product.price}
            image={product.image}
          />

          {/* DELIVERY */}

          <p className="product-delivery">
            <T text="freeDelivery" />
          </p>

          {/* ACCORDION */}

          <ProductInfoAccordion />

        </div>
      </main>

      {/* RECOMMENDATION */}

      <div className="product-detail-recommendations">
        <Recommendation />
      </div>

      <Footer />
    </>
  );
}

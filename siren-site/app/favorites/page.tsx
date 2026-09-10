"use client";

import Image from "next/image";
import Link from "next/link";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { heroProducts, type Product } from "@/lib/data";
import { useFavorites } from "@/components/FavoriteContext";
import { useLanguage } from "@/components/LanguageProvider";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");

function FavoriteCard({ product }: { product: Product }) {
  const { removeFavorite } = useFavorites();
  const { t } = useLanguage();
  const candidateImage = typeof product.image === "string" ? product.image.trim() : "";
  const imageSrc = candidateImage.startsWith("/uploads/") ? `${apiOrigin}${candidateImage}` : candidateImage;
  const isRemoteImage = (() => {
    try { const url = new URL(imageSrc); return url.protocol === "https:" || (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")); }
    catch { return false; }
  })();
  const safeImage = imageSrc.startsWith("/images/") || isRemoteImage ? imageSrc : "/images/p1.jpg";

  return (
    <article className="product-card favorite-product-card">
      <div className="product-image">
        <Link href={`/products/${product.id}${product.colorSlug ? `?color=${encodeURIComponent(product.colorSlug)}` : ""}`} aria-label={product.title}>
          <Image src={safeImage} alt={product.alt} width={350} height={350} unoptimized={isRemoteImage} />
        </Link>
        <button type="button" className="favorite-remove-btn" aria-label={t("unselect")} onClick={() => removeFavorite(product)}>
          <Image src="/icons/close.svg" alt="" width={15} height={15} />
        </button>
      </div>
      <Link href={`/products/${product.id}${product.colorSlug ? `?color=${encodeURIComponent(product.colorSlug)}` : ""}`}>
        <h2>{product.title}</h2>
        <p>{product.color === "GRAY" ? t("gray") : product.color}</p>
        <strong>{product.price}</strong>
      </Link>
    </article>
  );
}

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const { t, locale } = useLanguage();
  const title = locale === "ru" ? "ИЗБРАННЫЕ" : t("favorites");

  return (
    <>
      <FixedTop />
      <main className="favorites-page">
        <section className="favorites-list">
          <h1>{title} <span>({favorites.length})</span></h1>
          {favorites.length ? (
            <div className="favorites-grid">{favorites.map((product) => <FavoriteCard key={`${product.id}:${product.colorSlug || product.color}`} product={product} />)}</div>
          ) : <p className="favorites-empty">{locale === "ru" ? "В избранном пока нет товаров" : t("notFound")}</p>}
        </section>

        <section className="favorites-recommendations">
          <h2>{locale === "ru" ? "РЕКОМЕНДУЕМ" : t("collections")}</h2>
          <div className="favorites-grid">{heroProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>
      </main>
      <Footer />
    </>
  );
}

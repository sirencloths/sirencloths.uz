"use client";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { useFavorites } from "./FavoriteContext";
import { useLanguage } from "./LanguageProvider";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");

type Props = {
  product: Product;
  small?: boolean;
};

export default function ProductCard({ product, small = false }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t } = useLanguage();
  const liked = isFavorite(product.id);
  // Admin-created products may not have an image yet. Never pass an empty URL to next/image.
  const candidateImage = typeof product.image === "string" ? product.image.trim() : "";
  // Accept local assets and valid HTTPS assets added by the admin; reject malformed values.
  const resolvedImage = candidateImage.startsWith("/uploads/")
    ? `${apiOrigin}${candidateImage}`
    : candidateImage;
  const isSafeRemoteImage = (() => {
    try {
      const url = new URL(resolvedImage);
      return url.protocol === "https:" || (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1"));
    } catch { return false; }
  })();
  const imageSrc = resolvedImage.startsWith("/images/") || isSafeRemoteImage
    ? resolvedImage
    : "/images/p1.jpg";
  const hoverCandidate = typeof product.hoverImage === "string" ? product.hoverImage.trim() : "";
  const hoverResolved = hoverCandidate.startsWith("/uploads/") ? `${apiOrigin}${hoverCandidate}` : hoverCandidate;
  const hoverSafeRemote = (() => {
    try { const url = new URL(hoverResolved); return url.protocol === "https:" || (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")); } catch { return false; }
  })();
  const hoverImageSrc = hoverResolved.startsWith("/images/") || hoverSafeRemote ? hoverResolved : "";
  const detailHref = `/products/${product.id}${product.colorSlug ? `?color=${encodeURIComponent(product.colorSlug)}` : ""}`;

  return (
    <article className={`product-card${small ? " product-card--small" : ""}`}>
      <div className="product-image">
        <Link href={detailHref} className="product-card-link" aria-label={product.title}>
          <Image
            className="product-card-image product-card-image--primary"
            src={imageSrc}
            alt={product.alt}
            width={350}
            height={350}
            unoptimized={isSafeRemoteImage}
          />
          {hoverImageSrc && <Image className="product-card-image product-card-image--hover" src={hoverImageSrc} alt="" width={350} height={350} unoptimized={hoverSafeRemote} aria-hidden="true" />}
        </Link>
        <button
          className={`like-btn${liked ? " is-liked" : ""}`}
          type="button"
          aria-label={liked ? "Удалить из избранного" : "Добавить в избранное"}
          aria-pressed={liked}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => toggleFavorite(product)}
        >
          <Image src={liked ? "/icons/heart-filled.svg" : "/icons/heart.svg"} alt="" width={17} height={17} />
        </button>
      </div>

      <Link href={detailHref} className="product-card-link">
        <h2>{product.title}</h2>
        <p>{product.color === "GRAY" ? t("gray") : product.color}</p>
        <strong>{product.price}</strong>
        {product.available === false && <small className="product-card-stock">НЕТ В НАЛИЧИИ</small>}
      </Link>
    </article>
  );
}

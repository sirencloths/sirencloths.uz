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
  favoriteCard?: boolean;
};

export default function ProductCard({ product, small = false, favoriteCard = false }: Props) {
  const { isFavorite, toggleFavorite, removeFavorite } = useFavorites();
  const { t } = useLanguage();
  const liked = isFavorite(product);
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
        {favoriteCard ? <button className="favorite-remove-btn" type="button" aria-label={t("unselect")} onPointerDown={(event) => event.stopPropagation()} onClick={() => removeFavorite(product)}><Image src="/icons/close.svg" alt="" width={15} height={15} /></button> : <button
          className={`like-btn${liked ? " is-liked" : ""}`}
          type="button"
          aria-label={liked ? t("removeFavorite") : t("favoriteAdd")}
          aria-pressed={liked}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => toggleFavorite(product)}
        >
          <Image src={liked ? "/icons/heart-filled.svg" : "/icons/heart.svg"} alt="" width={17} height={17} />
        </button>}
        {product.available === false && <span className="product-card-soldout-overlay">{t("soldOut")}</span>}
        {product.discountPercent ? <span className="product-card-discount-overlay">−{product.discountPercent}%</span> : null}
      </div>

      <Link href={detailHref} className="product-card-link">
        <h2>{product.title}</h2>
        <p>{product.color === "GRAY" ? t("gray") : product.color}</p>
        <div className={`product-card-pricing${product.discountPercent ? " is-sale" : ""}`}>
          <strong className={product.discountPercent ? "product-card-price--sale" : ""}>{product.price}</strong>
          {product.oldPrice && <del className="product-card-old-price">{product.oldPrice}</del>}
        </div>
      </Link>
    </article>
  );
}

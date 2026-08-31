"use client";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { useFavorites } from "./FavoriteContext";
import { useLanguage } from "./LanguageProvider";

type Props = {
  product: Product;
  small?: boolean;
};

export default function ProductCard({ product, small = false }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t } = useLanguage();
  const liked = isFavorite(product.id);

  return (
    <article className={`product-card${small ? " product-card--small" : ""}`}>
      <div className="product-image">
        <Link href={`/products/${product.id}`} className="product-card-link" aria-label={product.title}>
          <Image
            src={product.image}
            alt={product.alt}
            width={350}
            height={350}
          />

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

      <Link href={`/products/${product.id}`} className="product-card-link">
        <h2>{product.title}</h2>
        <p>{product.color === "GRAY" ? t("gray") : product.color}</p>
        <strong>{product.price}</strong>
      </Link>
    </article>
  );
}

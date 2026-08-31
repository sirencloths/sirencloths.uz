"use client";

import { useState } from "react";
import Image from "next/image";

import ProductColorSelector from "@/components/ProductColorSelector";
import ProductSizeSelector from "@/components/ProductSizeSelector";
import AddToCartButton from "@/components/AddToCartButton";
import { useLanguage } from "./LanguageProvider";
import { useFavorites } from "./FavoriteContext";

type Props = {
  id: string;
  title: string;
  price: string;
  image: string;
};

export default function ProductDetailClient({
  id,
  title,
  price,
  image,
}: Props) {
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favoriteProduct = { id, title, price, image, alt: title, color: "GRAY" };
  const liked = isFavorite(id);
  const [selectedColor, setSelectedColor] =
    useState<"darkGray" | "black" | "cream" | "pink">("darkGray");

  const [selectedSize, setSelectedSize] =
    useState("S");

  return (
    <>
      <ProductColorSelector
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
      />

      <ProductSizeSelector
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
      />

      <div className="product-actions">
        <AddToCartButton
          id={id}
          title={title}
          price={price}
          image={image}
          color={selectedColor}
          size={selectedSize}
        />

        <button
          type="button"
          className={`product-favorite-btn${liked ? " is-liked" : ""}`}
          aria-label={liked ? "Удалить из избранного" : t("favoriteAdd")}
          aria-pressed={liked}
          onClick={() => toggleFavorite(favoriteProduct)}
        >
          <Image
            src={liked ? "/icons/heart-filled.svg" : "/icons/heart.svg"}
            alt=""
            width={28}
            height={28}
          />
        </button>
      </div>
    </>
  );
}

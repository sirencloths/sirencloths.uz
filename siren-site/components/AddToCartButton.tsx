"use client";

import { useState } from "react";
import { useCart } from "./CartContext";
import Image from "next/image";
import { useLanguage } from "./LanguageProvider";

type Props = {
  id: string;
  title: string;
  price: string;
  image: string;
  color: string;
  size: string;
  isSale?: boolean;
};

export default function AddToCartButton({
  id,
  title,
  price,
  image,
  color,
  size,
  isSale = false,
}: Props) {
  const { addToCart, openCart } = useCart();
  const { t } = useLanguage();

  const [added, setAdded] = useState(false);

  const goToCart = () => openCart();

  const handleClick = () => {
    if (added) {
      goToCart();
      return;
    }

    addToCart({
      id,
      title,
      price,
      image,
      color,
      size,
      isSale,
    });

    setAdded(true);
    goToCart();
  };

  return (
    <button
      type="button"
      className={`add-to-cart-btn ${
        added ? "added" : ""
      }`}
      onClick={handleClick}
    >
      {added ? (
        <>
          <span className="cart-btn-text">
            {t("goToCart")}
          </span>

          <Image
            src="/icons/arrow-right.svg"
            alt=""
            width={16}
            height={16}
            className="cart-btn-arrow"
          />
        </>
      ) : (
        t("addToCart")
      )}
    </button>
  );
}

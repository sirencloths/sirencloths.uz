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
};

export default function AddToCartButton({
  id,
  title,
  price,
  image,
  color,
  size,
}: Props) {
  const { addToCart } = useCart();
  const { t } = useLanguage();

  const [added, setAdded] = useState(false);

  const handleClick = () => {
    if (added) {
      window.location.href = "/cart";
      return;
    }

    addToCart({
      id,
      title,
      price,
      image,
      color,
      size,
    });

    setAdded(true);
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

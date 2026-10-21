"use client";

import { useCart } from "./CartContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useCustomerAuth } from "./CustomerAuthProvider";

type Props = {
  id: string;
  productId: string;
  title: string;
  price: string;
  originalPrice?: string;
  discountPercent?: number;
  personalDiscount?: boolean;
  image: string;
  color: string;
  size: string;
  isSale?: boolean;
  inventoryQuantity?: number;
};

export default function AddToCartButton({
  id,
  productId,
  title,
  price,
  originalPrice,
  discountPercent,
  personalDiscount,
  image,
  color,
  size,
  isSale = false,
  inventoryQuantity,
}: Props) {
  const { addToCart, cart, openCart } = useCart();
  const router = useRouter();
  const { t } = useLanguage();
  const { customer, openAuth } = useCustomerAuth();

  // Never keep this state locally: the same variant can be removed from the
  // drawer while this product page stays open.
  const added = cart.some((item) => item.id === id && item.color === color && item.size === size);

  const goToCart = () => {
    if (window.matchMedia("(min-width: 761px)").matches) openCart();
    else router.push("/cart");
  };

  const handleClick = () => {
    if (!customer) { openAuth(); return; }
    if (added) {
      goToCart();
      return;
    }

    addToCart({
      id,
      productId,
      title,
      price,
      originalPrice,
      discountPercent,
      personalDiscount,
      image,
      color,
      size,
      isSale,
      inventoryQuantity,
    });

    if (window.matchMedia("(min-width: 761px)").matches) goToCart();
  };

  return (
    <button
      type="button"
      className={`add-to-cart-btn ${
        added ? "added" : ""
      }`}
      onClick={handleClick}
      disabled={inventoryQuantity !== undefined && inventoryQuantity < 1}
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

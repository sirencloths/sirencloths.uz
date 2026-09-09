"use client";

import Image from "next/image";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { useCart } from "@/components/CartContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { cartItemPrice, shippingCost } from "@/lib/commerce";

const legacyColorKeys: Record<string, "darkGray" | "black" | "cream" | "pink"> = {
  "ТЕМНО СЕРЫЙ": "darkGray",
  "ЧЕРНЫЙ": "black",
  "КРЕМОВЫЙ": "cream",
  "РОЗОВЫЙ": "pink",
  darkGray: "darkGray",
  black: "black",
  cream: "cream",
  pink: "pink",
};
const assetOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const cartImageUrl = (value: string) => value.startsWith("/uploads/") ? `${assetOrigin}${value}` : value;
const uzs = (value: number, locale: string) => `${value.toLocaleString(locale)} UZS`;

export default function CartPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  const [promo, setPromo] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);

  // Tanlangan mahsulotlar
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Har bir product uchun unique key
  const getItemKey = (item: {
    id: string;
    color: string;
    size: string;
  }) => {
    return `${item.id}-${item.color}-${item.size}`;
  };

  useEffect(() => {
    setSelectedItems((current) => current.length
      ? current
      : cart.map(getItemKey));
  }, [cart]);

  useEffect(() => {
    const savedPromo = window.localStorage.getItem("siren-cart-promo");
    if (savedPromo === "ALEX10") {
      setPromo(savedPromo);
      setDiscountApplied(true);
    }
  }, []);

  // Checkbox
  const toggleItem = (itemKey: string) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemKey)) {
        return prev.filter((key) => key !== itemKey);
      }

      return [...prev, itemKey];
    });
  };

  // Faqat tanlangan mahsulotlar hisoblanadi
  const subtotal = cart.reduce(
    (sum, item) => {
      const itemKey = getItemKey(item);

      if (!selectedItems.includes(itemKey)) {
        return sum;
      }

      const price = cartItemPrice(item.price);

      return sum + price * item.quantity;
    },
    0
  );

  const discount = discountApplied
    ? subtotal * 0.1
    : 0;

  const delivery = shippingCost(subtotal, selectedItems.length);

  const total = subtotal - discount + delivery;

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === "ALEX10") {
      setPromo("ALEX10");
      setDiscountApplied(true);
      localStorage.setItem("siren-cart-promo", "ALEX10");
    } else {
      setDiscountApplied(false);
      localStorage.removeItem("siren-cart-promo");
    }
  };

  const removePromo = () => {
    setPromo("");
    setDiscountApplied(false);
    localStorage.removeItem("siren-cart-promo");
  };

  const updatePromo = (value: string) => {
    setPromo(value);
    if (discountApplied) setDiscountApplied(false);
    localStorage.removeItem("siren-cart-promo");
  };

  return (
    <>
      <FixedTop />

      <main className="cart-page">

        <div className="cart-mobile-heading">
          <h1>{t("cart")}</h1>
          <button type="button" aria-label="Korzinani yopish" onClick={() => router.push("/shop")}>×</button>
        </div>

        {/* CART TITLE */}
        <div className="cart-title">
          <h1>{t("cart")}</h1>

          <span className="cart-count">
            ({cart.length})
          </span>
        </div>

        {/* PRODUCTS */}
        <div className="cart-products">

          {cart.map((item) => {
            const itemKey = getItemKey(item);
            const translatedColor = legacyColorKeys[item.color]
              ? t(legacyColorKeys[item.color])
              : item.color;

            const isSelected =
              selectedItems.includes(itemKey);

            return (
              <div
                key={itemKey}
                className="cart-product"
              >

                {/* IMAGE */}
                <div className="cart-product-image">
                  <img
                    src={cartImageUrl(item.image)}
                    alt={item.title}
                  />
                </div>

                {/* INFO */}
                <div className="cart-product-info">

                  <div className="cart-product-row cart-product-row--name">
                    <strong>
                      {t("name")}
                    </strong>

                    <span>
                      {item.title}
                    </span>
                  </div>

                  <div className="cart-product-row cart-product-row--color">
                    <strong>
                      {t("color")}
                    </strong>

                    <span className="cart-product-color">
                      {translatedColor}
                    </span>
                  </div>

                  <div className="cart-product-row cart-product-row--size">
                    <strong>
                      {t("size")}
                    </strong>

                    <span>
                      {item.size}
                    </span>
                  </div>

                  <div className="cart-product-price">
                    <span className="cart-desktop-price">{item.price}</span>
                    <span className="cart-mobile-price">{uzs(cartItemPrice(item.price) * item.quantity, locale)}</span>
                  </div>

                </div>

                {/* RIGHT */}
                <div className="cart-product-right">

                  {/* CHECK */}
                  <button
                    type="button"
                    className="cart-product-check"
                    onClick={() =>
                      toggleItem(itemKey)
                    }
                    aria-label={
                      isSelected
                        ? t("unselect")
                        : t("select")
                    }
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <Image
                        src="/icons/check.svg"
                        alt="Выбрано"
                        width={24}
                        height={24}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    className="cart-product-remove"
                    onClick={() => removeFromCart(item.id, item.color, item.size)}
                    aria-label={`${item.title}ni korzinadan olib tashlash`}
                  >
                    ⌫
                  </button>

                  {/* QUANTITY */}
                  <div className="cart-product-quantity">

                    <button
                      type="button"
                      onClick={() =>
                        decreaseQuantity(item.id)
                      }
                      aria-label={t("decrease")}
                    >
                      −
                    </button>

                    <span>
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        increaseQuantity(item.id)
                      }
                      aria-label={t("increase")}
                    >
                      +
                    </button>

                  </div>

                </div>

              </div>
            );
          })}

          {!cart.length && <p className="mobile-cart-empty">КОРЗИНА ПУСТА</p>}

        </div>

        {/* ORDER CALCULATOR */}
        <div className="cart-calculator">

          {/* PROMO */}
          <div className="cart-promo">

            <h2>
              {t("discountCode")}
            </h2>

            <div className="cart-promo-row">

              <div className={`cart-promo-input${discountApplied ? " is-applied" : ""}`}>
                <input
                  type="text"
                  placeholder={t("enterCode")}
                  value={promo}
                  readOnly={discountApplied}
                  onChange={(event) => updatePromo(event.target.value)}
                />
                {discountApplied && <span aria-label="Promokod qabul qilindi">✓</span>}
              </div>

              <button
                type="button"
                onClick={discountApplied ? removePromo : applyPromo}
              >
                {discountApplied ? "OLIB TASHLASH" : t("apply")}
              </button>

            </div>

          </div>

          {/* SUMMARY */}
          <div className="cart-summary">

            <h2>
              {t("orderSummary")}
            </h2>

            <div className="cart-summary-row">

              <span>
                {t("subtotal")}
              </span>

              <span>
                {subtotal.toLocaleString(locale)} СУМ
              </span>

            </div>

            {discountApplied && (
              <div className="cart-summary-row cart-summary-row--promo">
                <span>КОД ALEX10 · 10%</span>
                <span className="cart-discount">−{discount.toLocaleString(locale)} СУМ</span>
              </div>
            )}

            {delivery > 0 && <div className="cart-summary-row">
              <span>{t("estimatedDelivery")}</span>
              <span>{delivery.toLocaleString(locale)} СУМ</span>
            </div>}

            <div className="cart-summary-total">

              <span>
                {t("total")}
              </span>

              <div>

                {discountApplied && (
                  <span className="cart-old-price">
                    {(subtotal + delivery).toLocaleString(
                      locale
                    )} СУМ
                  </span>
                )}

                <span>
                  {total.toLocaleString(locale)} СУМ
                </span>

              </div>

            </div>

          </div>

          {/* CHECKOUT */}
          <button
            type="button"
            className="cart-checkout-btn"
            onClick={() => router.push("/checkout")}
          >
            {t("checkout")}
          </button>

        </div>

      </main>

      <aside className="mobile-cart-summary">
        <div className="mobile-cart-shipping" aria-label="Bepul yetkazib berish">
          <b>БЕСПЛАТНАЯ ДОСТАВКА</b>
          <span><i /></span>
          <small>Доставка включена в стоимость заказа</small>
        </div>
        <div className="mobile-cart-summary-promo">
          <div className={`cart-promo-input${discountApplied ? " is-applied" : ""}`}>
            <input type="text" placeholder={t("enterCode")} value={promo} readOnly={discountApplied} onChange={(event) => updatePromo(event.target.value)} />
            {discountApplied && <span aria-label="Promokod qabul qilindi">✓</span>}
          </div>
          <button type="button" onClick={discountApplied ? removePromo : applyPromo}>{discountApplied ? "OLIB TASHLASH" : t("apply")}</button>
        </div>
        <div className="mobile-cart-summary-details">
          <div><span>{t("subtotal")} ({selectedItems.length})</span><b>{uzs(subtotal, locale)}</b></div>
          {discountApplied && <div><span>КОД ALEX10</span><b className="cart-discount">−{uzs(discount, locale)}</b></div>}
        </div>

        <div className="mobile-cart-summary-total">
          <span>{t("total")}</span>
          <b>{uzs(total, locale)}</b>
        </div>

        {cart.length > 0 && <button type="button" className="mobile-cart-checkout" onClick={() => router.push("/checkout")}>
          {t("checkout")}
        </button>}
      </aside>

      <div className="cart-page-footer"><Footer /></div>
    </>
  );
}

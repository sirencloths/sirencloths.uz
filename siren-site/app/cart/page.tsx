"use client";

import Image from "next/image";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { useCart } from "@/components/CartContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

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

export default function CartPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  const [promo, setPromo] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

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

      const price = Number(
        item.price.replace(/\D/g, "")
      );

      return sum + price * item.quantity;
    },
    0
  );

  const discount = discountApplied
    ? subtotal * 0.1
    : 0;

  const delivery = selectedItems.length > 0
    ? 60000
    : 0;

  const total = subtotal - discount + delivery;

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === "ALEX10") {
      setDiscountApplied(true);
      localStorage.setItem("siren-cart-promo", "ALEX10");
    } else {
      localStorage.removeItem("siren-cart-promo");
    }
  };

  return (
    <>
      <FixedTop />

      <main className="cart-page">

        {/* CART TITLE */}
        <div className="cart-title">
          <h1>{t("cart")}</h1>

          <span className="cart-count">
            ({cart.length})
          </span>
        </div>

        <div className="mobile-cart-promo">
          <input
            type="text"
            placeholder={t("enterCode")}
            value={promo}
            onChange={(event) => {
              setPromo(event.target.value);
              setDiscountApplied(false);
              localStorage.removeItem("siren-cart-promo");
            }}
          />
          <button type="button" onClick={applyPromo}>{t("apply")}</button>
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
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="337px"
                  />
                </div>

                {/* INFO */}
                <div className="cart-product-info">

                  <div className="cart-product-row">
                    <strong>
                      {t("name")}
                    </strong>

                    <span>
                      {item.title}
                    </span>
                  </div>

                  <div className="cart-product-row">
                    <strong>
                      {t("color")}
                    </strong>

                    <span className="cart-product-color">
                      {translatedColor}
                    </span>
                  </div>

                  <div className="cart-product-row">
                    <strong>
                      {t("size")}
                    </strong>

                    <span>
                      {item.size}
                    </span>
                  </div>

                  <div className="cart-product-price">
                    {item.price}
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

        </div>

        {/* ORDER CALCULATOR */}
        <div className="cart-calculator">

          {/* PROMO */}
          <div className="cart-promo">

            <h2>
              {t("discountCode")}
            </h2>

            <div className="cart-promo-row">

              <input
                type="text"
                placeholder={t("enterCode")}
                value={promo}
                onChange={(e) => {
                  setPromo(e.target.value);
                  setDiscountApplied(false);
                  localStorage.removeItem("siren-cart-promo");
                }}
              />

              <button
                type="button"
                onClick={applyPromo}
              >
                {t("apply")}
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

            <div className="cart-summary-row">

              <span>
                КОД{" "}
                {discountApplied
                  ? "ALEX10"
                  : ""}
              </span>

              <span className="cart-discount">
                {discountApplied
                  ? "-10%"
                  : ""}
              </span>

            </div>

            <div className="cart-summary-row">

              <span>
                {t("estimatedDelivery")}
              </span>

              <span>
                {delivery.toLocaleString(locale)} СУМ
              </span>

            </div>

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

      <aside className={`mobile-cart-summary${isMobileSummaryOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="mobile-cart-summary-trigger"
          aria-expanded={isMobileSummaryOpen}
          onClick={() => setIsMobileSummaryOpen((isOpen) => !isOpen)}
        >
          <span>{t("orderSummary")}</span>
          <Image src={isMobileSummaryOpen ? "/icons/arrow-down.svg" : "/icons/arrow-up.svg"} alt="" width={22} height={12} />
        </button>

        <div className="mobile-cart-summary-details">
          <div><span>{t("subtotal")}</span><b>{subtotal.toLocaleString(locale)} СУМ</b></div>
          {discountApplied && <div><span>КОД ALEX10</span><b className="cart-discount">−{discount.toLocaleString(locale)} СУМ</b></div>}
          <div><span>{t("estimatedDelivery")}</span><b>{delivery.toLocaleString(locale)} СУМ</b></div>
        </div>

        <div className="mobile-cart-summary-total">
          <span>{t("total")}</span>
          <b>{total.toLocaleString(locale)} СУМ</b>
        </div>

        <button type="button" className="mobile-cart-checkout" onClick={() => router.push("/checkout")}>
          {t("checkout")}
        </button>
      </aside>

      <Footer />
    </>
  );
}

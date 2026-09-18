"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { useLanguage } from "./LanguageProvider";
import { cartItemPrice, FREE_DELIVERY_THRESHOLD, shippingCost } from "@/lib/commerce";
import { useModalLock } from "./useModalLock";

const money = (value: number, locale: string) => `${value.toLocaleString(locale)} UZS`;
const assetOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const cartImageUrl = (value: string) => value.startsWith("/uploads/") ? `${assetOrigin}${value}` : value;
const DRAWER_TRANSITION_MS = 500;

export default function CartDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useLanguage();
  const { cart, cartCount, subtotal, isCartOpen, closeCart, removeFromCart, increaseQuantity, decreaseQuantity } = useCart();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const delivery = shippingCost(subtotal, cartCount);
  const total = Math.max(0, subtotal + delivery);
  const deliveryProgress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));
  const deliveryRemaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  useModalLock(isCartOpen);

  useEffect(() => {
    if (isCartOpen) {
      setMounted(true);
      // The first frame paints the drawer just outside the viewport; the
      // second starts the transition. A single frame can be coalesced by the
      // browser, which made the drawer appear instantly instead of sliding in.
      let nextFrame = 0;
      const frame = window.requestAnimationFrame(() => {
        nextFrame = window.requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        window.cancelAnimationFrame(frame);
        window.cancelAnimationFrame(nextFrame);
      };
    }
    setVisible(false);
    // Keep the layer mounted for the exact visual transition.  Removing it
    // early used to make close feel abruptly faster than open.
    const timeout = window.setTimeout(() => setMounted(false), DRAWER_TRANSITION_MS);
    return () => window.clearTimeout(timeout);
  }, [isCartOpen]);

  useEffect(() => {
    if (!isCartOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeCart(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCartOpen, closeCart]);

  if (pathname.startsWith("/social") || !mounted) return null;
  const checkout = () => {
    closeCart();
    // Let the overlay history entry settle first, then perform one normal
    // route push. This avoids the Back action racing the checkout navigation.
    window.setTimeout(() => router.push("/checkout"), 0);
  };

  const freeDeliveryLabel = deliveryRemaining
    ? `${t("freeDeliveryRemaining")} ${money(deliveryRemaining, locale)}`
    : t("freeDeliveryReached");

  return <div className={`cart-drawer-layer ${visible ? "is-visible" : ""}`} role="presentation" onMouseDown={closeCart}>
    <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label={t("cart")} onMouseDown={(event) => event.stopPropagation()}>
      <header className="cart-drawer-head">
        <h2>{t("cart")}</h2>
        <button type="button" onClick={closeCart} aria-label={t("close")}>×</button>
      </header>
      {cart.length > 0 && <div className="cart-drawer-shipping" aria-label={t("freeDelivery")}>
        <b>{freeDeliveryLabel}</b>
        <span><i style={{ width: `${deliveryProgress}%` }} /></span>
      </div>}
      <div className="cart-drawer-items">
        {cart.length ? cart.map((item) => <article className="cart-drawer-item" key={`${item.id}-${item.color}-${item.size}`}>
          <img src={cartImageUrl(item.image)} alt={item.title} />
          <div><strong>{item.title}</strong><small>{item.color} · {item.size}</small><b>{money(cartItemPrice(item.price) * item.quantity, locale)}</b><div className="cart-drawer-stepper"><button type="button" onClick={() => decreaseQuantity(item.id)} aria-label="Уменьшить">−</button><span>{item.quantity}</span><button type="button" onClick={() => increaseQuantity(item.id)} aria-label="Увеличить">+</button></div></div>
          <button type="button" className="cart-drawer-remove" onClick={() => removeFromCart(item.id, item.color, item.size)} aria-label={t("remove")}>⌫</button>
        </article>) : <p className="cart-drawer-empty">{t("cartEmpty")}</p>}
      </div>
      <footer className="cart-drawer-foot">
        <div className="cart-drawer-subtotal"><span>{t("cartSubtotalWithCount").replace("{count}", String(cartCount))}</span><b>{money(subtotal, locale)}</b></div>
        {delivery > 0 && <div className="cart-drawer-summary-row"><span>{t("estimatedDelivery")}</span><b>{money(delivery, locale)}</b></div>}
        <div className="cart-drawer-total"><span>{t("total")}</span><b>{money(total, locale)}</b></div>
        <button type="button" className="cart-drawer-checkout" disabled={!cart.length} onClick={checkout}>{t("checkout")} →</button>
      </footer>
    </aside>
  </div>;
}

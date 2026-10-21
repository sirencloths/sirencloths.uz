"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CartItem, useCart } from "./CartContext";
import { useLanguage } from "./LanguageProvider";
import { cartDiscount, cartItemPrice, FREE_DELIVERY_THRESHOLD, shippingCost } from "@/lib/commerce";
import { useModalLock } from "./useModalLock";
import { customerApi, useCustomerAuth } from "./CustomerAuthProvider";

const money = (value: number, locale: string) => `${value.toLocaleString(locale)} UZS`;
const assetOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const cartImageUrl = (value: string) => value.startsWith("/uploads/") ? `${assetOrigin}${value}` : value;
const DRAWER_TRANSITION_MS = 500;

export default function CartDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useLanguage();
  const { cart, cartCount, subtotal, isCartOpen, closeCart, dismissCart, removeFromCart, increaseQuantity, decreaseQuantity } = useCart();
  const { customer, openAuth } = useCustomerAuth();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  // Desktop drawer keeps the existing layout; confirmation is rendered as a
  // separate layer so the product rows never shift or change their design.
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);
  const delivery = shippingCost(subtotal, cartCount);
  const discount = cartDiscount(cart);
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
    if (!customer) { openAuth(); return; }
    dismissCart();
    router.push("/checkout");
  };

  const freeDeliveryLabel = deliveryRemaining
    ? `${t("freeDeliveryRemaining")} ${money(deliveryRemaining, locale)}`
    : t("freeDeliveryReached");
  const personalCopy = locale === "ja" ? { title: "個人割引が有効です", body: "この商品をカートから削除すると、個人割引も削除されます。", cancel: "キャンセル", confirm: "削除して割引を無効にする" } : locale === "en" ? { title: "Personal discount is active", body: "Removing this item from the cart will also remove its personal discount.", cancel: "Cancel", confirm: "Remove item and discount" } : locale === "ru" ? { title: "Персональная скидка активна", body: "Если удалить этот товар из корзины, его персональная скидка тоже будет удалена.", cancel: "Отмена", confirm: "Удалить товар и скидку" } : { title: "Individual chegirma faol", body: "Bu mahsulotni savatdan olib tashlasangiz, uning individual chegirmasi ham o‘chadi.", cancel: "Bekor qilish", confirm: "Mahsulot va chegirmani o‘chirish" };
  const confirmRemoval = async () => {
    if (!itemToRemove) return;
    // The local cart can be from an older session and may not contain the
    // personalDiscount flag. Ask the server to revoke any matching personal
    // offer regardless; a missing offer is harmless and must not block removal.
    if (itemToRemove.productId) {
      const token = localStorage.getItem("siren-customer-token");
      if (token) await customerApi(`/checkout/customer/personal-discounts/${itemToRemove.productId}`, undefined, token, "DELETE").catch(() => undefined);
    }
    removeFromCart(itemToRemove.id, itemToRemove.color, itemToRemove.size);
    setItemToRemove(null);
  };

  return <div className={`cart-drawer-layer ${visible ? "is-visible" : ""}`} role="presentation" onMouseDown={closeCart}>
    <aside className={`cart-drawer${cart.length ? "" : " is-empty"}`} role="dialog" aria-modal="true" aria-label={t("cart")} onMouseDown={(event) => event.stopPropagation()}>
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
          <div><strong>{item.title}</strong><small>{item.color} · {item.size}</small><b className={item.originalPrice ? "cart-drawer-sale-price" : ""}>{money(cartItemPrice(item.price) * item.quantity, locale)}</b>{item.originalPrice && <del>{money(cartItemPrice(item.originalPrice) * item.quantity, locale)}</del>}{item.discountPercent && <em>−{item.discountPercent}%</em>}<div className="cart-drawer-stepper"><button type="button" onClick={() => item.quantity === 1 ? item.personalDiscount ? setItemToRemove(item) : removeFromCart(item.id, item.color, item.size) : decreaseQuantity(item.id, item.color, item.size)} aria-label="Уменьшить">−</button><span>{item.quantity}</span><button type="button" onClick={() => increaseQuantity(item.id, item.color, item.size)} aria-label="Увеличить" disabled={item.inventoryQuantity !== undefined && item.quantity >= item.inventoryQuantity}>+</button></div></div>
          <button type="button" className="cart-drawer-remove" onClick={() => item.personalDiscount ? setItemToRemove(item) : removeFromCart(item.id, item.color, item.size)} aria-label={t("remove")}>⌫</button>
        </article>) : <div className="cart-drawer-empty"><p>{t("cartEmpty")}</p><Link className="cart-drawer-empty-action" href="/shop" onClick={closeCart}>{t("shop")} →</Link></div>}
      </div>
      <footer className="cart-drawer-foot">
        <div className="cart-drawer-subtotal"><span>{t("cartSubtotalWithCount").replace("{count}", String(cartCount))}</span><b>{money(subtotal, locale)}</b></div>
        {discount > 0 && <div className="cart-drawer-summary-row is-discount"><span>Chegirma</span><b>−{money(discount, locale)}</b></div>}
        {delivery > 0 && <div className="cart-drawer-summary-row"><span>{t("estimatedDelivery")}</span><b>{money(delivery, locale)}</b></div>}
        <div className="cart-drawer-total"><span>{t("total")}</span><b>{money(total, locale)}</b></div>
        <button type="button" className="cart-drawer-checkout" disabled={!cart.length} onClick={checkout}>{t("checkout")} →</button>
      </footer>
    </aside>
    {itemToRemove && <div className="cart-remove-backdrop" role="presentation" onMouseDown={(event) => { event.stopPropagation(); setItemToRemove(null); }}><section className="cart-remove-confirm" role="dialog" aria-modal="true" aria-labelledby="drawer-remove-title" onMouseDown={(event) => event.stopPropagation()}><p>{itemToRemove.personalDiscount ? "INDIVIDUAL DISCOUNT" : "SAVATCHA"}</p><h2 id="drawer-remove-title">{itemToRemove.personalDiscount ? personalCopy.title : "Mahsulotni olib tashlaysizmi?"}</h2><span>{itemToRemove.personalDiscount ? personalCopy.body : `${itemToRemove.title}${itemToRemove.color ? ` · ${itemToRemove.color}` : ""}${itemToRemove.size ? ` · ${itemToRemove.size}` : ""}`}</span><div><button type="button" onClick={() => setItemToRemove(null)}>{itemToRemove.personalDiscount ? personalCopy.cancel : "Bekor qilish"}</button><button type="button" onClick={() => void confirmRemoval()}>{itemToRemove.personalDiscount ? personalCopy.confirm : "Olib tashlash"}</button></div></section></div>}
  </div>;
}

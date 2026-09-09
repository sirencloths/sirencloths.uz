"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartContext";
import { useLanguage } from "./LanguageProvider";
import { cartItemPrice, shippingCost } from "@/lib/commerce";

const money = (value: number, locale: string) => `${value.toLocaleString(locale)} СУМ`;
const assetOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const cartImageUrl = (value: string) => value.startsWith("/uploads/") ? `${assetOrigin}${value}` : value;

export default function CartDrawer() {
  const router = useRouter();
  const { locale } = useLanguage();
  const { cart, cartCount, subtotal, isCartOpen, closeCart, removeFromCart, increaseQuantity, decreaseQuantity } = useCart();
  const [promo, setPromo] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const discount = appliedPromo === "ALEX10" ? Math.round(subtotal * 0.1) : 0;
  const delivery = shippingCost(subtotal, cartCount);
  const total = Math.max(0, subtotal - discount + delivery);

  useEffect(() => {
    const savedPromo = localStorage.getItem("siren-cart-promo");
    if (savedPromo === "ALEX10") { setPromo(savedPromo); setAppliedPromo(savedPromo); }
  }, []);

  useEffect(() => {
    if (isCartOpen) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(timeout);
  }, [isCartOpen]);

  useEffect(() => {
    if (!isCartOpen) return;
    const priorOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeCart(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = priorOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [isCartOpen, closeCart]);

  if (!mounted) return null;
  const applyPromo = () => {
    if (promo.trim().toUpperCase() === "ALEX10") {
      localStorage.setItem("siren-cart-promo", "ALEX10");
      setAppliedPromo("ALEX10");
      setPromoMessage("ALEX10 kodi qo‘llandi: 10% chegirma.");
    } else {
      localStorage.removeItem("siren-cart-promo");
      setAppliedPromo("");
      setPromoMessage("Kod topilmadi.");
    }
  };
  const removePromo = () => {
    localStorage.removeItem("siren-cart-promo");
    setPromo("");
    setAppliedPromo("");
    setPromoMessage("");
  };
  const checkout = () => { closeCart(); router.push("/checkout"); };

  return <div className={`cart-drawer-layer ${visible ? "is-visible" : ""}`} role="presentation" onMouseDown={closeCart}>
    <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Корзина" onMouseDown={(event) => event.stopPropagation()}>
      <header className="cart-drawer-head">
        <h2>КОРЗИНА</h2>
        <button type="button" onClick={closeCart} aria-label="Закрыть">×</button>
      </header>
      <div className="cart-drawer-items">
        {cart.length ? cart.map((item) => <article className="cart-drawer-item" key={`${item.id}-${item.color}-${item.size}`}>
          <img src={cartImageUrl(item.image)} alt={item.title} />
          <div><strong>{item.title}</strong><small>{item.color} · {item.size}</small><b>{money(cartItemPrice(item.price) * item.quantity, locale)}</b><div className="cart-drawer-stepper"><button type="button" onClick={() => decreaseQuantity(item.id)} aria-label="Уменьшить">−</button><span>{item.quantity}</span><button type="button" onClick={() => increaseQuantity(item.id)} aria-label="Увеличить">+</button></div></div>
          <button type="button" className="cart-drawer-remove" onClick={() => removeFromCart(item.id, item.color, item.size)} aria-label="Удалить">⌫</button>
        </article>) : <p className="cart-drawer-empty">КОРЗИНА ПУСТА</p>}
      </div>
      <footer className="cart-drawer-foot">
        <div className="cart-drawer-promo"><div className={`cart-promo-input${appliedPromo ? " is-applied" : ""}`}><input value={promo} readOnly={Boolean(appliedPromo)} onChange={(event) => { setPromo(event.target.value); setPromoMessage(""); }} placeholder="СКИДОЧНЫЙ КОД" />{appliedPromo && <span aria-label="Promokod qabul qilindi">✓</span>}</div><button type="button" onClick={appliedPromo ? removePromo : applyPromo}>{appliedPromo ? "OLIB TASHLASH" : "ПРИМЕНИТЬ"}</button></div>
        {promoMessage && <p className="cart-drawer-promo-message">{promoMessage}</p>}
        <div className="cart-drawer-subtotal"><span>ПРОМЕЖУТОЧНЫЙ ИТОГ ({cartCount})</span><b>{money(subtotal, locale)}</b></div>
        {appliedPromo && <div className="cart-drawer-summary-row cart-drawer-summary-row--discount"><span>КОД {appliedPromo} · 10%</span><b>−{money(discount, locale)}</b></div>}
        {delivery > 0 && <div className="cart-drawer-summary-row"><span>ДОСТАВКА</span><b>{money(delivery, locale)}</b></div>}
        <div className="cart-drawer-total"><span>ИТОГО</span><b>{money(total, locale)}</b></div>
        <button type="button" className="cart-drawer-checkout" disabled={!cart.length} onClick={checkout}>ОФОРМИТЬ ЗАКАЗ →</button>
      </footer>
    </aside>
  </div>;
}

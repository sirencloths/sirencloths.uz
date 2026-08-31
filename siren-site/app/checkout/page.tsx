"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import type { Order, OrderStatus } from "@/lib/orders";

const payments = ["КАРТА", "PAYME", "CLICK", "PAYNET"] as const;
const countries = ["Узбекистан", "Казахстан", "Кыргызстан", "Таджикистан"];
type Payment = (typeof payments)[number];

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment>("КАРТА");
  const [country, setCountry] = useState("Узбекистан");
  const [countryOpen, setCountryOpen] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", address: "", city: "", phone: "", card: "", expiry: "", cvc: "" });
  const [promo, setPromo] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [error, setError] = useState("");
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price.replace(/\D/g, "")) * item.quantity, 0), [cart]);
  const shipping = cart.length ? 60000 : 0;
  const discount = discountApplied ? subtotal * .1 : 0;
  const total = subtotal - discount + shipping;
  const money = (value: number) => `${value.toLocaleString("ru-RU")} СУМ`;
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (localStorage.getItem("siren-cart-promo") === "ALEX10") {
      setPromo("ALEX10");
      setDiscountApplied(true);
    }
  }, []);

  const pay = (event: FormEvent) => {
    event.preventDefault();
    const required = [form.email, form.firstName, form.lastName, form.address, form.city, form.phone];
    if (required.some((value) => !value.trim())) {
      setError("ЗАПОЛНИТЕ ВСЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ");
      return;
    }
    const order: Order = { id: crypto.randomUUID().slice(0, 8).toUpperCase(), paidAt: new Date().toISOString(), status: "in_transit" as OrderStatus, items: cart, total: money(total) };
    const saved = JSON.parse(localStorage.getItem("siren-orders") ?? "[]");
    localStorage.setItem("siren-orders", JSON.stringify([order, ...(Array.isArray(saved) ? saved : [])]));
    localStorage.removeItem("siren-cart-promo");
    clearCart();
    router.push("/profile");
  };

  if (!cart.length) return <main className="checkout-empty"><Image src="/icons/logo.svg" alt="SIREN" width={132} height={32} /><h1>КОРЗИНА ПУСТА</h1><button onClick={() => router.push("/shop")}>В МАГАЗИН</button></main>;

  const paymentImage = (item: Payment) => item === "PAYME" ? "/images/payments/image%204.png" : item === "CLICK" ? "/images/payments/image%204-1.png" : "/images/payments/paynet.png";

  return <main className="checkout-page">
    <header className="checkout-header"><Image src="/icons/logo.svg" alt="SIREN" width={132} height={32} /><Image src="/icons/cart.svg" alt="" width={22} height={22} /></header>
    <form className="checkout-form" onSubmit={pay}>
      <section className="checkout-main">
        <section className={`checkout-mobile-summary${mobileSummaryOpen ? " is-open" : ""}`}>
          <button type="button" className="checkout-mobile-summary-toggle" onClick={() => setMobileSummaryOpen((open) => !open)} aria-expanded={mobileSummaryOpen}><span>Сводка заказа</span><Image src="/icons/arrow-down.svg" alt="" width={14} height={8} /><span className="checkout-mobile-summary-total"><small>СУМ</small><b>{total.toLocaleString("ru-RU")}</b></span></button>
          <div className="checkout-mobile-summary-details">{cart.map((item) => <div key={`mobile-${item.id}-${item.size}`}><span>{item.title} × {item.quantity}</span><b>{money(Number(item.price.replace(/\D/g, "")) * item.quantity)}</b></div>)}</div>
        </section>
        <div className="checkout-payment-logos"><Image src="/images/payments/visa.png" alt="Visa" width={44} height={24} /><Image src="/images/payments/Mastercard.png" alt="Mastercard" width={44} height={24} /><Image src="/images/payments/American%20Express.png" alt="Uzcard" width={44} height={24} /><Image src="/images/payments/PayPal.png" alt="Humo" width={44} height={24} /></div>
        <p className="checkout-fast-title">Быстрое оформление заказа</p>
        <div className="checkout-fast"><button type="button" aria-label="Click" onClick={() => setPayment("CLICK")}><Image src="/images/payments/image%204-1.png" alt="Click" width={152} height={50} /></button><button type="button" aria-label="Payme" onClick={() => setPayment("PAYME")}><Image src="/images/payments/image%204.png" alt="Payme" width={152} height={50} /></button><button type="button" aria-label="Paynet" onClick={() => setPayment("PAYNET")}><Image src="/images/payments/paynet.png" alt="Paynet" width={152} height={50} /></button></div>
        <p className="checkout-or">ИЛИ</p>

        <h2>Контакт <small>Регистрация</small></h2>
        <input className="checkout-email" placeholder="Электронная почта" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
        <label className="checkout-consent"><input type="checkbox" /><span className="checkout-check-control" aria-hidden="true" />Подпишитесь на рассылку обновлений о продукте на вашу электронную почту.</label>

        <h2>Доставка</h2><p className="checkout-delivery-intro">Не нашли свою страну? Смените магазин.</p>
        <div className="checkout-country"><button type="button" aria-expanded={countryOpen} onClick={() => setCountryOpen((open) => !open)}><span><small>Страна/Регион</small><b>{country}</b></span><Image className="checkout-country-arrow" src="/icons/arrow-down.svg" alt="" width={17} height={9} /></button>{countryOpen && <div className="checkout-country-options">{countries.map((item) => <button type="button" className={item === country ? "is-selected" : ""} key={item} onClick={() => { setCountry(item); setCountryOpen(false); }}>{item}</button>)}</div>}</div>
        <div className="checkout-two"><input placeholder="Имя" value={form.firstName} onChange={(event) => set("firstName", event.target.value)} /><input placeholder="Фамилия" value={form.lastName} onChange={(event) => set("lastName", event.target.value)} /></div>
        <input placeholder="Адрес" value={form.address} onChange={(event) => set("address", event.target.value)} /><input placeholder="Квартира, люкс и т.д. (по желанию)" />
        <div className="checkout-two"><input placeholder="Город" value={form.city} onChange={(event) => set("city", event.target.value)} /><input placeholder="Почтовый индекс (необязательно)" /></div>
        <input placeholder="Телефон" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
        <label className="checkout-consent"><input type="checkbox" /><span className="checkout-check-control" aria-hidden="true" />Узнавайте первыми. Получайте сообщения о запуске новых продуктов.</label>

        <h3>Способ доставки</h3><p className="checkout-delivery-note">В связи с увеличением трафика и объема заказов, все заказы, размещенные во время акции «Хранилище», не могут быть изменены или отменены. Пожалуйста, учтите, что доставка вашего заказа может занять до 5 дополнительных рабочих дней.</p><label className="checkout-shipping"><span>UzPost</span><b>{money(shipping)}</b></label>
        <h2>Оплата</h2><p className="checkout-muted">Все транзакции защищены и зашифрованы.</p>
        <div className="checkout-methods">
          <label className={payment === "КАРТА" ? "is-selected" : ""}><input type="radio" checked={payment === "КАРТА"} onChange={() => setPayment("КАРТА")} /><span className="checkout-radio-control" aria-hidden="true" /><b>Credit card</b><span className="checkout-method-logo"><Image src="/images/payments/visa.png" alt="Visa" width={42} height={22} /><Image src="/images/payments/Mastercard.png" alt="Mastercard" width={42} height={22} /><i>+5</i></span></label>
          {payment === "КАРТА" && <div className="checkout-card-fields"><input placeholder="Номер карты" inputMode="numeric" value={form.card} onChange={(event) => set("card", event.target.value)} /><div className="checkout-two"><input placeholder="Срок действия (ММ/ГГ)" value={form.expiry} onChange={(event) => set("expiry", event.target.value)} /><input placeholder="Код безопасности" value={form.cvc} onChange={(event) => set("cvc", event.target.value)} /></div><input placeholder="Имя на карте" /><label className="checkout-consent"><input type="checkbox" checked readOnly /><span className="checkout-check-control" aria-hidden="true" />Использовать адрес доставки в качестве платежного адреса</label></div>}
          {payments.slice(1).map((item) => <label key={item} className={payment === item ? "is-selected" : ""}><input type="radio" checked={payment === item} onChange={() => setPayment(item)} /><span className="checkout-radio-control" aria-hidden="true" /><b>{item === "PAYME" ? "PayMe" : item === "CLICK" ? "Click" : "Paynet"}</b><span className="checkout-method-logo"><Image src={paymentImage(item)} alt={item} width={76} height={28} /></span></label>)}
        </div>
        <div className="checkout-save-data"><b>Сохраните мои данные для более быстрой оплаты.</b><button type="button">Не сейчас</button><p>Оплачивая покупку, вы соглашаетесь создать учетную запись в Магазине в соответствии с <u>Terms</u> and <u>Privacy Policy</u></p></div>
        {error && <p className="checkout-error">{error}</p>}
        <button className="checkout-add-discount" type="button">◇ Add discount</button>
        <div className="checkout-mobile-total"><Image src={cart[0].image} alt="" width={42} height={42} /><span><b>Total</b><small>{cart.reduce((sum, item) => sum + item.quantity, 0)} item</small></span><strong>{money(total)}</strong></div>
        <button className="checkout-submit" type="submit">Pay now</button>
      </section>
      <aside className="checkout-summary"><h2 className="checkout-summary-title">Ваш заказ</h2><div className="checkout-summary-list">{cart.map((item) => <article className="checkout-item" key={`${item.id}-${item.size}`}><div className="checkout-item-image"><Image src={item.image} alt={item.title} width={58} height={58} /><span>{item.quantity}</span></div><span><b>{item.title}</b><small>{item.size} / {item.color}</small></span><strong>{money(Number(item.price.replace(/\D/g, "")) * item.quantity)}</strong></article>)}</div><dl className="checkout-totals"><div><dt>Промежуточный итог</dt><dd>{money(subtotal)}</dd></div><div><dt>Доставка</dt><dd>{money(shipping)}</dd></div><div className="checkout-total"><dt>К оплате</dt><dd>{money(total)}</dd></div></dl></aside>
    </form>
    <footer className="checkout-footer">Политика возврата средств　 Перевозки　 Политика конфиденциальности　 Условия предоставления услуг　 Контакт</footer>
  </main>;
}

"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, CreditCard, LocateFixed, LockKeyhole, MapPin, Truck } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { customerApi, useCustomerAuth } from "@/components/CustomerAuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { cartItemPrice, cartSubtotal, shippingCost } from "@/lib/commerce";
import type { Order, OrderStatus } from "@/lib/orders";

const payments = ["КАРТА", "PAYME", "CLICK", "PAYNET"] as const;
const countries = ["Узбекистан", "Казахстан", "Кыргызстан", "Таджикистан"];
type Payment = (typeof payments)[number];
type CheckoutPartner = { id: string; name: string; logoUrl: string };
const TEST_CUSTOMER_EMAIL = "skulofdemons@gmail.com";
const assetOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const checkoutImageUrl = (value: string) => value.startsWith("/uploads/") ? `${assetOrigin}${value}` : value;

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { customer } = useCustomerAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment>("КАРТА");
  const [country, setCountry] = useState("Узбекистан");
  const [countryOpen, setCountryOpen] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [checkoutPartners, setCheckoutPartners] = useState<CheckoutPartner[]>([]);
  const [deliveryLocation, setDeliveryLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", address: "", city: "", phone: "", card: "", expiry: "", cvc: "" });
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; percent: number } | null>(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [error, setError] = useState("");
  const isTestCustomer = customer?.email?.trim().toLowerCase() === TEST_CUSTOMER_EMAIL;
  const welcomeActive = Boolean(customer?.welcomeDiscountEligible && (!customer.welcomeDiscountExpiresAt || new Date(customer.welcomeDiscountExpiresAt).getTime() > Date.now()));
  const saleInCart = cart.some((item) => item.isSale);
  const promoAllowed = !welcomeActive && !saleInCart;
  const subtotal = useMemo(() => cartSubtotal(cart), [cart]);
  const shipping = shippingCost(subtotal, cart.length);
  const discount = welcomeActive ? Math.round(subtotal * (customer?.welcomeDiscountPercent || 15) / 100) : promoApplied ? Math.round(subtotal * promoApplied.percent / 100) : discountApplied ? subtotal * .1 : 0;
  const total = subtotal - discount + shipping;
  const money = (value: number) => `${value.toLocaleString("ru-RU")} СУМ`;
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const selectDeliveryLocation = () => {
    if (!navigator.geolocation) { setLocationMessage("Brauzeringiz joylashuvni aniqlashni qo‘llamaydi."); return; }
    setLocationMessage("Joylashuv aniqlanmoqda...");
    navigator.geolocation.getCurrentPosition(({ coords }) => { setDeliveryLocation({ latitude: coords.latitude, longitude: coords.longitude }); setLocationMessage("Uy nuqtasi tanlandi va buyurtmaga qo‘shiladi."); }, () => setLocationMessage("Joylashuvga ruxsat bering yoki manzilni qo‘lda kiriting."), { enableHighAccuracy: true, timeout: 12000 });
  };

  useEffect(() => {
    if (!customer) return;
    setForm((current) => ({ ...current, email: customer.email, firstName: customer.firstName || current.firstName, lastName: customer.lastName || current.lastName, phone: customer.phone || current.phone, address: customer.address || current.address, city: customer.region || current.city }));
  }, [customer]);
  useEffect(() => { if (!customer) { setCheckoutPartners([]); return; } void fetch(`${assetOrigin}/api/partners/checkout`).then((response) => response.ok ? response.json() : []).then((items) => setCheckoutPartners(Array.isArray(items) ? items : [])).catch(() => setCheckoutPartners([])); }, [customer]);

  const pay = async (event: FormEvent) => {
    event.preventDefault();
    const required = [form.email, form.firstName, form.lastName, form.address, form.city, form.phone];
    if (required.some((value) => !value.trim())) {
      setError("ЗАПОЛНИТЕ ВСЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ");
      return;
    }
    try {
      const token = localStorage.getItem("siren-customer-token") || undefined;
      const created = await customerApi("/checkout/orders", { email: form.email, firstName: form.firstName, lastName: form.lastName, phone: form.phone, shippingAddress: { country, city: form.city, address: form.address, location: deliveryLocation }, paymentMethod: isTestCustomer ? "test_paid" : payment.toLowerCase(), promoCode: promoApplied?.code, note: isTestCustomer ? "Test buyurtma — to‘langan deb belgilandi" : undefined, items: cart.map((item) => ({ variantId: item.id, quantity: item.quantity })) }, token);
      const order: Order = { id: String(created.orderNumber || created.id).slice(0, 12).toUpperCase(), paidAt: new Date().toISOString(), status: "in_transit" as OrderStatus, items: cart, total: money(Number(created.totalAmount ?? total)) };
      const saved = JSON.parse(localStorage.getItem("siren-orders") ?? "[]");
      localStorage.setItem("siren-orders", JSON.stringify([order, ...(Array.isArray(saved) ? saved : [])]));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Buyurtma yaratilmadi."); return; }
    try {
      const profile = JSON.parse(localStorage.getItem("siren-profile") ?? "{}");
      localStorage.setItem("siren-profile", JSON.stringify({ ...profile, email: form.email }));
    } catch { localStorage.setItem("siren-profile", JSON.stringify({ email: form.email })); }
    clearCart();
    router.push("/profile");
  };

  if (!cart.length) return <main className="checkout-empty"><Image src="/icons/logo.svg" alt="SIREN" width={132} height={32} /><h1>КОРЗИНА ПУСТА</h1><button onClick={() => router.push("/shop")}>В МАГАЗИН</button></main>;

  return <main className="commerce-checkout">
    <header className="commerce-checkout__header"><button type="button" className="commerce-checkout__back" aria-label="Orqaga qaytish" onClick={() => router.back()}><ArrowLeft size={19} /></button><Image src="/icons/logo.svg" alt="SIREN" width={124} height={30} /><span><LockKeyhole size={13} /> Secure checkout</span></header>
    <form className="commerce-checkout__layout" onSubmit={pay}>
      <section className="commerce-checkout__content">
        <header className="commerce-checkout__intro"><p>CHECKOUT</p><h1>Оформление заказа</h1><span>Заполните данные для доставки и выберите оплату.</span></header>
        {isTestCustomer && <p className="commerce-checkout__test"><b>TEST BUYURTMA</b><span>Buyurtma to‘langan holatda yaratiladi.</span></p>}
        <section className="commerce-checkout__section"><header><span>01</span><div><h2>Контакты</h2><p>Получим данные для связи по заказу.</p></div></header><div className="commerce-checkout__fields"><label className="commerce-checkout__wide">E-mail<input placeholder="Электронная почта" type="email" value={form.email} readOnly={isTestCustomer} onChange={(event) => set("email", event.target.value)} /></label><label>Имя<input placeholder="Имя" value={form.firstName} onChange={(event) => set("firstName", event.target.value)} /></label><label>Фамилия<input placeholder="Фамилия" value={form.lastName} onChange={(event) => set("lastName", event.target.value)} /></label><label className="commerce-checkout__wide">Телефон<input placeholder="+998 00 000 00 00" value={form.phone} onChange={(event) => set("phone", event.target.value)} /></label></div></section>
        <section className="commerce-checkout__section"><header><span>02</span><div><h2>Доставка</h2><p>Укажите адрес, куда отправить заказ.</p></div></header><div className="commerce-checkout__fields"><label className="commerce-checkout__wide">Страна / регион<div className="commerce-checkout__country"><button type="button" aria-expanded={countryOpen} onClick={() => setCountryOpen((open) => !open)}>{country}<ChevronDown size={16} /></button>{countryOpen && <div>{countries.map((item) => <button type="button" key={item} className={item === country ? "is-selected" : ""} onClick={() => { setCountry(item); setCountryOpen(false); }}>{item}</button>)}</div>}</div></label><label className="commerce-checkout__wide">Адрес<input placeholder="Улица, дом, квартира" value={form.address} onChange={(event) => set("address", event.target.value)} /></label><label>Город<input placeholder="Город" value={form.city} onChange={(event) => set("city", event.target.value)} /></label><label>Индекс<input placeholder="Почтовый индекс" /></label></div><section className="commerce-checkout__location"><div><MapPin size={17} /><span><b>Точка доставки</b><small>Уточните адрес на карте, если нужно.</small></span></div><button type="button" onClick={selectDeliveryLocation}><LocateFixed size={16} /> Выбрать мою геолокацию</button>{locationMessage && <p className={deliveryLocation ? "is-success" : ""}>{locationMessage}</p>}{(deliveryLocation || (form.address.trim() && form.city.trim())) && <iframe title="Карта адреса доставки" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(deliveryLocation ? `${deliveryLocation.latitude},${deliveryLocation.longitude}` : `${form.address}, ${form.city}, ${country}`)}&output=embed`} />}</section><div className="commerce-checkout__shipping"><Truck size={18} /><span><b>UzPost</b><small>Стандартная доставка</small></span><strong>{money(shipping)}</strong></div></section>
        <section className="commerce-checkout__section"><header><span>03</span><div><h2>Оплата</h2><p>Все платежи защищены.</p></div></header>{isTestCustomer ? <div className="commerce-checkout__test"><b>TEST MODE</b><span>Оплата не требуется.</span></div> : <div className="commerce-checkout__payments"><label className={payment === "КАРТА" ? "is-selected" : ""}><input type="radio" checked={payment === "КАРТА"} onChange={() => setPayment("КАРТА")} /><CreditCard size={19} /><span><b>Банковская карта</b><small>Visa, Mastercard, Uzcard, Humo</small></span><i><Check size={14} /></i></label>{payment === "КАРТА" && <div className="commerce-checkout__card"><input placeholder="Номер карты" inputMode="numeric" value={form.card} onChange={(event) => set("card", event.target.value)} /><div><input placeholder="ММ / ГГ" value={form.expiry} onChange={(event) => set("expiry", event.target.value)} /><input placeholder="CVV" value={form.cvc} onChange={(event) => set("cvc", event.target.value)} /></div><input placeholder="Имя владельца карты" /></div>}{payments.slice(1).map((item) => <label key={item} className={payment === item ? "is-selected" : ""}><input type="radio" checked={payment === item} onChange={() => setPayment(item)} /><span className="commerce-checkout__payment-mark">{item.slice(0, 1)}</span><span><b>{item === "PAYME" ? "Payme" : item === "CLICK" ? "Click" : "Paynet"}</b><small>Онлайн-оплата</small></span><i><Check size={14} /></i></label>)}</div>}</section>
        {promoAllowed ? <section className="commerce-checkout__promo"><label>Промокод<input value={promo} readOnly={Boolean(promoApplied)} onChange={(event) => { setPromo(event.target.value.toUpperCase()); setError(""); }} placeholder="Введите промокод" /></label><button type="button" onClick={() => void (async () => { try { const result = await customerApi("/checkout/promo/validate", { promoCode: promo, variantIds: cart.map((item) => item.id) }); setPromoApplied(result); setPromo(result.code); setError(`Promokod qabul qilindi: −${result.percent}%`); } catch (reason) { setPromoApplied(null); setError(reason instanceof Error ? reason.message : "Promokod topilmadi."); } })()}>{promoApplied ? `−${promoApplied.percent}%` : "Применить"}</button></section> : <p className="commerce-checkout__notice">{welcomeActive ? "Welcome bonus faol: promokod qo‘llanmaydi." : "Chegirmali mahsulot bor: promokod qo‘llanmaydi."}</p>}
        {error && <p className="commerce-checkout__error">{error}</p>}<button className="commerce-checkout__submit" type="submit">{isTestCustomer ? "Создать тестовый заказ" : `Оплатить ${money(total)}`}</button><p className="commerce-checkout__security"><LockKeyhole size={14} /> Нажимая «Оплатить», вы соглашаетесь с условиями сервиса.</p>
      </section>
      <aside className={`commerce-checkout__summary${mobileSummaryOpen ? " is-open" : ""}`}><button type="button" className="commerce-checkout__summary-toggle" onClick={() => setMobileSummaryOpen((open) => !open)} aria-expanded={mobileSummaryOpen}><span><small>ВАШ ЗАКАЗ</small><b>{cart.reduce((sum, item) => sum + item.quantity, 0)} товара</b></span><span><b>{money(total)}</b><ChevronDown size={17} /></span></button><div className="commerce-checkout__summary-body"><div className="commerce-checkout__items">{cart.map((item) => <article key={`${item.id}-${item.size}`}><div><img src={checkoutImageUrl(item.image)} alt={item.title} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/icons/logo.svg"; }} /><i>{item.quantity}</i></div><span><b>{item.title}</b><small>{item.size} / {item.color}</small></span><strong>{money(cartItemPrice(item.price) * item.quantity)}</strong></article>)}</div>{customer && checkoutPartners.length > 0 && <div className="commerce-checkout__partners"><span>Партнёры</span><div>{checkoutPartners.map((partner) => <img key={partner.id} src={checkoutImageUrl(partner.logoUrl)} alt={partner.name} title={partner.name} />)}</div></div>}<dl><div><dt>{t("subtotal")}</dt><dd>{money(subtotal)}</dd></div><div><dt>Доставка</dt><dd>{money(shipping)}</dd></div>{discount > 0 && <div className="is-discount"><dt>Chegirma</dt><dd>−{money(discount)}</dd></div>}<div className="is-total"><dt>{t("total")}</dt><dd>{money(total)}</dd></div></dl></div></aside>
    </form>
  </main>;
}

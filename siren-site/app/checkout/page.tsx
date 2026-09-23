"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, CreditCard, LocateFixed, LockKeyhole, MapPin, Truck, X } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { customerApi, useCustomerAuth } from "@/components/CustomerAuthProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { cartItemPrice, cartSubtotal, shippingCost } from "@/lib/commerce";
import type { Order, OrderStatus } from "@/lib/orders";

const payments = ["КАРТА", "PAYME", "CLICK", "PAYNET", "НАЛИЧНЫЕ", "ПЕРЕВОД"] as const;
const countries = ["Узбекистан", "Казахстан", "Кыргызстан", "Таджикистан"];
type Payment = (typeof payments)[number];
type CheckoutPartner = { id: string; name: string; logoUrl: string };
type DeliveryCandidate = { label: string; shortLabel: string; city: string; latitude: number; longitude: number };
type PickupLocation = { id: string; name: string; address: string; city: string; latitude: string; longitude: string; instructions?: string | null; workingHours?: string | null; isActive: boolean };
const TEST_CUSTOMER_EMAIL = "skulofdemons@gmail.com";
const assetOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const checkoutImageUrl = (value: string) => value.startsWith("/uploads/") ? `${assetOrigin}${value}` : value;

declare global { interface Window { L?: any; } }

function OpenStreetMapDeliveryMap({ location, onSelect }: { location: { latitude: number; longitude: number } | null; onSelect: (candidate: DeliveryCandidate) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => {
    if (!containerRef.current) return;
    let active = true;
    let map: any;
    let marker: any;
    const center = location ? [location.latitude, location.longitude] : [41.3111, 69.2797];
    const selectPoint = async (latitude: number, longitude: number) => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${latitude}&lon=${longitude}`);
        if (!response.ok) throw new Error("address-not-found");
        const result = await response.json() as { display_name?: string; address?: Record<string, string> };
        if (!active) return;
        const address = result.address ?? {};
        const city = address.city || address.town || address.village || address.state || "";
        const shortLabel = [address.road, address.house_number].filter(Boolean).join(", ") || result.display_name?.split(",").slice(0, 2).join(",") || "Выбранная точка";
        onSelectRef.current({ label: result.display_name || `Координаты: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, shortLabel, city, latitude, longitude });
      } catch { onSelectRef.current({ label: `Координаты: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, shortLabel: "Выбранная точка", city: "", latitude, longitude }); }
    };
    const initialise = () => {
      if (!active || !containerRef.current || !window.L) return;
      map = window.L.map(containerRef.current, { zoomControl: true }).setView(center, location ? 17 : 12);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
      const showMarker = (point: number[]) => {
        if (marker) map.removeLayer(marker);
        marker = window.L.circleMarker(point, { radius: 11, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(map);
      };
      if (location) showMarker(center);
      map.on("click", (event: any) => { const point = [event.latlng.lat, event.latlng.lng]; showMarker(point); void selectPoint(point[0], point[1]); });
    };
    if (window.L) initialise();
    else {
      if (!document.querySelector("link[data-leaflet-css]")) {
        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        stylesheet.dataset.leafletCss = "true";
        document.head.appendChild(stylesheet);
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = initialise;
      document.head.appendChild(script);
    }
    return () => { active = false; map?.remove?.(); };
  }, [location?.latitude, location?.longitude]);
  return <div ref={containerRef} className="commerce-checkout__openstreet-map" aria-label="Карта для выбора точки доставки" />;
}

const YandexDeliveryMap = OpenStreetMapDeliveryMap;

function PickupMapPreview({ point }: { point: PickupLocation }) {
  const latitude = Number(point.latitude); const longitude = Number(point.longitude);
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - .008}%2C${latitude - .005}%2C${longitude + .008}%2C${latitude + .005}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return <div className="commerce-checkout__pickup-map"><iframe title={`${point.name} xaritasi`} src={mapUrl} loading="lazy" /><div><span><MapPin size={16} /><b>{point.name}</b><small>{point.address}, {point.city}{point.workingHours ? ` · ${point.workingHours}` : ""}</small></span><a href={openUrl} target="_blank" rel="noreferrer">Открыть на карте</a></div></div>;
}

function FulfillmentMethodSelector({ method, expanded, locations, selectedId, onMethod, onExpanded, onSelect }: { method: "delivery" | "pickup"; expanded: boolean; locations: PickupLocation[]; selectedId: string; onMethod: (method: "delivery" | "pickup") => void; onExpanded: () => void; onSelect: (id: string) => void }) {
  return <section className="commerce-checkout__fulfillment"><button type="button" className="commerce-checkout__fulfillment-toggle" onClick={onExpanded} aria-expanded={expanded}><span><Truck size={18} /><span><b>Способ получения</b><small>{method === "pickup" ? "Самовывоз — бесплатно" : "Доставка курьером"}</small></span></span><ChevronDown size={18} /></button>{expanded && <div className="commerce-checkout__fulfillment-body"><div className="commerce-checkout__fulfillment-options"><button type="button" className={method === "delivery" ? "is-selected" : ""} onClick={() => onMethod("delivery")}><Truck size={18} /><span><b>Доставка</b><small>Укажите адрес на карте</small></span><i><Check size={14} /></i></button><button type="button" className={method === "pickup" ? "is-selected" : ""} onClick={() => onMethod("pickup")}><MapPin size={18} /><span><b>Забрать из точки</b><small>Бесплатно · до 30 дней</small></span><i><Check size={14} /></i></button></div>{method === "pickup" && <div className="commerce-checkout__pickup-list"><p><b>Выберите удобную точку</b><span>Заказ будет отменён, если его не забрать в течение 30 дней.</span></p>{locations.length ? locations.map((point) => <button type="button" key={point.id} className={selectedId === point.id ? "is-selected" : ""} onClick={() => onSelect(point.id)}><MapPin size={17} /><span><b>{point.name}</b><small>{point.address}, {point.city}</small>{point.instructions && <em>{point.instructions}</em>}</span><strong>Бесплатно</strong></button>) : <small>Администратор hali olib ketish nuqtasini qo‘shmagan.</small>}</div>}</div>}</section>;
}

function PickupPaymentSelector({ payment, onChange }: { payment: Payment; onChange: (payment: Payment) => void }) {
  const payOnPickup = payment === "НАЛИЧНЫЕ";
  return <section className="commerce-checkout__pickup-payment"><p><b>Оплата</b><span>Выберите, когда оплатить заказ.</span></p><button type="button" className={`is-pickup ${payOnPickup ? "is-selected" : ""}`} onClick={() => onChange("НАЛИЧНЫЕ")}><span>Оплата при получении<small>Оплатите заказ в выбранной точке самовывоза.</small></span><i><Check size={14} /></i></button><button type="button" className={`is-payme ${!payOnPickup ? "is-selected" : ""}`} onClick={() => onChange("PAYME")}><Image src="/images/payments/payme-checkout.png" alt="Payme" width={92} height={36} /><span>Оплатить сейчас через Payme<small>Безопасная онлайн-оплата через Payme.</small></span><i><Check size={14} /></i></button></section>;
}

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { customer } = useCustomerAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment>("PAYME");
  const [country, setCountry] = useState("Узбекистан");
  const [countryOpen, setCountryOpen] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [checkoutPartners, setCheckoutPartners] = useState<CheckoutPartner[]>([]);
  const [deliveryLocation, setDeliveryLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationCandidates, setLocationCandidates] = useState<DeliveryCandidate[]>([]);
  const [pendingLocation, setPendingLocation] = useState<DeliveryCandidate | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [deliveryExpanded, setDeliveryExpanded] = useState(true);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", address: "", city: "", phone: "", card: "", expiry: "", cvc: "" });
  const [promo, setPromo] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
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
    setLocationCandidates([]);
    setPendingLocation(null);
    setLocationMessage("Определяем ваше местоположение...");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const latitude = coords.latitude;
      const longitude = coords.longitude;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${latitude}&lon=${longitude}`);
        if (!response.ok) throw new Error("reverse-geocoding-failed");
        const result = await response.json() as { display_name?: string; address?: Record<string, string> };
        const address = result.address ?? {};
        const city = address.city || address.town || address.village || address.state || "";
        const street = [address.road, address.house_number].filter(Boolean).join(", ");
        const district = [address.suburb || address.neighbourhood, city].filter(Boolean).join(", ");
        const labels = [street, district, result.display_name].filter((value): value is string => Boolean(value?.trim()));
        const candidates = Array.from(new Set(labels)).slice(0, 3).map((label, index) => ({
          label,
          shortLabel: index === 0 && street ? street : label.split(",").slice(0, 2).join(","),
          city,
          latitude,
          longitude,
        }));
        if (!candidates.length) throw new Error("address-not-found");
        setLocationCandidates(candidates);
        setLocationMessage("Выберите найденный адрес, затем подтвердите его.");
      } catch {
        setLocationCandidates([{ label: `Координаты: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, shortLabel: "Текущая геопозиция", city: "", latitude, longitude }]);
        setLocationMessage("Не удалось получить название улицы. Подтвердите точку на карте.");
      }
    }, () => setLocationMessage("Разрешите доступ к геолокации или укажите адрес вручную."), { enableHighAccuracy: true, timeout: 12000, maximumAge: 30_000 });
  };
  const confirmDeliveryLocation = () => {
    if (!pendingLocation) return;
    setDeliveryLocation({ latitude: pendingLocation.latitude, longitude: pendingLocation.longitude });
    setForm((current) => ({ ...current, address: pendingLocation.shortLabel || current.address, city: pendingLocation.city || current.city }));
    setLocationCandidates([]);
    setPendingLocation(null);
    setLocationMessage("Адрес подтверждён и добавлен к заказу.");
  };

  useEffect(() => {
    if (!customer) return;
    setForm((current) => ({ ...current, email: customer.email, firstName: customer.firstName || current.firstName, lastName: customer.lastName || current.lastName, phone: customer.phone || current.phone, address: customer.address || current.address, city: customer.region || current.city }));
  }, [customer]);
  useEffect(() => { if (!customer) { setCheckoutPartners([]); return; } void fetch(`${assetOrigin}/api/partners/checkout`).then((response) => response.ok ? response.json() : []).then((items) => setCheckoutPartners(Array.isArray(items) ? items : [])).catch(() => setCheckoutPartners([])); }, [customer]);
  useEffect(() => { void fetch(`${assetOrigin}/api/pickup-locations`).then((response) => response.ok ? response.json() : []).then((items) => setPickupLocations(Array.isArray(items) ? items : [])).catch(() => setPickupLocations([])); }, []);

  const pay = async (event: FormEvent) => {
    event.preventDefault();
    const required = deliveryMethod === "pickup" ? [form.email, form.firstName, form.lastName, form.phone, pickupLocationId] : [form.email, form.firstName, form.lastName, form.address, form.city, form.phone];
    if (required.some((value) => !value.trim())) {
      setError("ЗАПОЛНИТЕ ВСЕ ОБЯЗАТЕЛЬНЫЕ ПОЛЯ");
      return;
    }
    try {
      const token = localStorage.getItem("siren-customer-token") || undefined;
      const created = await customerApi("/checkout/orders", { email: form.email, firstName: form.firstName, lastName: form.lastName, phone: form.phone, shippingAddress: { country, city: form.city, address: form.address, location: deliveryLocation }, fulfillmentMethod: deliveryMethod, pickupLocationId: deliveryMethod === "pickup" ? pickupLocationId : undefined, paymentMethod: isTestCustomer ? "test_paid" : payment.toLowerCase(), promoCode: promoApplied?.code, note: isTestCustomer ? "Test buyurtma — to‘langan deb belgilandi" : undefined, items: cart.map((item) => ({ variantId: item.id, quantity: item.quantity })) }, token);
      if (payment === "PAYME" && !isTestCustomer) {
        const checkout = await customerApi(`/checkout/payme/checkout/${created.id}`, undefined, token);
        window.location.assign(checkout.url);
        return;
      }
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
      <section className={`commerce-checkout__content${deliveryMethod === "pickup" ? " is-pickup" : ""}`}>
        <header className="commerce-checkout__intro"><p>CHECKOUT</p><h1>Оформление заказа</h1><span>Заполните данные для доставки и выберите оплату.</span></header>
        <FulfillmentMethodSelector method={deliveryMethod} expanded={deliveryExpanded} locations={pickupLocations} selectedId={pickupLocationId} onExpanded={() => setDeliveryExpanded((open) => !open)} onMethod={(method) => { setDeliveryMethod(method); setPayment(method === "pickup" ? "НАЛИЧНЫЕ" : "PAYME"); setDeliveryExpanded(true); }} onSelect={(id) => { const point = pickupLocations.find((item) => item.id === id); setPickupLocationId(id); if (point) { setForm((current) => ({ ...current, city: point.city, address: point.address })); setDeliveryLocation({ latitude: Number(point.latitude), longitude: Number(point.longitude) }); } }} />
        {deliveryMethod === "pickup" && <>{pickupLocationId && pickupLocations.find((point) => point.id === pickupLocationId) && <PickupMapPreview point={pickupLocations.find((point) => point.id === pickupLocationId)!} />}<PickupPaymentSelector payment={payment} onChange={setPayment} /></>}
        {isTestCustomer && <p className="commerce-checkout__test"><b>TEST BUYURTMA</b><span>Buyurtma to‘langan holatda yaratiladi.</span></p>}
        <section className="commerce-checkout__section"><header><span>01</span><div><h2>Контакты</h2><p>Получим данные для связи по заказу.</p></div></header><div className="commerce-checkout__fields"><label className="commerce-checkout__wide">E-mail<input placeholder="Электронная почта" type="email" value={form.email} readOnly={isTestCustomer} onChange={(event) => set("email", event.target.value)} /></label><label>Имя<input placeholder="Имя" value={form.firstName} onChange={(event) => set("firstName", event.target.value)} /></label><label>Фамилия<input placeholder="Фамилия" value={form.lastName} onChange={(event) => set("lastName", event.target.value)} /></label><label className="commerce-checkout__wide">Телефон<input placeholder="+998 00 000 00 00" value={form.phone} onChange={(event) => set("phone", event.target.value)} /></label></div></section>
        <section className="commerce-checkout__section"><header><span>02</span><div><h2>Доставка</h2><p>Укажите адрес, куда отправить заказ.</p></div></header><div className="commerce-checkout__fields"><label className="commerce-checkout__wide">Страна / регион<div className="commerce-checkout__country"><button type="button" aria-expanded={countryOpen} onClick={() => setCountryOpen((open) => !open)}>{country}<ChevronDown size={16} /></button>{countryOpen && <div>{countries.map((item) => <button type="button" key={item} className={item === country ? "is-selected" : ""} onClick={() => { setCountry(item); setCountryOpen(false); }}>{item}</button>)}</div>}</div></label><label className="commerce-checkout__wide">Адрес<input placeholder="Улица, дом, квартира" value={form.address} onChange={(event) => set("address", event.target.value)} /></label><label>Город<input placeholder="Город" value={form.city} onChange={(event) => set("city", event.target.value)} /></label><label>Индекс<input placeholder="Почтовый индекс" /></label></div><section className="commerce-checkout__location"><div><MapPin size={17} /><span><b>Точка доставки</b><small>Нажмите на дом на карте — затем подтвердите адрес.</small></span></div><button type="button" onClick={selectDeliveryLocation}><LocateFixed size={16} /> Выбрать мою геолокацию</button>{locationMessage && <p className={deliveryLocation ? "is-success" : ""}>{locationMessage}</p>}{locationCandidates.length > 0 && <div className="commerce-checkout__location-results" style={{ display: "flex", flexDirection: "column", width: "100%" }}><b>Найденные адреса</b>{locationCandidates.map((candidate) => <button type="button" key={`${candidate.label}-${candidate.latitude}`} style={{ width: "100%", alignSelf: "stretch" }} onClick={() => setPendingLocation(candidate)}><MapPin size={15} /><span>{candidate.shortLabel}<small>{candidate.label}</small></span><ChevronDown size={15} /></button>)}</div>}<YandexDeliveryMap location={deliveryLocation} onSelect={(candidate) => { setPendingLocation(candidate); setLocationMessage("Проверьте выбранный адрес и подтвердите его."); }} /></section><div className="commerce-checkout__shipping"><Truck size={18} /><span><b>UzPost</b><small>Стандартная доставка</small></span><strong>{money(shipping)}</strong></div></section>
        <section className="commerce-checkout__section"><header><span>03</span><div><h2>Оплата</h2><p>Все платежи защищены.</p></div></header>{isTestCustomer ? <div className="commerce-checkout__test"><b>TEST MODE</b><span>Оплата не требуется.</span></div> : <div className="commerce-checkout__payments"><label className={payment === "КАРТА" ? "is-selected" : ""}><input type="radio" checked={payment === "КАРТА"} onChange={() => setPayment("КАРТА")} /><CreditCard size={19} /><span><b>Банковская карта</b><small>Visa, Mastercard, Uzcard, Humo</small></span><i><Check size={14} /></i></label>{payment === "КАРТА" && <div className="commerce-checkout__card"><input placeholder="Номер карты" inputMode="numeric" value={form.card} onChange={(event) => set("card", event.target.value)} /><div><input placeholder="ММ / ГГ" value={form.expiry} onChange={(event) => set("expiry", event.target.value)} /><input placeholder="CVV" value={form.cvc} onChange={(event) => set("cvc", event.target.value)} /></div><input placeholder="Имя владельца карты" /></div>}{payments.slice(1).map((item) => <label key={item} onClick={() => setPayment(item)} className={`${payment === item ? "is-selected " : ""}${item === "PAYME" ? "is-payme" : ""}`}>{item !== "PAYME" && <input type="radio" checked={payment === item} onChange={() => setPayment(item)} />}{item === "PAYME" ? <Image className="commerce-checkout__payme-logo" src="/images/payments/payme-checkout.png" alt="Payme" width={92} height={36} /> : <span className="commerce-checkout__payment-mark">{item.slice(0, 1)}</span>}<span><b>{item === "PAYME" ? "Payme" : item === "CLICK" ? "Click" : "Paynet"}</b><small>Онлайн-оплата</small></span><i><Check size={14} /></i></label>)}</div>}</section>
        {promoAllowed ? <section className={`commerce-checkout__promo ${promoOpen ? "is-open" : ""}`}><button className="commerce-checkout__promo-toggle" type="button" aria-expanded={promoOpen} onClick={() => setPromoOpen((open) => !open)}><span>Промокод{promoApplied && <small>−{promoApplied.percent}%</small>}</span><ChevronDown size={17} /></button>{promoOpen && <div className="commerce-checkout__promo-fields"><label>Промокод<input value={promo} readOnly={Boolean(promoApplied)} onChange={(event) => { setPromo(event.target.value.toUpperCase()); setError(""); }} placeholder="Введите промокод" /></label><button type="button" onClick={() => void (async () => { try { const result = await customerApi("/checkout/promo/validate", { promoCode: promo, variantIds: cart.map((item) => item.id) }); setPromoApplied(result); setPromo(result.code); setError(`Promokod qabul qilindi: −${result.percent}%`); } catch (reason) { setPromoApplied(null); setError(reason instanceof Error ? reason.message : "Promokod topilmadi."); } })()}>{promoApplied ? `−${promoApplied.percent}%` : "Применить"}</button></div>}</section> : <p className="commerce-checkout__notice">{welcomeActive ? "Welcome bonus faol: promokod qo‘llanmaydi." : "Chegirmali mahsulot bor: promokod qo‘llanmaydi."}</p>}
        {error && <p className="commerce-checkout__error">{error}</p>}<button className="commerce-checkout__submit" type="submit">{isTestCustomer ? "Создать тестовый заказ" : deliveryMethod === "pickup" && payment === "НАЛИЧНЫЕ" ? "Оформить заказ" : `Оплатить ${money(total)}`}</button><p className="commerce-checkout__security"><LockKeyhole size={14} /> Нажимая кнопку, вы соглашаетесь с условиями сервиса.</p>
      </section>
      <aside className={`commerce-checkout__summary${mobileSummaryOpen ? " is-open" : ""}`}><button type="button" className="commerce-checkout__summary-toggle" onClick={() => setMobileSummaryOpen((open) => !open)} aria-expanded={mobileSummaryOpen}><span><small>ВАШ ЗАКАЗ</small><b>{cart.reduce((sum, item) => sum + item.quantity, 0)} товара</b></span><span><b>{money(total)}</b><ChevronDown size={17} /></span></button><div className="commerce-checkout__summary-body"><div className="commerce-checkout__items">{cart.map((item) => <article key={`${item.id}-${item.size}`}><div><img src={checkoutImageUrl(item.image)} alt={item.title} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/icons/logo.svg"; }} /><i>{item.quantity}</i></div><span><b>{item.title}</b><small>{item.size} / {item.color}</small></span><strong>{money(cartItemPrice(item.price) * item.quantity)}</strong></article>)}</div>{customer && checkoutPartners.length > 0 && <div className="commerce-checkout__partners"><span>Партнёры</span><div>{checkoutPartners.map((partner) => <img key={partner.id} src={checkoutImageUrl(partner.logoUrl)} alt={partner.name} title={partner.name} />)}</div></div>}<dl><div><dt>{t("subtotal")}</dt><dd>{money(subtotal)}</dd></div><div><dt>Доставка</dt><dd>{money(shipping)}</dd></div>{discount > 0 && <div className="is-discount"><dt>Chegirma</dt><dd>−{money(discount)}</dd></div>}<div className="is-total"><dt>{t("total")}</dt><dd>{money(total)}</dd></div></dl></div></aside>
    </form>
    {pendingLocation && <div className="commerce-checkout__location-dialog" role="dialog" aria-modal="true" aria-labelledby="location-confirm-title"><div><button type="button" className="commerce-checkout__location-dialog-close" aria-label="Закрыть" onClick={() => setPendingLocation(null)}><X size={18} /></button><MapPin size={22} /><p>ПОДТВЕРЖДЕНИЕ АДРЕСА</p><h2 id="location-confirm-title">Это ваш адрес?</h2><strong>{pendingLocation.shortLabel}</strong><span>{pendingLocation.label}</span><small>Мы добавим эту точку к заказу и заполним адрес доставки.</small><footer><button type="button" onClick={() => setPendingLocation(null)}>Выбрать другой</button><button type="button" onClick={confirmDeliveryLocation}>Да, это мой адрес</button></footer></div></div>}
  </main>;
}

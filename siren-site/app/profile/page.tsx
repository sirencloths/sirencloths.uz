"use client";

import { FormEvent, useEffect, useState } from "react";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { useCart } from "@/components/CartContext";
import { orderStatusMeta, type Order } from "@/lib/orders";

type Address = { id: string; title: string; lines: string[] };
type Profile = { name: string; email: string; addresses: Address[] };

const initialProfile: Profile = {
  name: "ALEX",
  email: "ALEXPROSIGN@GMAIL.COM",
  addresses: [{
    id: "default-address",
    title: "Oleg Yusupov",
    lines: ["Oleg Yusupov", "Feruza TTZ City 30 12", "Tashkent", "100000", "Uzbekistan", "+998200016668"],
  }],
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"profile" | "orders">("profile");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [address, setAddress] = useState({ name: "", street: "", city: "", country: "", phone: "" });
  const [addressError, setAddressError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const { cart } = useCart();

  useEffect(() => {
    const saved = localStorage.getItem("siren-profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile({
          ...initialProfile,
          ...parsed,
          addresses: Array.isArray(parsed.addresses) && parsed.addresses.length ? parsed.addresses : initialProfile.addresses,
        });
      } catch { localStorage.removeItem("siren-profile"); }
    }
    const savedOrders = localStorage.getItem("siren-orders");
    if (savedOrders) {
      try { const parsed = JSON.parse(savedOrders); if (Array.isArray(parsed)) setOrders(parsed); } catch { localStorage.removeItem("siren-orders"); }
    }
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem("siren-profile", JSON.stringify(profile)); }, [profile, loaded]);

  const addAddress = (event: FormEvent) => {
    event.preventDefault();
    const values = Object.values(address).map((value) => value.trim());
    if (values.some((value) => !value)) { setAddressError("ЗАПОЛНИТЕ ВСЕ ПОЛЯ АДРЕСА"); return; }
    if (!/^\+?[\d\s()-]{7,}$/.test(address.phone.trim())) { setAddressError("УКАЖИТЕ КОРРЕКТНЫЙ ТЕЛЕФОН"); return; }
    setProfile((current) => ({ ...current, addresses: [...current.addresses, { id: crypto.randomUUID(), title: address.name, lines: [address.name, address.street, address.city, address.country, address.phone] }] }));
    setAddress({ name: "", street: "", city: "", country: "", phone: "" }); setAddressError(""); setShowAddressForm(false);
  };

  const cartOrder: Order | null = cart.length ? {
    id: "CURRENT-CART",
    paidAt: null,
    status: "in_transit",
    items: cart,
    total: cart.reduce((sum, item) => sum + Number(item.price.replace(/\D/g, "")) * item.quantity, 0).toLocaleString("ru-RU") + " СУМ",
  } : null;
  const visibleOrders = orders.length ? orders : cartOrder ? [cartOrder] : [];

  return <><FixedTop />
    <main className="profile-page">
      <div className="profile-tabs">
        <button type="button" className={tab === "profile" ? "is-active" : ""} onClick={() => setTab("profile")}>ПРОФИЛЬ</button>
        <button type="button" className={tab === "orders" ? "is-active" : ""} onClick={() => setTab("orders")}>ЗАКАЗЫ</button>
      </div>
      {tab === "profile" ? <>
        <section className="profile-box profile-details">
          <label><b>ИМЯ</b><input value={profile.name} onChange={(e) => setProfile((current) => ({ ...current, name: e.target.value }))} /><span>✎</span></label>
          <label><b>E-MAIL</b><input type="email" value={profile.email} onChange={(e) => setProfile((current) => ({ ...current, email: e.target.value }))} /><span>✎</span></label>
        </section>
        <section className="profile-box profile-addresses">
          <div className="profile-address-heading"><b>АДРЕС</b><button type="button" onClick={() => setShowAddressForm((open) => !open)}>ДОБАВИТЬ +</button></div>
          {showAddressForm && <form className="profile-address-form" onSubmit={addAddress}><div>{([ ["name", "ИМЯ"], ["street", "УЛИЦА, ДОМ"], ["city", "ГОРОД"], ["country", "СТРАНА"], ["phone", "ТЕЛЕФОН"] ] as const).map(([field, placeholder]) => <input key={field} value={address[field]} onChange={(e) => { setAddress((current) => ({ ...current, [field]: e.target.value })); setAddressError(""); }} placeholder={placeholder} />)}</div><button type="submit">СОХРАНИТЬ</button>{addressError && <p className="profile-address-error">{addressError}</p>}</form>}
          {profile.addresses.length ? <div className="profile-address-list">{profile.addresses.map((address, index) => <article key={address.id}><button type="button" className="profile-address-remove" onClick={() => setProfile((current) => ({ ...current, addresses: current.addresses.filter((item) => item.id !== address.id) }))}>×</button><small>{index === 0 ? "АДРЕС ПО УМОЛЧАНИЮ" : "АДРЕС"}</small>{address.lines.map((line, lineIndex) => <p key={`${address.id}-${lineIndex}`}>{line}</p>)}</article>)}</div> : <p className="profile-empty">НЕТ ДОБАВЛЕННЫХ АДРЕСОВ</p>}
        </section>
      </> : <section className="profile-orders">{visibleOrders.length ? visibleOrders.map((order) => {
        const status = orderStatusMeta[order.status];
        return <article className="profile-order" key={order.id}>
          <header><div><b>ЗАКАЗ #{order.id}</b><small>{order.paidAt ? `ОПЛАЧЕН ${new Date(order.paidAt).toLocaleDateString("ru-RU")}` : "ОЖИДАЕТ ОПЛАТЫ"}</small></div><span className={`profile-order-status ${status.className}`}>{status.label}</span></header>
          <div className="profile-order-body"><div className="profile-order-images">{order.items.map((item, index) => <img key={`${item.id}-${index}`} src={item.image} alt={item.title} />)}</div><div className="profile-order-items">{order.items.map((item, index) => <p key={`${item.id}-${item.size}-${index}`}><span>{item.title}</span><b>{item.quantity} × {item.price}</b></p>)}</div></div>
          <footer><span>{order.items.length} ТОВАР{order.items.length > 1 ? "А" : ""}</span><b>{order.total}</b></footer>
        </article>;
      }) : <div className="profile-box"><p className="profile-empty">ЗАКАЗОВ ПОКА НЕТ</p></div>}</section>}
    </main><Footer />
  </>;
}

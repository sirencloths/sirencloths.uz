"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import { customerApi, useCustomerAuth } from "@/components/CustomerAuthProvider";
import { useEffect, useState } from "react";

type Order = { id: string; orderNumber: string; status: string; fulfillmentStatus?: string; paymentStatus: string; totalAmount: string; discountAmount: string; createdAt: string; items: Array<{ id: string; titleSnapshot: string; skuSnapshot?: string | null; quantity: number; totalPrice: string; imageUrl?: string | null }> };
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const image = (url?: string | null) => !url ? "/images/p1.jpg" : url.startsWith("/uploads/") ? `${API.replace(/\/api$/, "")}${url}` : url;
const money = (value: string) => `${new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(Number(value) || 0)} UZS`;
function stage(order: Order) { if (order.status === "cancelled") return -1; if (order.fulfillmentStatus === "delivered" || order.status === "delivered") return 3; if (order.fulfillmentStatus === "shipped" || order.status === "shipped") return 2; if (order.fulfillmentStatus === "processing" || order.status === "processing" || order.paymentStatus === "paid") return 1; return 0; }

export default function ProfilePage() {
  const { customer, loading, openAuth, signOut } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[]>([]); const [ordersLoading, setOrdersLoading] = useState(false);
  // The API may still return the eligibility flag for a short moment after
  // expiry, so the customer-facing card must also enforce its own deadline.
  const welcomeDiscountActive = Boolean(customer?.welcomeDiscountEligible && (!customer.welcomeDiscountExpiresAt || new Date(customer.welcomeDiscountExpiresAt).getTime() > Date.now()));
  useEffect(() => { const token = localStorage.getItem("siren-customer-token"); if (!customer || !token) { setOrders([]); return; } setOrdersLoading(true); void customerApi("/checkout/customer/orders", undefined, token).then(setOrders).catch(() => setOrders([])).finally(() => setOrdersLoading(false)); }, [customer?.id]);
  return <><main className="profile-page">
    {loading ? <section className="profile-box"><p className="profile-empty">ЗAGRUZKA...</p></section> : !customer ? <section className="profile-box profile-empty"><p>ВОЙДИТЕ, ЧТОБЫ УВИДЕТЬ ПРОФИЛЬ И ЗАКАЗЫ</p><button type="button" onClick={openAuth}>SIGN IN / REGISTER</button></section> : <>
      <section className="customer-profile-hero"><div><p>AKKAUNT</p><h1>{customer.firstName} {customer.lastName}</h1><span>{customer.email}{customer.emailVerifiedAt ? " · Tasdiqlangan" : ""}</span></div><Link href="/profile/settings">Sozlamalar</Link></section>
      <section className="customer-profile-summary"><div><small>Telefon</small><b>{customer.phone || "Kiritilmagan"}</b></div><div><small>Hudud</small><b>{customer.region || "Kiritilmagan"}</b></div><div><small>Manzil</small><b>{customer.address || "Kiritilmagan"}</b></div></section>
      <section className="customer-orders"><header><div><p>BUYURTMALAR</p><h2>Mening buyurtmalarim</h2></div><span>{orders.length} ta</span></header>{ordersLoading ? <p className="profile-empty">Buyurtmalar yuklanmoqda…</p> : orders.map((order) => { const active = stage(order); const labels = ["Qabul qilindi", "Yig‘ilyapti", "Yo‘lda", "Yetkazildi"]; return <article className={`customer-order ${active < 0 ? "is-cancelled" : ""}`} key={order.id}><header><div><b>Chek #{order.orderNumber}</b><small>{new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</small></div><span className={`customer-order-status stage-${Math.max(0, active)}`}>{active < 0 ? "Bekor qilingan" : labels[active]}</span></header><div className="customer-order-items">{order.items.map((item) => <div key={item.id}><img src={image(item.imageUrl)} alt="" /><span><b>{item.titleSnapshot}</b><small>{item.skuSnapshot || "SKU"} × {item.quantity}</small></span><strong>{money(item.totalPrice)}</strong></div>)}</div><div className="customer-order-tracking"><div className="customer-tracking-code">TRACKING: SIR-{String(order.orderNumber).padStart(6, "0")}</div><ol>{labels.map((label, index) => <li className={index <= active ? "is-done" : ""} key={label}><i>{index < active ? "✓" : index + 1}</i><span>{label}</span></li>)}</ol></div><footer>{Number(order.discountAmount) > 0 && <span>Chegirma −{money(order.discountAmount)}</span>}<b>Jami: {money(order.totalAmount)}</b></footer></article>; })}{!ordersLoading && !orders.length && <div className="customer-orders-empty"><b>Hali buyurtma yo‘q</b><span>Birinchi buyurtmangiz shu yerda chek va tracking bilan chiqadi.</span><Link href="/shop">Xarid qilish</Link></div>}</section>
      {welcomeDiscountActive && <section className="customer-welcome-offer"><div className="customer-welcome-offer__badge">YANGI MIJOZ UCHUN</div><div className="customer-welcome-offer__discount">−{customer.welcomeDiscountPercent || 15}<small>%</small></div><div className="customer-welcome-offer__copy"><b>Welcome chegirma</b><span>Birinchi xaridingizga avtomatik qo‘llanadi. Promokod kiritish shart emas.</span>{customer.welcomeDiscountExpiresAt && <time>Taklif {new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(customer.welcomeDiscountExpiresAt))} gacha amal qiladi.</time>}</div><Link href="/shop">Xarid qilish <span aria-hidden="true">→</span></Link></section>}
      <section className="profile-actions"><button type="button" onClick={signOut}>ВЫЙТИ</button></section>
    </>}
  </main><Footer /></>;
}

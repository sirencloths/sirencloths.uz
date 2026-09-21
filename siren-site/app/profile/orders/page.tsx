"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { customerApi, useCustomerAuth } from "@/components/CustomerAuthProvider";

type Order = { id: string; orderNumber: string; status: string; fulfillmentStatus?: string; paymentStatus: string; totalAmount: string; discountAmount: string; createdAt: string; shippingAddress?: { fulfillmentMethod?: string }; items: Array<{ id: string; titleSnapshot: string; skuSnapshot?: string | null; quantity: number; totalPrice: string; imageUrl?: string | null }> };
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const image = (url?: string | null) => !url ? "/images/p1.jpg" : url.startsWith("/uploads/") ? `${API.replace(/\/api$/, "")}${url}` : url;
const money = (value: string) => `${new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(Number(value) || 0)} UZS`;
const stage = (order: Order) => order.status === "refunded" || order.paymentStatus === "refunded" ? -2 : order.status === "cancelled" || order.fulfillmentStatus === "pickup_expired" ? -1 : order.fulfillmentStatus === "delivered" || order.status === "delivered" || order.fulfillmentStatus === "picked_up" ? 4 : order.fulfillmentStatus === "shipped" || order.status === "shipped" ? 3 : order.fulfillmentStatus === "processing" || order.status === "processing" ? 2 : ["accepted", "accepted_pickup", "ready_for_pickup"].includes(order.fulfillmentStatus || "") ? 1 : 0;
const statusLabel = (order: Order) => { const value = stage(order); if (value === -2) return "Pul qaytarildi"; if (value === -1) return "Bekor qilingan"; if (order.shippingAddress?.fulfillmentMethod === "pickup") return ["Qabul qilinishini kutmoqda", "Qabul qilindi / tayyorlanmoqda", "Olib ketishga tayyor", "Olib ketildi", "Olib ketildi"][value]; return ["Qabul qilinishini kutmoqda", "Qabul qilindi", "Yig‘ildi", "Yo‘lda", "Yetkazildi"][value]; };

export default function ProfileOrdersPage() {
  const { customer, loading, openAuth } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[]>([]); const [ordersLoading, setOrdersLoading] = useState(false);
  useEffect(() => { const token = localStorage.getItem("siren-customer-token"); if (!customer || !token) { setOrders([]); return; } setOrdersLoading(true); void customerApi("/checkout/customer/orders", undefined, token).then(setOrders).catch(() => setOrders([])).finally(() => setOrdersLoading(false)); }, [customer?.id]);
  const history = orders;

  return <><main className="profile-orders-page"><Link className="profile-settings-back" href="/profile">← Profilga qaytish</Link>{loading ? <p className="profile-empty">Buyurtmalar yuklanmoqda…</p> : !customer ? <section className="profile-settings-auth"><h1>Buyurtmalar</h1><p>Buyurtmalar tarixini ko‘rish uchun akkauntga kiring.</p><button type="button" onClick={openAuth}>Kirish / ro‘yxatdan o‘tish</button></section> : <section className="customer-orders customer-orders--history"><header><div><p>BUYURTMALAR</p><h1>Barcha buyurtmalar</h1><span>Faol, muvaffaqiyatli, bekor qilingan va refund buyurtmalar.</span></div><span>{history.length} ta</span></header>{ordersLoading ? <p className="profile-empty">Buyurtmalar yuklanmoqda…</p> : history.map((order) => { const active = stage(order); return <article className={`customer-order ${active < 0 ? "is-cancelled" : ""}`} key={order.id}><header><div><b>Chek #{order.orderNumber}</b><small>{new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</small></div><span className={`customer-order-status stage-${Math.max(0, active)}`}>{statusLabel(order)}</span></header><div className="customer-order-items">{order.items.map((item) => <div key={item.id}><img src={image(item.imageUrl)} alt="" /><span><b>{item.titleSnapshot}</b><small>{item.skuSnapshot || "SKU"} × {item.quantity}</small></span><strong>{money(item.totalPrice)}</strong></div>)}</div><footer>{Number(order.discountAmount) > 0 && <span>Chegirma −{money(order.discountAmount)}</span>}<b>Jami: {money(order.totalAmount)}</b></footer></article>; })}{!ordersLoading && !history.length && <div className="customer-orders-empty"><b>Buyurtma yo‘q</b><span>Barcha buyurtmalaringiz shu yerda ko‘rinadi.</span><Link href="/shop">Xarid qilish</Link></div>}</section>}</main><Footer /></>;
}

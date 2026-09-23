"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, PackageCheck, RotateCcw, Truck, XCircle } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { customerApi, useCustomerAuth } from "./CustomerAuthProvider";
import { useModalLock } from "./useModalLock";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type StoreNotification = { id: string; kind?: "general" | "blog" | "discounts" | "products" | "order"; title?: Record<string, string>; text?: Record<string, string>; imageUrl?: string; href?: string; createdAt?: string };
type HeaderMessage = { kind: "quote"; quotes: string[] } | { kind: "countdown"; text: string; targetAt: string };
const asset = (url?: string) => url?.startsWith("/uploads/") ? `${API.replace(/\/api$/, "")}${url}` : url || "/images/p1.jpg";

function OrderNotificationIcon({ title, text }: { title: string; text: string }) {
  const value = `${title} ${text}`.toLocaleLowerCase();
  const Icon = /достав|yetkaz|deliver/.test(value) ? CheckCircle2 : /в пути|йўлда|yo‘lda|yolda|on the way/.test(value) ? Truck : /собран|yig‘ildi|yig'ildi|packed/.test(value) ? PackageCheck : /отмен|bekor|cancel/.test(value) ? XCircle : /возврат|qaytar|refund/.test(value) ? RotateCcw : ClipboardCheck;
  const inverted = Icon === XCircle || Icon === RotateCcw;
  return <span className="news-order-icon" style={{ display: "grid", width: "100%", aspectRatio: "1", placeItems: "center", boxSizing: "border-box", border: "1px solid #050505", borderRadius: 8, background: inverted ? "#050505" : "#fff", color: inverted ? "#fff" : "#050505" }}><Icon size={34} strokeWidth={1.8} /></span>;
}

function LaunchCountdown({ text, targetAt, locale }: { text: string; targetAt: string; locale: "uz" | "ru" | "en" | "ja" }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer); }, []);
  const remaining = Math.max(0, new Date(targetAt).getTime() - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  const labels = locale === "ru" ? ["ДН", "Ч", "М", "С"] : locale === "en" ? ["D", "H", "M", "S"] : locale === "ja" ? ["日", "時", "分", "秒"] : ["KUN", "SOAT", "DAQ", "SON"];
  return <span className="topbar-quote-text" aria-label={`${text}: ${days} ${labels[0]} ${hours} ${labels[1]} ${minutes} ${labels[2]} ${seconds} ${labels[3]}`}><span>{text}</span><time>{days} {labels[0]} {String(hours).padStart(2, "0")} {labels[1]} {String(minutes).padStart(2, "0")} {labels[2]} {String(seconds).padStart(2, "0")} {labels[3]}</time></span>;
}

export default function TopBar() {
  const { language, locale, openLanguageSelector, t } = useLanguage();
  const { customer } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoreNotification[]>([]);
  const [orderItems, setOrderItems] = useState<StoreNotification[]>([]);
  const [readAt, setReadAt] = useState<Record<string, string>>({});
  const [visitorId, setVisitorId] = useState("");
  const [headerMessage, setHeaderMessage] = useState<HeaderMessage>({ kind: "quote", quotes: [] });
  const [quoteIndex, setQuoteIndex] = useState(0);
  const readReady = useRef(false);
  useModalLock(open);
  const markRead = (ids: string[]) => setReadAt((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => [id, current[id] ?? new Date().toISOString()])) }));
  const loadNotifications = useCallback(async () => { try { const response = await fetch(`${API}/content/notifications`, { cache: "no-store" }); setItems(response.ok ? await response.json() as StoreNotification[] : []); } catch { setItems([]); } }, []);
  useEffect(() => { void loadNotifications(); }, [loadNotifications]);
  useEffect(() => { const token = localStorage.getItem("siren-customer-token"); if (!customer || !token) { setOrderItems([]); return; } void customerApi("/checkout/customer/notifications", undefined, token).then((data) => setOrderItems(Array.isArray(data) ? data as StoreNotification[] : [])).catch(() => setOrderItems([])); }, [customer?.id]);
  useEffect(() => { const load = async () => { try { const response = await fetch(`${API}/content/header-message`, { cache: "no-store" }); const value = response.ok ? await response.json() as Partial<HeaderMessage> : null; if (value?.kind === "countdown" && typeof value.text === "string" && typeof value.targetAt === "string") setHeaderMessage({ kind: "countdown", text: value.text, targetAt: value.targetAt }); else if (value?.kind === "quote" && Array.isArray(value.quotes)) setHeaderMessage({ kind: "quote", quotes: value.quotes.filter((quote): quote is string => typeof quote === "string" && Boolean(quote.trim())) }); } catch { /* optional header content */ } }; void load(); const timer = window.setInterval(() => void load(), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { setQuoteIndex(0); if (headerMessage.kind !== "quote" || headerMessage.quotes.length < 2) return; const timer = window.setInterval(() => setQuoteIndex((index) => (index + 1) % headerMessage.quotes.length), 10_000); return () => window.clearInterval(timer); }, [headerMessage]);
  useEffect(() => { try { const stored = JSON.parse(localStorage.getItem("siren-read-notifications") ?? "{}"); if (stored && typeof stored === "object") setReadAt(stored); } catch { setReadAt({}); } finally { readReady.current = true; } const storedId = localStorage.getItem("siren-notification-visitor-id"); const id = storedId || crypto.randomUUID(); if (!storedId) localStorage.setItem("siren-notification-visitor-id", id); setVisitorId(id); }, []);
  useEffect(() => { if (readReady.current) localStorage.setItem("siren-read-notifications", JSON.stringify(readAt)); }, [readAt]);
  const copy = (value?: Record<string, string>) => value?.[locale] || value?.en || value?.ru || value?.uz || "";
  const visibleItems = [...orderItems, ...items.filter((item) => { const preference = customer?.metadata?.notificationPreferences; return !customer || !item.kind || item.kind === "general" || item.kind === "blog" ? preference?.blog !== false : item.kind === "discounts" ? preference?.discounts !== false : preference?.products !== false; })].sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")));
  const unreadItems = visibleItems.filter((item) => !readAt[item.id]);
  const dateLocale = locale === "uz" ? "uz-UZ" : locale === "en" ? "en-GB" : "ru-RU";
  const trackClick = (id: string) => { if (visitorId) void fetch(`${API}/content/notifications/${encodeURIComponent(id)}/click`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId }), keepalive: true }); };
  return <div className="topbar"><button className="topbar-control" type="button" onClick={openLanguageSelector} aria-label={t("language")}><Image src="/icons/lang.svg" alt="" width={22} height={22} /><span>{language.label}</span></button><div className="topbar-quote" aria-live="polite">{headerMessage.kind === "quote" && headerMessage.quotes.length > 0 ? <span className="topbar-quote-text">{headerMessage.quotes[quoteIndex]}</span> : headerMessage.kind === "countdown" ? <span className="topbar-quote-text">{headerMessage.text}</span> : null}</div><div className="topbar-news-wrap"><button className="topbar-control topbar-control--right" type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-label={t("news")}>{unreadItems.length > 0 && <span className="cart-badge" aria-label={`${unreadItems.length} ${t("notifications")}`}>{unreadItems.length > 9 ? "9+" : unreadItems.length}</span>}<span>{t("news")}</span></button>{open && <div className="news-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="news-modal" role="dialog" aria-modal="true" aria-label={t("news")} onMouseDown={(event) => event.stopPropagation()}><header><h2>{t("news")}</h2><button type="button" onClick={() => setOpen(false)} aria-label={t("close")}>×</button></header>{visibleItems.length ? <><div className="news-modal-list">{visibleItems.map((item) => <Link key={item.id} className={!readAt[item.id] ? "is-unread" : ""} href={item.href || "/"} onClick={() => { markRead([item.id]); trackClick(item.id); setOpen(false); }}>{item.kind === "order" ? <OrderNotificationIcon title={copy(item.title)} text={copy(item.text)} /> : <img src={asset(item.imageUrl)} alt="" />}<span><b>{copy(item.title)}</b><small>{copy(item.text)}</small><time>{item.createdAt ? new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(item.createdAt)) : ""}</time></span></Link>)}</div><footer><button type="button" disabled={!unreadItems.length} onClick={() => markRead(unreadItems.map((item) => item.id))}>{t("readAll")}</button></footer></> : <p>{t("noNotifications")}</p>}</section></div>}</div></div>;
}

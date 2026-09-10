"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useCustomerAuth } from "./CustomerAuthProvider";

const marqueeItems = Array.from({ length: 8 });
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type StoreNotification = { id: string; kind?: "general" | "blog" | "discounts" | "products"; title?: Record<string, string>; text?: Record<string, string>; imageUrl?: string; href?: string; createdAt?: string; clicks?: number };
const asset = (url?: string) => url?.startsWith("/uploads/") ? `${API.replace(/\/api$/, "")}${url}` : url || "";

export default function TopBar() {
  const { language, locale, openLanguageSelector, t } = useLanguage();
  const { customer } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoreNotification[]>([]);
  const [readAt, setReadAt] = useState<Record<string, string>>({});
  const [visitorId, setVisitorId] = useState("");
  const markRead = (ids: string[]) => setReadAt((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => [id, current[id] ?? new Date().toISOString()])) }));
  useEffect(() => { void fetch(`${API}/content/notifications`).then((response) => response.ok ? response.json() : []).then((data) => setItems(Array.isArray(data) ? data : [])).catch(() => setItems([])); }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("siren-read-notifications");
      const knownRead: unknown = saved ? JSON.parse(saved) : {};
      if (Array.isArray(knownRead)) setReadAt(Object.fromEntries(knownRead.filter((id): id is string => typeof id === "string").map((id) => [id, new Date().toISOString()])));
      else if (knownRead && typeof knownRead === "object") setReadAt(Object.fromEntries(Object.entries(knownRead).filter(([id, date]) => typeof id === "string" && typeof date === "string")));
    } catch { setReadAt({}); }
  }, []);
  useEffect(() => {
    const stored = localStorage.getItem("siren-notification-visitor-id");
    const id = stored || crypto.randomUUID();
    if (!stored) localStorage.setItem("siren-notification-visitor-id", id);
    setVisitorId(id);
  }, []);
  useEffect(() => { localStorage.setItem("siren-read-notifications", JSON.stringify(readAt)); }, [readAt]);
  const copy = (value?: Record<string, string>) => value?.[locale] || value?.ru || value?.en || value?.uz || "";
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const allowedItems = items.filter((item) => {
    if (!customer || !item.kind || item.kind === "general") return true;
    const preferences = customer.metadata?.notificationPreferences;
    return item.kind === "blog" ? preferences?.blog === true : item.kind === "discounts" ? preferences?.discounts === true : preferences?.products === true;
  });
  const visibleItems = allowedItems.filter((item) => !readAt[item.id] || Date.now() - new Date(readAt[item.id]).getTime() < oneWeek);
  const unreadItems = visibleItems.filter((item) => !readAt[item.id]);
  const trackClick = (id: string) => { if (visitorId) void fetch(`${API}/content/notifications/${encodeURIComponent(id)}/click`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId }), keepalive: true }); };

  return (
    <div className="topbar">
      <button className="topbar-control" type="button" onClick={openLanguageSelector} aria-label={t("language")}>
        <Image src="/icons/lang.svg" alt="" width={22} height={22} />
        <span>{language.label}</span>
      </button>

      <div className="topbar-marquee" aria-hidden="true">
        <div className="marquee-track">
          {marqueeItems.map((_, i) => (
            <span key={i}>{t("sale")}</span>
          ))}
        </div>
      </div>

      <div className="topbar-news-wrap"><button className="topbar-control topbar-control--right" type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-label="Новости"><span>Новости</span>{unreadItems.length > 0 && <span className="cart-badge" aria-label={`${unreadItems.length} новых уведомлений`}>{unreadItems.length > 9 ? "9+" : unreadItems.length}</span>}</button>{open && <div className="news-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="news-modal" role="dialog" aria-modal="true" aria-label="Новости" onMouseDown={(event) => event.stopPropagation()}><header><h2>Новости</h2><button type="button" onClick={() => setOpen(false)} aria-label="Закрыть">×</button></header>{visibleItems.length ? <><div className="news-modal-list">{visibleItems.map((item) => <Link key={item.id} className={!readAt[item.id] ? "is-unread" : ""} href={item.href || "/"} onClick={() => { markRead([item.id]); trackClick(item.id); setOpen(false); }}>{asset(item.imageUrl) && <img src={asset(item.imageUrl)} alt="" />}<span><b>{copy(item.title)}</b><small>{copy(item.text)}</small><time>{item.createdAt ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(item.createdAt)) : ""}</time></span></Link>)}</div>{unreadItems.length > 0 && <footer><button type="button" onClick={() => markRead(unreadItems.map((item) => item.id))}>ПРОЧИТАТЬ ВСЕ</button></footer>}</> : <p>Новых уведомлений пока нет.</p>}</section></div>}</div>
    </div>
  );
}

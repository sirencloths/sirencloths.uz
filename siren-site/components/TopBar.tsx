"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useCustomerAuth } from "./CustomerAuthProvider";
import { useModalLock } from "./useModalLock";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type StoreNotification = { id: string; kind?: "general" | "blog" | "discounts" | "products"; title?: Record<string, string>; text?: Record<string, string>; imageUrl?: string; href?: string; createdAt?: string; clicks?: number };
type HeaderMessage = { kind: "quote"; quotes: string[] } | { kind: "countdown"; text: string; targetAt: string };
const asset = (url?: string) => url?.startsWith("/uploads/") ? `${API.replace(/\/api$/, "")}${url}` : url || "";

function LaunchCountdown({ text, targetAt, onElapsed }: { text: string; targetAt: string; onElapsed: () => void }) {
  const [remaining, setRemaining] = useState(0);
  const elapsed = useRef(false);
  useEffect(() => {
    elapsed.current = false;
    const update = () => {
      const next = Math.max(0, new Date(targetAt).getTime() - Date.now());
      setRemaining(next);
      if (next === 0 && !elapsed.current) { elapsed.current = true; onElapsed(); }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [onElapsed, targetAt]);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return <div className="topbar-launch-countdown" aria-label={`${text}: ${days} kun ${hours} soat ${minutes} minut ${seconds} sekund`}>
    <span>{text}</span><time>{String(days).padStart(2, "0")} KUN&nbsp;{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</time>
  </div>;
}

export default function TopBar() {
  const { language, locale, openLanguageSelector, t } = useLanguage();
  const { customer } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoreNotification[]>([]);
  const [readAt, setReadAt] = useState<Record<string, string>>({});
  const [visitorId, setVisitorId] = useState("");
  const [headerMessage, setHeaderMessage] = useState<HeaderMessage>({ kind: "quote", quotes: [] });
  const [quoteIndex, setQuoteIndex] = useState(0);
  useModalLock(open);
  const markRead = (ids: string[]) => setReadAt((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => [id, current[id] ?? new Date().toISOString()])) }));
  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API}/content/notifications`, { cache: "no-store" });
      const data: unknown = response.ok ? await response.json() : [];
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
  }, []);
  useEffect(() => { void loadNotifications(); }, [loadNotifications]);
  const loadHeaderMessage = useCallback(async () => {
      try {
        const response = await fetch(`${API}/content/header-message`, { cache: "no-store" });
        const data: unknown = response.ok ? await response.json() : null;
        if (!data || typeof data !== "object") return;
        const value = data as Partial<HeaderMessage>;
        if (value.kind === "countdown" && typeof value.text === "string" && typeof value.targetAt === "string") setHeaderMessage({ kind: "countdown", text: value.text, targetAt: value.targetAt });
        else if (value.kind === "quote" && Array.isArray(value.quotes)) setHeaderMessage({ kind: "quote", quotes: value.quotes.filter((quote): quote is string => typeof quote === "string" && Boolean(quote.trim())) });
        // A scheduled drop can have created a new customer notification.
        // Refresh this list immediately so its badge and inbox update without
        // a page reload.
        void loadNotifications();
      } catch { /* The header stays stable if the optional content API is unavailable. */ }
  }, [loadNotifications]);
  useEffect(() => {
    void loadHeaderMessage();
    const refresh = window.setInterval(() => void loadHeaderMessage(), 30_000);
    return () => window.clearInterval(refresh);
  }, [loadHeaderMessage]);
  useEffect(() => {
    setQuoteIndex(0);
    if (headerMessage.kind !== "quote" || headerMessage.quotes.length < 2) return;
    const timer = window.setInterval(() => setQuoteIndex((index) => (index + 1) % headerMessage.quotes.length), 10_000);
    return () => window.clearInterval(timer);
  }, [headerMessage]);
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

      <div className="topbar-quote" aria-live="polite">
        {headerMessage.kind === "countdown"
          ? <LaunchCountdown text={headerMessage.text} targetAt={headerMessage.targetAt} onElapsed={() => void loadHeaderMessage()} />
          : headerMessage.quotes.length > 0 && <span className="topbar-quote-text" key={headerMessage.quotes[quoteIndex]}>{headerMessage.quotes[quoteIndex]}</span>}
      </div>

      <div className="topbar-news-wrap"><button className="topbar-control topbar-control--right" type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-label="Новости">{unreadItems.length > 0 && <span className="cart-badge" aria-label={`${unreadItems.length} новых уведомлений`}>{unreadItems.length > 9 ? "9+" : unreadItems.length}</span>}<span>Новости</span></button>{open && <div className="news-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="news-modal" role="dialog" aria-modal="true" aria-label="Новости" onMouseDown={(event) => event.stopPropagation()}><header><h2>Новости</h2><button type="button" onClick={() => setOpen(false)} aria-label="Закрыть">×</button></header>{visibleItems.length ? <><div className="news-modal-list">{visibleItems.map((item) => <Link key={item.id} className={!readAt[item.id] ? "is-unread" : ""} href={item.href || "/"} onClick={() => { markRead([item.id]); trackClick(item.id); setOpen(false); }}>{asset(item.imageUrl) && <img src={asset(item.imageUrl)} alt="" />}<span><b>{copy(item.title)}</b><small>{copy(item.text)}</small><time>{item.createdAt ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(item.createdAt)) : ""}</time></span></Link>)}</div>{unreadItems.length > 0 && <footer><button type="button" onClick={() => markRead(unreadItems.map((item) => item.id))}>ПРОЧИТАТЬ ВСЕ</button></footer>}</> : <p>Новых уведомлений пока нет.</p>}</section></div>}</div>
    </div>
  );
}

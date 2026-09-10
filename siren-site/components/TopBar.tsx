"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const marqueeItems = Array.from({ length: 8 });
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type StoreNotification = { id: string; title?: Record<string, string>; text?: Record<string, string>; imageUrl?: string; href?: string; createdAt?: string };
const asset = (url?: string) => url?.startsWith("/uploads/") ? `${API.replace(/\/api$/, "")}${url}` : url || "";

export default function TopBar() {
  const { language, locale, openLanguageSelector, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoreNotification[]>([]);
  useEffect(() => { void fetch(`${API}/content/notifications`).then((response) => response.ok ? response.json() : []).then((data) => setItems(Array.isArray(data) ? data : [])).catch(() => setItems([])); }, []);
  const copy = (value?: Record<string, string>) => value?.[locale] || value?.ru || value?.en || value?.uz || "";

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

      <div className="topbar-news-wrap"><button className="topbar-control topbar-control--right" type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-label="Новости"><span>Новости</span>{items.length > 0 && <span className="cart-badge" aria-label={`${items.length} новых уведомлений`}>{items.length > 9 ? "9+" : items.length}</span>}</button>{open && <div className="news-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="news-modal" role="dialog" aria-modal="true" aria-label="Новости" onMouseDown={(event) => event.stopPropagation()}><header><h2>Новости</h2><button type="button" onClick={() => setOpen(false)} aria-label="Закрыть">×</button></header>{items.length ? <div className="news-modal-list">{items.map((item) => <Link key={item.id} href={item.href || "/"} onClick={() => setOpen(false)}>{asset(item.imageUrl) && <img src={asset(item.imageUrl)} alt="" />}<span><b>{copy(item.title)}</b><small>{copy(item.text)}</small><time>{item.createdAt ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(new Date(item.createdAt)) : ""}</time></span></Link>)}</div> : <p>Новых уведомлений пока нет.</p>}</section></div>}</div>
    </div>
  );
}

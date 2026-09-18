"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

const tickerItems = Array.from({ length: 12 });

export default function Footer() {
  const { t, locale } = useLanguage();
  const copy = locale === "ru" ? {
    ticker: "SIREN / ТАШКЕНТ / STREETWEAR /", tagline: "Выбирай свой стиль. Новые дропы и коллекции в одном месте.", explore: "СМОТРЕТЬ", customers: "ПОКУПАТЕЛЯМ", orders: "Мои заказы", notifications: "Уведомления", contacts: "КОНТАКТЫ", social: "СОЦСЕТИ", phone: "Телефон", delivery: "Доставка по Узбекистану",
  } : locale === "uz" ? {
    ticker: "SIREN / TOSHKENT / STREETWEAR /", tagline: "O‘z uslubingni tanla. Yangi drop va kolleksiyalar bir joyda.", explore: "KO‘RISH", customers: "MIJOZLAR UCHUN", orders: "Buyurtmalarim", notifications: "Bildirishnomalar", contacts: "ALOQA", social: "IJTIMOIY TARMOQLAR", phone: "Telefon", delivery: "O‘zbekiston bo‘ylab yetkazib berish",
  } : locale === "ja" ? {
    ticker: "SIREN / タシケント / ストリートウェア /", tagline: "自分らしいスタイルを選ぼう。新作とコレクションをひとつの場所で。", explore: "見る", customers: "お客様へ", orders: "注文履歴", notifications: "お知らせ", contacts: "お問い合わせ", social: "ソーシャル", phone: "電話", delivery: "ウズベキスタン全域へ配送",
  } : {
    ticker: "SIREN / TASHKENT / STREETWEAR /", tagline: "Choose your style. New drops and collections in one place.", explore: "EXPLORE", customers: "FOR CUSTOMERS", orders: "My orders", notifications: "Notifications", contacts: "CONTACT", social: "SOCIAL MEDIA", phone: "Phone", delivery: "Delivery across Uzbekistan",
  };
  return <footer className="footer-v2">
    <div className="footer-v2__accent" aria-hidden="true"><div className="footer-v2__accent-track">{tickerItems.map((_, index) => <span key={index}>{copy.ticker}</span>)}</div></div>
    <div className="footer-v2__main">
      <section className="footer-v2__brand">
        <Link href="/" aria-label="SIREN bosh sahifasi"><Image src="/icons/logo.svg" alt="SIREN" width={148} height={35} /></Link>
        <p>{copy.tagline}</p>
        <Link className="footer-v2__shop-cta" href="/shop">{t("allProducts")} <span>→</span></Link>
      </section>
      <nav className="footer-v2__links" aria-label={copy.explore}>
        <p>{copy.explore}</p>
        <Link href="/shop">{t("shop")}</Link><Link href="/collections">{t("collections")}</Link><Link href="/lookbook">{t("lookbook")}</Link><Link href="/blog">{t("blog")}</Link>
      </nav>
      <nav className="footer-v2__links" aria-label={copy.customers}>
        <p>{copy.customers}</p>
        <Link href="/cart">{t("cart")}</Link><Link href="/favorites">{t("favorites")}</Link><Link href="/profile/orders">{copy.orders}</Link><Link href="/profile/settings#notifications">{copy.notifications}</Link>
      </nav>
      <section className="footer-v2__support">
        <p>{copy.contacts}</p>
        <a href="tel:+998200016668"><small>{copy.phone}</small><b>+998 20 001 66 68</b></a>
        <a href="mailto:support@sirencloths.uz"><small>{t("email")}</small><b>support@sirencloths.uz</b></a>
        <Link className="footer-v2__social-link" href="/social">{copy.social} <span>↗</span></Link>
      </section>
    </div>
    <div className="footer-v2__bottom"><span>© {new Date().getFullYear()} SIREN</span><span>{copy.delivery}</span><Link href="/delivery-payment">{t("delivery")}</Link><Link href="/returns">{t("exchange")}</Link></div>
  </footer>;
}

"use client";

import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/data";
import { useFavorites } from "@/components/FavoriteContext";
import { useLanguage } from "@/components/LanguageProvider";
import { customerApi, useCustomerAuth } from "@/components/CustomerAuthProvider";
import { formatStorePrice } from "@/lib/api";
import { useEffect, useState } from "react";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");

function FavoriteCard({ product, discountPercent = 0, onRemove }: { product: Product; discountPercent?: number; onRemove: (product: Product, personalDiscount: boolean) => void }) {
  const { t } = useLanguage();
  const candidateImage = typeof product.image === "string" ? product.image.trim() : "";
  const imageSrc = candidateImage.startsWith("/uploads/") ? `${apiOrigin}${candidateImage}` : candidateImage;
  const isRemoteImage = (() => {
    try { const url = new URL(imageSrc); return url.protocol === "https:" || (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")); }
    catch { return false; }
  })();
  const safeImage = imageSrc.startsWith("/images/") || isRemoteImage ? imageSrc : "/images/p1.jpg";
  const amount = (value: string) => Number(value.replace(/[^\d]/g, ""));
  const personalSalePrice = discountPercent ? formatStorePrice(String(Math.round(amount(product.price) * (100 - discountPercent) / 100)), "UZS") : product.price;
  const oldPrice = product.oldPrice ?? (discountPercent ? product.price : undefined);
  const shownDiscount = oldPrice && amount(oldPrice) > 0 ? Math.round((1 - amount(personalSalePrice) / amount(oldPrice)) * 100) : 0;

  return (
    <article className="product-card favorite-product-card">
      <div className="product-image">
        <Link href={`/products/${product.id}${product.colorSlug ? `?color=${encodeURIComponent(product.colorSlug)}` : ""}`} aria-label={product.title}>
          <Image src={safeImage} alt={product.alt} width={350} height={350} unoptimized={isRemoteImage} />
        </Link>
        <button type="button" className="favorite-remove-btn" aria-label={t("unselect")} onClick={() => onRemove(product, Boolean(discountPercent))}>
          <Image src="/icons/close.svg" alt="" width={15} height={15} />
        </button>
      </div>
      <Link href={`/products/${product.id}${product.colorSlug ? `?color=${encodeURIComponent(product.colorSlug)}` : ""}`}>
        <h2>{product.title}</h2>
        <p>{product.color === "GRAY" ? t("gray") : product.color}</p>
        <div className={`product-card-pricing${shownDiscount ? " is-sale" : ""}`}>
          <strong className={shownDiscount ? "product-card-price--sale" : ""}>{personalSalePrice}</strong>
          {oldPrice && <del className="product-card-old-price">{oldPrice}</del>}
          {shownDiscount ? <span className="product-card-discount">−{shownDiscount}%</span> : null}
        </div>
      </Link>
    </article>
  );
}

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();
  const { customer } = useCustomerAuth();
  const [discounts, setDiscounts] = useState<Record<string, number>>({});
  const { t, locale } = useLanguage();
  const [pendingRemoval, setPendingRemoval] = useState<{ product: Product; personalDiscount: boolean } | null>(null);
  useEffect(() => { const token = localStorage.getItem("siren-customer-token"); if (!customer || !token) { setDiscounts({}); return; } void customerApi("/checkout/customer/commerce-state", undefined, token).then((state: { discounts?: Array<{ productId: string; percent: number }> }) => setDiscounts(Object.fromEntries((state.discounts ?? []).map((item) => [item.productId, item.percent])))).catch(() => setDiscounts({})); }, [customer?.id]);

  return (
    <main className="favorites-page">
        <section className="favorites-list">
          <h1>{t("favoritesTitle")} <span>({favorites.length})</span></h1>
          {favorites.length ? (
            <div className="favorites-grid">{favorites.map((product) => <FavoriteCard key={`${product.id}:${product.colorSlug || product.color}`} product={product} discountPercent={discounts[product.productId ?? product.id] ?? 0} onRemove={(selected, personalDiscount) => personalDiscount ? setPendingRemoval({ product: selected, personalDiscount }) : removeFavorite(selected)} />)}</div>
          ) : <p className="favorites-empty">{t("favoritesEmpty")}</p>}
        </section>
        {pendingRemoval && <FavoriteRemovalDialog locale={locale} product={pendingRemoval.product} personalDiscount={pendingRemoval.personalDiscount} onCancel={() => setPendingRemoval(null)} onConfirm={async () => { const token = localStorage.getItem("siren-customer-token"); if (token) await customerApi(`/checkout/customer/personal-discounts/${pendingRemoval.product.productId ?? pendingRemoval.product.id}`, undefined, token, "DELETE").catch(() => undefined); removeFavorite(pendingRemoval.product); setPendingRemoval(null); }} />}
      </main>
  );
}

function FavoriteRemovalDialog({ locale, product, personalDiscount, onCancel, onConfirm }: { locale: string; product: Product; personalDiscount: boolean; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const copy = locale === "ja" ? { title: "個人割引が有効です", body: "この商品をお気に入りから削除すると、個人割引も削除されます。", cancel: "キャンセル", confirm: "削除して割引を無効にする" } : locale === "en" ? { title: "Personal discount is active", body: "Removing this item from favorites will also remove its personal discount.", cancel: "Cancel", confirm: "Remove item and discount" } : locale === "ru" ? { title: "Персональная скидка активна", body: "Если удалить этот товар из избранного, его персональная скидка тоже будет удалена.", cancel: "Отмена", confirm: "Удалить товар и скидку" } : { title: "Individual chegirma faol", body: "Bu mahsulotni sevimlilardan olib tashlasangiz, uning individual chegirmasi ham o‘chadi.", cancel: "Bekor qilish", confirm: "Mahsulot va chegirmani o‘chirish" };
  return <div className="cart-remove-backdrop" role="presentation" onMouseDown={onCancel}><section className="cart-remove-confirm" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><p>{personalDiscount ? "INDIVIDUAL DISCOUNT" : "SEVIMLILAR"}</p><h2>{personalDiscount ? copy.title : "Mahsulotni olib tashlaysizmi?"}</h2><span>{personalDiscount ? copy.body : product.title}</span><div><button type="button" onClick={onCancel}>{personalDiscount ? copy.cancel : "Bekor qilish"}</button><button type="button" onClick={() => void onConfirm()}>{personalDiscount ? copy.confirm : "Olib tashlash"}</button></div></section></div>;
}

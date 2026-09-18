"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import { useLanguage } from "./LanguageProvider";
import { useFavorites } from "./FavoriteContext";

type Variant = { id: string; sku: string; color?: string | null; size?: string | null; price?: string | null; originalPrice?: string; discountPercent?: number; discountEndsAt?: string; discountScope?: "product" | "color" | "size"; inventoryQuantity: number; isActive?: boolean; attributes?: Record<string, unknown> };
type Props = { id: string; title: string; price: string; currencyCode: string; image: string; variants: Variant[]; initialColor?: string; sizeGuideImageUrl?: string };

const swatch = (color: string) => ({ black: "#111", white: "#fff", gray: "#8b8b8b", blue: "#1769aa", green: "#0b7a3a", red: "#b91c1c", brown: "#704214", pink: "#db5b82", cream: "#f4ead2" }[color.toLowerCase()] ?? (color.trim() || "#d8d8d4"));
const optionKey = (value?: string | null, fallback = "default") => (value || fallback).trim().toLocaleLowerCase("uz-UZ");
const optionLabel = (value?: string | null, fallback = "ONE SIZE") => value?.trim() || fallback;
const colorSwatch = (color: string) => swatch(({ qora: "black", oq: "white", kulrang: "gray", "ko'k": "blue", yashil: "green", qizil: "red", jigarrang: "brown" }[optionKey(color)] ?? color));

export default function ProductDetailClient({ id, title, price, currencyCode, image, variants, initialColor, sizeGuideImageUrl }: Props) {
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const searchParams = useSearchParams();
  const usableVariants = variants.filter((variant) => variant.isActive !== false);
  const colors = useMemo(() => Array.from(new Map(usableVariants.map((variant) => {
    const label = optionLabel(variant.color, "Default");
    return [optionKey(variant.color), label] as const;
  })).entries()).map(([key, label]) => ({ key, label })), [usableVariants]);
  const [selectedColor, setSelectedColor] = useState(() => {
    const requested = optionKey(initialColor);
    const hasStock = (colorKey: string) => usableVariants.some((variant) => optionKey(variant.color) === colorKey && variant.inventoryQuantity > 0);
    return colors.find((color) => color.key === requested && hasStock(color.key))?.key ?? colors.find((color) => hasStock(color.key))?.key ?? colors.find((color) => color.key === requested)?.key ?? colors[0]?.key ?? "default";
  });
  const requestedColor = searchParams.get("color")?.trim().toLocaleLowerCase("uz-UZ") ?? "";
  const [handledRequestedColor, setHandledRequestedColor] = useState<string | null>(null);
  const colorSignature = colors.map((color) => color.key).join("|");
  useEffect(() => {
    if (!requestedColor || handledRequestedColor === requestedColor) return;
    const matchingColor = colors.find((color) => color.key === requestedColor || color.key.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") === requestedColor);
    if (matchingColor) setSelectedColor(matchingColor.key);
    setHandledRequestedColor(requestedColor);
  }, [requestedColor, handledRequestedColor, colorSignature]);
  const sizeVariants = useMemo(() => usableVariants.filter((variant) => optionKey(variant.color) === selectedColor), [usableVariants, selectedColor]);
  const sizes = useMemo(() => Array.from(new Map(sizeVariants.map((variant) => {
    const label = optionLabel(variant.size);
    return [optionKey(variant.size, "one size"), label] as const;
  })).entries()).map(([key, label]) => ({ key, label })), [sizeVariants]);
  const [selectedSize, setSelectedSize] = useState("one size");
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const selectedSizeOption = sizes.find((size) => size.key === selectedSize) ?? sizes.find((size) => sizeVariants.some((variant) => optionKey(variant.size, "one size") === size.key && variant.inventoryQuantity > 0)) ?? sizes[0];
  const selectedVariant = sizeVariants.find((variant) => optionKey(variant.size, "one size") === selectedSizeOption?.key) ?? sizeVariants.find((variant) => variant.inventoryQuantity > 0) ?? sizeVariants[0] ?? usableVariants[0];
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const endsAt = selectedVariant?.discountEndsAt;
    if (!endsAt) { setRemaining(""); return; }
    const update = () => { const milliseconds = new Date(endsAt).valueOf() - Date.now(); if (milliseconds <= 0) { setRemaining(""); return; } const seconds = Math.floor(milliseconds / 1000); const hours = Math.floor(seconds / 3600); const minutes = Math.floor(seconds % 3600 / 60); setRemaining(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`); };
    update(); const timer = window.setInterval(update, 1_000); return () => window.clearInterval(timer);
  }, [selectedVariant?.discountEndsAt]);
  const available = !selectedVariant || selectedVariant.inventoryQuantity > 0;
  const selectedColorImages = sizeVariants.flatMap((variant) => Array.isArray(variant.attributes?.images) ? variant.attributes.images.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []);
  const selectedImage = selectedColorImages[0] || image;
  const selectedColorLabel = colors.find((color) => color.key === selectedColor)?.label ?? "Default";
  const favoriteProduct = { id, title, price, image: selectedImage, alt: title, color: selectedColorLabel.toUpperCase(), colorSlug: selectedColor || "default" };
  const chooseColor = (color: { key: string; label: string }) => { setSelectedColor(color.key); window.dispatchEvent(new CustomEvent("siren-product-color-change", { detail: { productId: id, color: color.label } })); };
  const displayPrice = selectedVariant?.price ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(selectedVariant.price)).replace(/\u00A0/g, ".")} ${currencyCode === "UZS" ? "СУМ" : currencyCode}` : price;
  const oldPrice = selectedVariant?.originalPrice ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(selectedVariant.originalPrice)).replace(/\u00A0/g, ".")} ${currencyCode === "UZS" ? "СУМ" : currencyCode}` : "";

  return <>
    <p className="product-detail-sku">SKU: {selectedVariant?.sku || "—"}</p>
    <div className="product-detail-pricing"><p className={`product-detail-price${selectedVariant?.discountPercent ? " is-sale" : ""}`}>{displayPrice}</p>{oldPrice && <del>{oldPrice}</del>}{remaining && <small>CHEGIRMA TUGASHIGA: {remaining}</small>}</div>
    {colors.length > 0 && <div className="product-colors"><div className="product-colors-label"><span>{t("chooseColor")}</span><strong>{selectedColorLabel}</strong></div><div className="product-color-list">{colors.map((color) => { const colorVariants = usableVariants.filter((variant) => optionKey(variant.color) === color.key); const inStock = colorVariants.some((variant) => variant.inventoryQuantity > 0); const isSelected = selectedColor === color.key; const hasColorDiscount = colorVariants.some((variant) => variant.discountScope === "color"); return <button key={color.key} type="button" disabled={!inStock} className={`product-color ${isSelected ? "product-color--selected" : ""} ${hasColorDiscount ? "product-color--discount" : ""} ${!inStock ? "product-color--disabled" : ""}`} style={{ backgroundColor: colorSwatch(color.label), ...(isSelected ? { outline: "3px solid #000", outlineOffset: "2px", border: "1px solid #b0b0b0" } : {}) }} aria-label={`${color.label}${hasColorDiscount ? " — chegirmada" : ""}`} aria-pressed={isSelected} onClick={() => chooseColor(color)} />; })}</div></div>}
    {sizes.length > 0 && <div className="product-sizes"><div className="product-sizes-top"><div className="product-sizes-label"><span>{t("chooseSize")}</span><strong>{selectedSizeOption?.label ?? "ONE SIZE"}</strong></div>{sizeGuideImageUrl && <button type="button" className="size-guide-link" onClick={() => setIsSizeGuideOpen(true)}>{t("sizeHelp")}</button>}</div><div className="product-size-list">{sizes.map((size) => { const sizeVariant = sizeVariants.find((variant) => optionKey(variant.size, "one size") === size.key); const inStock = Boolean(sizeVariant && sizeVariant.inventoryQuantity > 0); const sizeDiscount = sizeVariant?.discountScope === "size" ? sizeVariant.discountPercent : undefined; return <button key={size.key} type="button" disabled={!inStock} data-discount={sizeDiscount ? `−${sizeDiscount}%` : undefined} className={`product-size ${selectedSizeOption?.key === size.key ? "product-size--selected" : ""} ${sizeDiscount ? "product-size--discount" : ""} ${!inStock ? "product-size--disabled" : ""}`} onClick={() => setSelectedSize(size.key)}>{size.label}</button>; })}</div></div>}
    {!available && <p className="product-availability is-unavailable">Hozircha qolmagan</p>}
    <div className="product-actions"><AddToCartButton id={selectedVariant?.id ?? id} title={title} price={selectedVariant?.price || price} image={selectedImage} color={selectedColorLabel} size={selectedSizeOption?.label ?? "ONE SIZE"} isSale={Boolean(selectedVariant?.discountPercent)} /><button type="button" className={`product-favorite-btn${isFavorite(favoriteProduct) ? " is-liked" : ""}`} aria-label={t("favoriteAdd")} aria-pressed={isFavorite(favoriteProduct)} onClick={() => toggleFavorite(favoriteProduct)}><Image src={isFavorite(favoriteProduct) ? "/icons/heart-filled.svg" : "/icons/heart.svg"} alt="" width={28} height={28} /></button></div>
    {isSizeGuideOpen && sizeGuideImageUrl && <div className="size-guide-modal-backdrop" role="presentation" onMouseDown={() => setIsSizeGuideOpen(false)}><section className="size-guide-modal" role="dialog" aria-modal="true" aria-label={t("sizeHelp")} onMouseDown={(event) => event.stopPropagation()}><header><div><p>SIZE GUIDE</p><h2>{t("sizeHelp")}</h2></div><button type="button" onClick={() => setIsSizeGuideOpen(false)} aria-label="Yopish">×</button></header><img src={sizeGuideImageUrl} alt={t("sizeHelp")} /></section></div>}
  </>;
}

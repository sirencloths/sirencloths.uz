"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import { useLanguage } from "./LanguageProvider";
import { useFavorites } from "./FavoriteContext";

type Variant = { id: string; sku: string; color?: string | null; size?: string | null; price?: string | null; inventoryQuantity: number; isActive?: boolean; attributes?: Record<string, unknown> };
type Props = { id: string; title: string; price: string; image: string; variants: Variant[]; initialColor?: string; sizeGuideImageUrl?: string };

const swatch = (color: string) => ({ black: "#111", white: "#fff", gray: "#8b8b8b", blue: "#1769aa", green: "#0b7a3a", red: "#b91c1c", brown: "#704214", pink: "#db5b82", cream: "#f4ead2" }[color.toLowerCase()] ?? "#d8d8d4");

export default function ProductDetailClient({ id, title, price, image, variants, initialColor, sizeGuideImageUrl }: Props) {
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const searchParams = useSearchParams();
  const usableVariants = variants.filter((variant) => variant.isActive !== false);
  const colors = [...new Set(usableVariants.map((variant) => variant.color || "Default"))];
  const [selectedColor, setSelectedColor] = useState(() => colors.find((color) => color === initialColor) ?? colors[0] ?? "Default");
  useEffect(() => {
    const requested = searchParams.get("color")?.trim().toLocaleLowerCase("uz-UZ");
    if (!requested) return;
    const matchingColor = colors.find((color) => color.toLocaleLowerCase("uz-UZ").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") === requested);
    if (matchingColor) setSelectedColor(matchingColor);
  }, [searchParams, colors.join("|")]);
  const sizeVariants = useMemo(() => usableVariants.filter((variant) => (variant.color || "Default") === selectedColor), [usableVariants, selectedColor]);
  const sizes = [...new Set(sizeVariants.map((variant) => variant.size || "ONE SIZE"))];
  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? "ONE SIZE");
  useEffect(() => setSelectedSize(sizes[0] ?? "ONE SIZE"), [selectedColor]);
  const selectedVariant = sizeVariants.find((variant) => (variant.size || "ONE SIZE") === selectedSize) ?? usableVariants[0];
  const available = !selectedVariant || selectedVariant.inventoryQuantity > 0;
  const selectedColorImages = sizeVariants.flatMap((variant) => Array.isArray(variant.attributes?.images) ? variant.attributes.images.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []);
  const selectedImage = selectedColorImages[0] || image;
  const favoriteProduct = { id, title, price, image: selectedImage, alt: title, color: selectedColor.toUpperCase(), colorSlug: selectedColor.toLocaleLowerCase("uz-UZ").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "default" };
  const chooseColor = (color: string) => { setSelectedColor(color); window.dispatchEvent(new CustomEvent("siren-product-color-change", { detail: { productId: id, color } })); };

  return <>
    {colors.length > 0 && <div className="product-colors"><div className="product-colors-label"><span>{t("chooseColor")}</span><strong>{selectedColor}</strong></div><div className="product-color-list">{colors.map((color) => <button key={color} type="button" className={`product-color ${selectedColor === color ? "product-color--selected" : ""}`} style={{ backgroundColor: swatch(color) }} aria-label={color} onClick={() => chooseColor(color)} />)}</div></div>}
    {sizes.length > 0 && <div className="product-sizes"><div className="product-sizes-top"><div className="product-sizes-label"><span>{t("chooseSize")}</span><strong>{selectedSize}</strong></div>{sizeGuideImageUrl && <a className="size-guide-link" href={sizeGuideImageUrl} target="_blank" rel="noreferrer">{t("sizeHelp")}</a>}</div><div className="product-size-list">{sizes.map((size) => { const sizeVariant = sizeVariants.find((variant) => (variant.size || "ONE SIZE") === size); const inStock = Boolean(sizeVariant && sizeVariant.inventoryQuantity > 0); return <button key={size} type="button" disabled={!inStock} className={`product-size ${selectedSize === size ? "product-size--selected" : ""} ${!inStock ? "product-size--disabled" : ""}`} onClick={() => setSelectedSize(size)}>{size}</button>; })}</div></div>}
    <p className={`product-availability ${available ? "is-available" : "is-unavailable"}`}>{available ? "Mavjud" : "Hozircha qolmagan"}</p>
    <div className="product-actions"><AddToCartButton id={selectedVariant?.sku ?? id} title={title} price={selectedVariant?.price || price} image={selectedImage} color={selectedColor} size={selectedSize} /><button type="button" className={`product-favorite-btn${isFavorite(favoriteProduct) ? " is-liked" : ""}`} aria-label={t("favoriteAdd")} aria-pressed={isFavorite(favoriteProduct)} onClick={() => toggleFavorite(favoriteProduct)}><Image src={isFavorite(favoriteProduct) ? "/icons/heart-filled.svg" : "/icons/heart.svg"} alt="" width={28} height={28} /></button></div>
  </>;
}

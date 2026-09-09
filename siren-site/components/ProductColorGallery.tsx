"use client";

import { useEffect, useMemo, useState } from "react";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import ProductZoomImage from "@/components/ProductZoomImage";

type Props = { productId: string; initialColor: string; imagesByColor: Record<string, string[]>; fallbackImages: string[]; alt: string };
const colorKey = (color: string) => (color || "Default").trim().toLocaleLowerCase("uz-UZ");

export default function ProductColorGallery({ productId, initialColor, imagesByColor, fallbackImages, alt }: Props) {
  const [color, setColor] = useState(initialColor);
  useEffect(() => {
    setColor(initialColor);
    const onColorChange = (event: Event) => {
      const detail = (event as CustomEvent<{ productId?: string; color?: string }>).detail;
      if (detail?.productId === productId && detail.color) setColor(detail.color);
    };
    window.addEventListener("siren-product-color-change", onColorChange);
    return () => window.removeEventListener("siren-product-color-change", onColorChange);
  }, [initialColor, productId]);
  const images = useMemo(() => imagesByColor[colorKey(color)]?.length ? imagesByColor[colorKey(color)] : fallbackImages, [color, imagesByColor, fallbackImages]);
  const resolvedImages = images.length ? images : ["/images/p1.jpg"];
  return <>
    <ProductImageCarousel images={resolvedImages} alt={alt} />
    <div className="product-detail-images product-detail-images--desktop">
      {resolvedImages.map((src, index) => <div className="product-detail-image" key={`${colorKey(color)}-${src}-${index}`}><ProductZoomImage src={src} alt={index === 0 ? alt : "Mahsulot rasmi"} priority={index === 0} /></div>)}
    </div>
  </>;
}

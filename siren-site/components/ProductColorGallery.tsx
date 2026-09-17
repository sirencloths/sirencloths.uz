"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import ProductZoomImage from "@/components/ProductZoomImage";

type Props = { productId: string; initialColor: string; imagesByColor: Record<string, string[]>; fallbackImages: string[]; alt: string };
const colorKey = (color: string) => (color || "Default").trim().toLocaleLowerCase("uz-UZ");

export default function ProductColorGallery({ productId, initialColor, imagesByColor, fallbackImages, alt }: Props) {
  const [color, setColor] = useState(initialColor);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
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
  const updateScrollProgress = () => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const scrollableHeight = gallery.scrollHeight - gallery.clientHeight;
    setScrollProgress(scrollableHeight > 0 ? gallery.scrollTop / scrollableHeight : 0);
  };
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    gallery.scrollTop = 0;
    const frame = window.requestAnimationFrame(updateScrollProgress);
    return () => window.cancelAnimationFrame(frame);
  }, [color, resolvedImages.join("|")]);
  return <>
    <ProductImageCarousel images={resolvedImages} alt={alt} />
    <div className="product-detail-gallery-shell">
      <div className="product-detail-images product-detail-images--desktop" ref={galleryRef} onScroll={updateScrollProgress}>
        {resolvedImages.map((src, index) => <div className="product-detail-image" key={`${colorKey(color)}-${src}-${index}`}><ProductZoomImage src={src} alt={index === 0 ? alt : "Mahsulot rasmi"} priority={index === 0} /></div>)}
      </div>
      <div className="product-gallery-scroll" aria-hidden="true"><b style={{ height: `${scrollProgress * 100}%` }} /><i style={{ top: `${scrollProgress * 100}%` }} /></div>
    </div>
  </>;
}

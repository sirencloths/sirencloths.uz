"use client";

import Image from "next/image";
import { useEffect, useState, type PointerEvent } from "react";

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
};
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");

export default function ProductZoomImage({ src, alt, priority = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState("50% 50%");
  const normalizedSrc = src.startsWith("/uploads/") ? `${apiOrigin}${src}` : src;
  const isRemoteImage = (() => {
    try { const url = new URL(normalizedSrc); return url.protocol === "https:" || (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")); }
    catch { return false; }
  })();
  const imageSrc = normalizedSrc.startsWith("/images/") || isRemoteImage ? normalizedSrc : "/images/p1.jpg";

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const open = () => { setZoom(1); setOrigin("50% 50%"); setIsOpen(true); };
  const updateOrigin = (event: PointerEvent<HTMLImageElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setOrigin(`${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`);
  };

  return <>
    <button type="button" className="product-zoom-trigger" onClick={open} aria-label={`${alt}: yaqinlashtirib ko'rish`}>
      <Image src={imageSrc} alt={alt} width={1200} height={1500} priority={priority} unoptimized={isRemoteImage} sizes="(max-width: 760px) 100vw, 50vw" />
    </button>
    {isOpen && <div className="product-zoom-modal" role="dialog" aria-modal="true" aria-label={`${alt}: katta rasm`} onMouseDown={() => setIsOpen(false)}>
      <div className="product-zoom-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="product-zoom-controls">
          <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.5))} disabled={zoom <= 1} aria-label="Kichraytirish">−</button>
          <span>{zoom.toFixed(1)}×</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.5))} disabled={zoom >= 3} aria-label="Yaqinlashtirish">+</button>
          <button type="button" className="product-zoom-close" onClick={() => setIsOpen(false)}>YOPISH ×</button>
        </div>
        <div className="product-zoom-stage">
          <img src={imageSrc} alt={alt} draggable={false} onPointerMove={updateOrigin} style={{ transform: `scale(${zoom})`, transformOrigin: origin }} />
        </div>
      </div>
    </div>}
  </>;
}

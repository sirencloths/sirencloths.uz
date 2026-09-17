"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent, type TouchEvent } from "react";

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
  images?: string[];
  initialIndex?: number;
};
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");

export default function ProductZoomImage({ src, alt, priority = false, images, initialIndex = 0 }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState("50% 50%");
  const [activeImage, setActiveImage] = useState(initialIndex);
  const pinchDistance = useRef<number | null>(null);
  const swipeStart = useRef<number | null>(null);
  const normalizedSrc = src.startsWith("/uploads/") ? `${apiOrigin}${src}` : src;
  const isRemoteImage = (() => {
    try { const url = new URL(normalizedSrc); return url.protocol === "https:" || (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")); }
    catch { return false; }
  })();
  const imageSrc = normalizedSrc.startsWith("/images/") || isRemoteImage ? normalizedSrc : "/images/p1.jpg";
  const modalImages = (images?.length ? images : [src]).map((item) => item.startsWith("/uploads/") ? `${apiOrigin}${item}` : item);
  const activeSrc = modalImages[activeImage] || imageSrc;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const open = () => { setZoom(1); setOrigin("50% 50%"); setActiveImage(initialIndex); setIsOpen(true); };
  const updateOrigin = (event: PointerEvent<HTMLImageElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setOrigin(`${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`);
  };
  const distance = (event: TouchEvent<HTMLDivElement>) => Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) { pinchDistance.current = distance(event); swipeStart.current = null; }
    else if (event.touches.length === 1) swipeStart.current = event.touches[0].clientX;
  };
  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || pinchDistance.current === null) return;
    event.preventDefault();
    const nextDistance = distance(event);
    setZoom((value) => Math.max(1, Math.min(3, value * (nextDistance / pinchDistance.current!))));
    pinchDistance.current = nextDistance;
  };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (pinchDistance.current !== null) { pinchDistance.current = null; return; }
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null || zoom > 1 || modalImages.length < 2) return;
    const moved = event.changedTouches[0]?.clientX - start;
    if (Math.abs(moved) < 48) return;
    setActiveImage((value) => (value + (moved < 0 ? 1 : -1) + modalImages.length) % modalImages.length);
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
          <button type="button" className="product-zoom-close" onClick={() => setIsOpen(false)}>← BACK</button>
        </div>
        <div className="product-zoom-stage" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <img src={activeSrc} alt={alt} draggable={false} onPointerMove={updateOrigin} style={{ transform: `scale(${zoom})`, transformOrigin: origin }} />
        </div>
        {modalImages.length > 1 && <div className="product-zoom-pagination" aria-label="Rasm tanlash">{modalImages.map((_, index) => <button type="button" key={index} className={index === activeImage ? "is-active" : ""} onClick={() => { setActiveImage(index); setZoom(1); }} aria-label={`Rasm ${index + 1}`} />)}</div>}
      </div>
    </div>}
  </>;
}

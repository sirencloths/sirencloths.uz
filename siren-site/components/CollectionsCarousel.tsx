"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/data";
import ProductCard from "./ProductCard";

type Props = {
  products: Product[];
  initialOffset?: number;
};

export default function CollectionsCarousel({
  products,
  initialOffset = 0,
}: Props) {
  const [start, setStart] = useState(initialOffset % products.length);
  const [direction, setDirection] = useState<-1 | 1 | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(1);
  const [slideStep, setSlideStep] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const suppressClick = useRef(false);
  const productSignature = products.map((product) => product.cardId ?? product.id).join("|");
  const mobileProducts = useMemo(() => products.length > 1 ? [products[products.length - 1], ...products, products[0]] : products, [productSignature]);

  useEffect(() => { setMobileIndex(1); }, [productSignature]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!listRef.current) return;

    const updateStep = () => {
      const slide = listRef.current?.querySelector<HTMLElement>(".collections-page-product-slide");
      const track = listRef.current?.firstElementChild;
      if (!slide || !track) return;

      const gap = Number.parseFloat(window.getComputedStyle(track).gap) || 0;
      setSlideStep(slide.getBoundingClientRect().width + gap);
    };

    updateStep();
    const observer = new ResizeObserver(updateStep);
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [isMobile]);

  const move = (nextDirection: -1 | 1) => {
    if (direction !== null) return;

    setDirection(nextDirection);
  };

  const trackProducts = Array.from(
    { length: 5 },
    (_, index) =>
      products[(start + index - 1 + products.length) % products.length]
  );

  const finishSlide = () => {
    if (isMobile) return;
    if (direction === null) return;

    setStart((current) =>
      (current + direction + products.length) % products.length
    );
    setDirection(null);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    dragStartX.current = event.clientX;
    dragOffsetRef.current = 0;
    suppressClick.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile || dragStartX.current === null) return;
    const offset = event.clientX - dragStartX.current;
    if (Math.abs(offset) > 6) suppressClick.current = true;
    dragOffsetRef.current = offset;
    setDragOffset(offset);
  };

  const finishDrag = () => {
    if (!isMobile || dragStartX.current === null) return;
    const offset = dragOffsetRef.current;
    const threshold = Math.max(36, slideStep * 0.16);
    if (Math.abs(offset) > threshold) {
      setMobileIndex((current) => current + (offset < 0 ? 1 : -1));
    }
    dragStartX.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  };

  const visibleProducts = isMobile ? mobileProducts : trackProducts;
  const transform = isMobile
    ? `translateX(${-mobileIndex * slideStep + dragOffset}px)`
    : direction === 1
      ? "translateX(-40%)"
      : direction === -1
        ? "translateX(0)"
        : "translateX(-20%)";

  return (
    <div className="collections-page-products">
      <button
        type="button"
        className="collections-page-arrow collections-page-arrow-left"
        aria-label="Предыдущие товары"
        onClick={() => move(-1)}
      >
        <Image
          src="/icons/arrow-right.svg"
          alt=""
          width={5}
          height={10}
        />
      </button>

      <div
        ref={listRef}
        className={`collections-page-product-list${isDragging ? " is-dragging" : ""}`}
        aria-live="polite"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        <div
          className={`collections-page-product-track${
            direction === null && !isMobile ? "" : " is-animating"
          }`}
          style={{
            transform,
            transition: isMobile && isDragging ? "none" : undefined,
          }}
          onTransitionEnd={() => {
            if (!isMobile) { finishSlide(); return; }
            if (products.length < 2) return;
            if (mobileIndex === 0) setMobileIndex(products.length);
            if (mobileIndex === products.length + 1) setMobileIndex(1);
          }}
        >
          {visibleProducts.map((product, index) => (
            <div className="collections-page-product-slide" key={`${product.cardId ?? product.id}-${isMobile && (index === 0 || index === visibleProducts.length - 1) ? `loop-${index}` : index}`}>
              <ProductCard product={product} small />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="collections-page-arrow collections-page-arrow-right"
        aria-label="Следующие товары"
        onClick={() => move(1)}
      >
        <Image
          src="/icons/arrow-left.svg"
          alt=""
          width={5}
          height={10}
        />
      </button>
    </div>
  );
}

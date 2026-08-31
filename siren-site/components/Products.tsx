"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/data";
import ProductCard from "./ProductCard";

type Props = {
  products: Product[];
  id?: string;
  ariaLabel: string;
  more?: boolean;
  slider?: boolean;
  heading?: {
    title: string;
    linkLabel: string;
    href: string;
  };
};

export default function Products({
  products,
  id,
  ariaLabel,
  more = false,
  slider = false,
  heading,
}: Props) {
  const [current, setCurrent] = useState(products.length);
  const [transition, setTransition] = useState(true);
  const [slideStep, setSlideStep] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const suppressClick = useRef(false);

  const items = slider
    ? [...products, ...products, ...products]
    : products;

  const next = () => {
    if (!slider) return;

    setTransition(true);
    setCurrent((prev) => prev + 1);
  };

  const prev = () => {
    if (!slider) return;

    setTransition(true);
    setCurrent((prev) => prev - 1);
  };

  useEffect(() => {
    if (!slider) return;

    const timer = setInterval(() => {
      next();
    }, 10000);

    return () => clearInterval(timer);
  }, [slider]);

  useEffect(() => {
    if (!slider || !trackRef.current) return;

    const track = trackRef.current;
    const updateSlideStep = () => {
      const slide = track.querySelector<HTMLElement>(".products-slide");
      const gap = Number.parseFloat(window.getComputedStyle(track).gap) || 0;

      if (slide) {
        setSlideStep(slide.getBoundingClientRect().width + gap);
      }
    };

    updateSlideStep();
    const observer = new ResizeObserver(updateSlideStep);
    observer.observe(track);

    return () => observer.disconnect();
  }, [slider]);

  const handleTransitionEnd = () => {
    if (current >= products.length * 2) {
      setTransition(false);
      setCurrent(products.length);
    }

    if (current <= 0) {
      setTransition(false);
      setCurrent(products.length);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!slider) return;

    dragStartX.current = event.clientX;
    dragOffsetRef.current = 0;
    suppressClick.current = false;
    setTransition(false);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!slider || dragStartX.current === null) return;

    const offset = event.clientX - dragStartX.current;
    if (Math.abs(offset) > 6) suppressClick.current = true;
    dragOffsetRef.current = offset;
    setDragOffset(offset);
  };

  const finishDrag = () => {
    if (!slider || dragStartX.current === null) return;

    const offset = dragOffsetRef.current;
    const shouldChangeSlide = Math.abs(offset) > Math.max(36, slideStep * 0.16);
    if (shouldChangeSlide) {
      setCurrent((value) => value + (offset < 0 ? 1 : -1));
    }

    dragStartX.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
    setTransition(true);
  };

  return (
    <section
      className={`products${more ? " products--more" : ""}${
        slider ? " products--slider" : ""
      }`}
      id={id}
      aria-label={ariaLabel}
    >
      {slider && (
        <button
          className="slider-btn slider-btn--left"
          type="button"
          aria-label="Назад"
          onClick={prev}
        >
          <Image
            src="/icons/arrow-right.svg"
            alt=""
            width={6}
            height={12}
          />
        </button>
      )}

      {heading && (
        <div className="section-heading recommendation-heading">
          <h2
            style={{
              fontSize: "40px",
            }}
          >
            {heading.title}
          </h2>

          <a href={heading.href}>{heading.linkLabel}</a>
        </div>
      )}

      <div
        className={`products-slider${isDragging ? " is-dragging" : ""}`}
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
          ref={trackRef}
          className="products-track"
          style={{
            transform:
              slider && slideStep
                ? `translateX(${-current * slideStep + dragOffset}px)`
                : "none",
            transition: slider && transition
              ? "transform 450ms ease"
              : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {items.map((product, i) => (
            <div
              className="products-slide"
              key={`${product.image}-${i}`}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {slider && (
        <button
          className="slider-btn slider-btn--right"
          type="button"
          aria-label="Вперёд"
          onClick={next}
        >
          <Image
            src="/icons/arrow-left.svg"
            alt=""
            width={6}
            height={12}
          />
        </button>
      )}
    </section>
  );
}

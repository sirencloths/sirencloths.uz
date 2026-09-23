"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LookbookItem } from "@/lib/data";

export default function LookbookCarousel({
  items,
  initialIndex = 0,
}: {
  items: LookbookItem[];
  initialIndex?: number;
}) {
  const [current, setCurrent] = useState(initialIndex);
  const [motion, setMotion] = useState<-1 | 1>(1);
  const [zoom, setZoom] = useState(1);
  const startX = useRef<number | null>(null);
  const pinchDistance = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCurrent(Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0)));
  }, [initialIndex, items.length]);

  const show = (index: number, nextMotion: -1 | 1 = 1) => {
    setZoom(1);
    pinchDistance.current = null;
    setMotion(nextMotion);
    setCurrent((index + items.length) % items.length);
  };

  const previous = () => show(current - 1, -1);
  const next = () => show(current + 1, 1);

  const finishSwipe = (clientX: number) => {
    if (zoom > 1) return;
    if (startX.current === null) return;
    const offset = clientX - startX.current;
    startX.current = null;
    if (Math.abs(offset) < 36) return;
    offset < 0 ? next() : previous();
  };
  const distance = (touches: ArrayLike<{ clientX: number; clientY: number }>) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  if (!items.length) return null;
  const active = items[current];

  return (
    <section className="lookbook-carousel" aria-roledescription="carousel">
      <div className="lookbook-stage">
        <button className="lookbook-arrow lookbook-arrow--previous" type="button" onClick={previous} aria-label="Previous image">
          <Image src="/icons/arrow-right.svg" alt="" width={6} height={12} />
        </button>
        <div
          className="lookbook-frame"
          onPointerDown={(event) => {
            if (zoom > 1) return;
            startX.current = event.clientX;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => finishSwipe(event.clientX)}
          onPointerCancel={() => { startX.current = null; }}
          onTouchStart={(event) => {
            if (event.touches.length === 2) {
              pinchDistance.current = distance(event.touches);
              startX.current = null;
            }
          }}
          onTouchMove={(event) => {
            if (event.touches.length !== 2 || pinchDistance.current === null) return;
            event.preventDefault();
            const nextDistance = distance(event.touches);
            setZoom((value) => Math.max(1, Math.min(3, value * (nextDistance / pinchDistance.current!))));
            pinchDistance.current = nextDistance;
          }}
          onTouchEnd={() => { pinchDistance.current = null; }}
        >
          <img
            key={active.id}
            className={`lookbook-frame-image lookbook-frame-image--${motion === 1 ? "next" : "previous"}`}
            src={active.image}
            alt={active.alt}
            draggable={false}
            style={{ transform: `scale(${zoom})` }}
          />
          {zoom > 1 && <button type="button" className="lookbook-zoom-reset" onClick={() => setZoom(1)}>1×</button>}
        </div>
        <button className="lookbook-arrow lookbook-arrow--next" type="button" onClick={next} aria-label="Next image">
          <Image src="/icons/arrow-left.svg" alt="" width={6} height={12} />
        </button>
      </div>

      <div className="lookbook-dots" role="tablist" aria-label="Lookbook images">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={index === current ? "is-active" : ""}
            onClick={() => show(index, index >= current ? 1 : -1)}
            aria-label={`Image ${index + 1}`}
            aria-selected={index === current}
            role="tab"
          />
        ))}
      </div>

      <div className="lookbook-back-bar">
        <button
          type="button"
          className="lookbook-back"
          onClick={() => window.history.length > 1 ? router.back() : router.push("/")}
        >
          Назад
        </button>
      </div>
    </section>
  );
}

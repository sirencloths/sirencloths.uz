"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Props = {
  image: string;
  alt: string;
};

export default function ProductImageCarousel({ image, alt }: Props) {
  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  const finishDrag = () => {
    if (startX.current === null) return;
    if (Math.abs(dragOffsetRef.current) > 42) setActive((current) => dragOffsetRef.current < 0 ? Math.min(current + 1, 1) : Math.max(current - 1, 0));
    startX.current = null;
    dragOffsetRef.current = 0;
    setDragging(false);
    setDragOffset(0);
  };

  return (
    <section className="product-mobile-carousel" aria-roledescription="carousel" aria-label="Фотографии товара">
      <div
        className="product-mobile-carousel-viewport"
        onPointerDown={(event) => { startX.current = event.clientX; dragOffsetRef.current = 0; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (startX.current !== null) { const offset = event.clientX - startX.current; dragOffsetRef.current = offset; setDragOffset(offset); } }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div className="product-mobile-carousel-track" style={{ transform: `translateX(calc(${-active * 100}% + ${dragOffset}px))`, transition: dragging ? "none" : "transform 360ms cubic-bezier(.22,.61,.36,1)" }}>
          {[0, 1].map((frame) => (
            <div className="product-mobile-carousel-slide" key={frame} aria-hidden={active !== frame}>
              <Image src={image} alt={frame === active ? alt : ""} width={865} height={865} priority={frame === 0} />
            </div>
          ))}
        </div>
      </div>
      <div className="product-mobile-pagination" role="tablist" aria-label="Выбор фотографии">
        {[0, 1].map((frame) => <button key={frame} type="button" aria-label={`Фото ${frame + 1}`} aria-selected={active === frame} className={active === frame ? "is-active" : ""} onClick={() => setActive(frame)} />)}
      </div>
    </section>
  );
}

"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = { title: string; cover: string; images: string[] };

export default function BlogGallery({ title, cover, images }: Props) {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;
  const change = (direction: -1 | 1) => setCurrent((value) => (value + direction + count) % count);

  useEffect(() => {
    if (count < 2 || open) return;
    const timer = window.setInterval(() => change(1), 6000);
    return () => window.clearInterval(timer);
  }, [count, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return <div className="blog-page-gallery">
    <img className="blog-page-cover" src={cover} alt={title} />
    {count > 0 && <section className="blog-gallery-slider" aria-label={`${title} galereyasi`}>
      <button type="button" className="blog-gallery-slider__image" onClick={() => setOpen(true)} aria-label="Rasmni kattalashtirish"><img src={images[current]} alt={`${title} — ${current + 1}`} /></button>
      {count > 1 && <><button type="button" className="blog-gallery-slider__arrow blog-gallery-slider__arrow--prev" onClick={() => change(-1)} aria-label="Oldingi rasm"><ChevronLeft size={21} /></button><button type="button" className="blog-gallery-slider__arrow blog-gallery-slider__arrow--next" onClick={() => change(1)} aria-label="Keyingi rasm"><ChevronRight size={21} /></button><div className="blog-gallery-slider__dots" aria-label="Slaydlar">{images.map((image, index) => <button key={`${image}-${index}`} type="button" className={index === current ? "is-active" : ""} onClick={() => setCurrent(index)} aria-label={`${index + 1}-rasm`} />)}</div></>}
    </section>}
    {open && <div className="blog-lightbox" role="presentation" onMouseDown={() => setOpen(false)}><section className="blog-lightbox__frame" role="dialog" aria-modal="true" aria-label={`${title} rasm galereyasi`} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="blog-lightbox__close" onClick={() => setOpen(false)} aria-label="Yopish"><X size={23} /></button>{count > 1 && <button type="button" className="blog-lightbox__arrow blog-lightbox__arrow--prev" onClick={() => change(-1)} aria-label="Oldingi rasm"><ChevronLeft size={30} /></button>}<img src={images[current]} alt={`${title} — ${current + 1}`} />{count > 1 && <button type="button" className="blog-lightbox__arrow blog-lightbox__arrow--next" onClick={() => change(1)} aria-label="Keyingi rasm"><ChevronRight size={30} /></button>}<span>{current + 1} / {count}</span></section></div>}
  </div>;
}

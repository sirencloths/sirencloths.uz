"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

type Props = { postId: string; title: string; cover: string; images: string[] };

/** Gallery previews stay in the article; each selected image has a real URL. */
export default function BlogGallery({ postId, title, cover, images }: Props) {
  const [current, setCurrent] = useState(0);
  const [motion, setMotion] = useState<-1 | 1>(1);
  const count = images.length;
  const visibleImages = Array.from({ length: Math.min(3, count) }, (_, offset) => ({ image: images[(current + offset) % count], index: (current + offset) % count }));
  const change = (direction: -1 | 1) => { setMotion(direction); setCurrent((value) => (value + direction + count) % count); };

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setInterval(() => change(1), 13_000);
    return () => window.clearInterval(timer);
  }, [count]);

  return <div className="blog-page-gallery">
    <img className="blog-page-cover" src={cover} alt={title} />
    {count > 0 && <section className="blog-gallery-slider" aria-label={`${title} galereyasi`}>
      <div key={current} className={`blog-gallery-slider__items ${motion === 1 ? "is-next" : "is-prev"}`}>{visibleImages.map(({ image, index }) => <Link className="blog-gallery-slider__image" key={`${image}-${index}`} href={`/blog/${postId}/${index}`} aria-label={`${index + 1}-rasmni alohida sahifada ochish`}><img src={image} alt={`${title} — ${index + 1}`} /></Link>)}</div>
      {count > 1 && <><button type="button" className="blog-gallery-slider__arrow blog-gallery-slider__arrow--prev" onClick={() => change(-1)} aria-label="Oldingi preview"><ChevronLeft size={21} /></button><button type="button" className="blog-gallery-slider__arrow blog-gallery-slider__arrow--next" onClick={() => change(1)} aria-label="Keyingi preview"><ChevronRight size={21} /></button><div className="blog-gallery-slider__dots" aria-label="Slaydlar">{images.map((image, index) => <button key={`${image}-${index}`} type="button" className={index === current ? "is-active" : ""} onClick={() => { setMotion(index >= current ? 1 : -1); setCurrent(index); }} aria-label={`${index + 1}-rasm`} />)}</div></>}
    </section>}
  </div>;
}

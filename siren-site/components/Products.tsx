"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/data";
import { getStorefrontProducts, toStorefrontColorCards } from "@/lib/api";
import ProductCard from "./ProductCard";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

type Props = { products: Product[]; id?: string; ariaLabel: string; more?: boolean; slider?: boolean; heading?: { title: string; linkLabel: string; href: string } };
const AUTO_ADVANCE_MS = 9000;
const RESUME_DELAY_MS = 3000;

export default function Products({ products, id, ariaLabel, more = false, slider = false, heading }: Props) {
  const [remoteProducts, setRemoteProducts] = useState<Product[] | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [isMobile, setIsMobile] = useState(false);
  const resumeAt = useRef(0);

  const displayProducts = remoteProducts?.length ? remoteProducts : products;
  // Do not show a partly empty "infinite" rail when there are fewer cards
  // than the desktop viewport can sensibly display.
  const activeSlider = slider && displayProducts.length > 1;

  useEffect(() => {
    let mounted = true;
    void getStorefrontProducts().then((apiProducts) => {
      if (mounted && apiProducts.length) setRemoteProducts(toStorefrontColorCards(apiProducts));
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const syncViewport = () => setIsMobile(query.matches);
    syncViewport();
    query.addEventListener("change", syncViewport);
    return () => query.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!api || !activeSlider) return;
    const timer = window.setInterval(() => {
      if (Date.now() >= resumeAt.current) api.scrollNext();
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [api, activeSlider]);

  return <section className={`products${more ? " products--more" : ""}${activeSlider ? " products--slider" : ""}${slider && !activeSlider ? " products--short" : ""}`} id={id} aria-label={ariaLabel}>
    {activeSlider && <button className="slider-btn slider-btn--left" type="button" aria-label="Назад" onClick={() => api?.scrollPrev()}><Image src="/icons/arrow-right.svg" alt="" width={6} height={12} /></button>}
    {heading && <div className="section-heading recommendation-heading"><h2 style={{ fontSize: "40px" }}>{heading.title}</h2><a href={heading.href}>{heading.linkLabel}</a></div>}
    {activeSlider ? <Carousel className="products-slider" opts={{ loop: true, align: isMobile ? "center" : "start", duration: 28 }} setApi={setApi} onPointerDown={() => { resumeAt.current = Date.now() + RESUME_DELAY_MS; }}>
      <CarouselContent className="products-track">
        {displayProducts.map((product) => <CarouselItem className="products-slide" key={product.cardId ?? product.id}><ProductCard product={product} /></CarouselItem>)}
      </CarouselContent>
    </Carousel> : <div className="products-slider"><div className="products-track">{displayProducts.map((product) => <div className="products-slide" key={product.cardId ?? product.id}><ProductCard product={product} /></div>)}</div></div>}
    {activeSlider && <button className="slider-btn slider-btn--right" type="button" aria-label="Вперёд" onClick={() => api?.scrollNext()}><Image src="/icons/arrow-left.svg" alt="" width={6} height={12} /></button>}
  </section>;
}

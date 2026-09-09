"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import type { ApiBanner } from "@/lib/api";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const assetUrl = (url: string) => (url.startsWith("http") || url.startsWith("/") && !url.startsWith("/uploads/") ? url : `${apiOrigin}${url}`);
const AUTO_ADVANCE_MS = 6000;
const RESUME_DELAY_MS = 3000;

export default function Hero({ banners = [] }: { banners?: ApiBanner[] }) {
  const { t } = useLanguage();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const resumeAt = useRef(0);
  const bannerSignature = banners.map((banner) => banner.id).join("|");
  const activeBanner = banners[current];

  useEffect(() => {
    if (!api || banners.length < 2) return;
    const updateCurrent = () => setCurrent(api.selectedScrollSnap());
    updateCurrent();
    api.on("select", updateCurrent);
    const timer = window.setInterval(() => {
      if (Date.now() >= resumeAt.current) api.scrollNext();
    }, AUTO_ADVANCE_MS);
    return () => { window.clearInterval(timer); api.off("select", updateCurrent); };
  }, [api, banners.length]);
  useEffect(() => { api?.reInit(); setCurrent(0); }, [api, bannerSignature]);
  const move = (direction: -1 | 1) => {
    resumeAt.current = Date.now() + RESUME_DELAY_MS;
    if (direction === 1) api?.scrollNext(); else api?.scrollPrev();
  };

  return <section className="hero" id="home">
    {banners.length > 0 && <Carousel className="hero-viewport" opts={{ loop: banners.length > 1, align: "start", duration: 28 }} setApi={setApi} onPointerDown={() => { resumeAt.current = Date.now() + RESUME_DELAY_MS; }}>
      <CarouselContent className="hero-slides">
        {banners.map((banner) => { const desktopImage = assetUrl(banner.imageUrl); const mobileImage = banner.mobileImageUrl ? assetUrl(banner.mobileImageUrl) : desktopImage; return <CarouselItem className="hero-slide" key={banner.id}><picture><source media="(max-width: 760px)" srcSet={mobileImage} /><img className="hero-media" src={desktopImage} alt="" draggable={false} /></picture></CarouselItem>; })}
      </CarouselContent>
    </Carousel>}
    {activeBanner?.textShadow !== false && <div className="hero-shade" aria-hidden="true" />}
    <div className="hero-content"><h1>{activeBanner?.title || t("newCollection")}</h1><a href={activeBanner?.targetUrl || "#collections"}>{activeBanner?.linkLabel || t("go")}</a></div>
    {banners.length > 1 && <div className="hero-controls"><button type="button" aria-label="Предыдущий баннер" onClick={() => move(-1)}>←</button><button type="button" aria-label="Следующий баннер" onClick={() => move(1)}>→</button></div>}
  </section>;
}

"use client";

import { useEffect, useState } from "react";
import ProductZoomImage from "@/components/ProductZoomImage";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

type Props = { images: string[]; alt: string };

export default function ProductImageCarousel({ images, alt }: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [active, setActive] = useState(0);
  const imageSignature = images.join("|");

  useEffect(() => {
    if (!api) return;
    const updateActive = () => setActive(api.selectedScrollSnap());
    api.reInit();
    api.scrollTo(0, true);
    updateActive();
    api.on("select", updateActive);
    return () => { api.off("select", updateActive); };
  }, [api, imageSignature]);

  return (
    <Carousel className="product-mobile-carousel" opts={{ loop: images.length > 1, align: "start", duration: 24 }} setApi={setApi}>
      <CarouselContent className="product-mobile-carousel-track">
        {images.map((image, frame) => (
          <CarouselItem className="product-mobile-carousel-slide" key={`${image}-${frame}`} aria-hidden={active !== frame}>
            <ProductZoomImage src={image} alt={frame === active ? alt : "Mahsulot rasmi"} priority={frame === 0} />
          </CarouselItem>
        ))}
      </CarouselContent>
      {images.length > 1 && <div className="product-mobile-pagination" role="tablist" aria-label="Выбор фотографии">
        {images.map((_, frame) => (
          <button key={frame} type="button" aria-label={`Фото ${frame + 1}`} aria-selected={active === frame} className={active === frame ? "is-active" : ""} onClick={() => api?.scrollTo(frame)} />
        ))}
      </div>}
    </Carousel>
  );
}

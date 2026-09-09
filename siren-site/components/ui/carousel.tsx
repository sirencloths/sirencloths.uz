"use client";

import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";

export type CarouselApi = UseEmblaCarouselType[1];

type CarouselContextValue = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: CarouselApi;
  scrollPrev: () => void;
  scrollNext: () => void;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

export function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error("useCarousel must be used inside Carousel");
  return context;
}

type CarouselProps = React.HTMLAttributes<HTMLDivElement> & {
  opts?: EmblaOptionsType;
  setApi?: (api: CarouselApi) => void;
};

export const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(function Carousel(
  { className = "", children, opts, setApi, ...props },
  ref,
) {
  const [carouselRef, api] = useEmblaCarousel({ axis: "x", ...opts });
  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);

  React.useEffect(() => {
    if (api) setApi?.(api);
  }, [api, setApi]);

  return (
    <CarouselContext.Provider value={{ carouselRef, api, scrollPrev, scrollNext }}>
      <div ref={ref} className={`shadcn-carousel ${className}`} role="region" aria-roledescription="carousel" {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
});

export const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CarouselContent(
  { className = "", children, ...props },
  ref,
) {
  const { carouselRef } = useCarousel();
  return (
    <div ref={carouselRef} className="shadcn-carousel-viewport">
      <div ref={ref} className={`shadcn-carousel-content ${className}`} {...props}>{children}</div>
    </div>
  );
});

export const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CarouselItem(
  { className = "", ...props },
  ref,
) {
  return <div ref={ref} role="group" aria-roledescription="slide" className={`shadcn-carousel-item ${className}`} {...props} />;
});


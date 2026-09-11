"use client";

import { useLayoutEffect, useState, type CSSProperties } from "react";
import FixedTop from "@/components/FixedTop";
import { SearchContents } from "@/components/SearchProvider";

export default function SearchPage() {
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);

  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".fixed-top .nav");
    if (!header) return;
    const updatePosition = () => setHeaderBottom(Math.round(header.getBoundingClientRect().bottom));
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(header);
    window.addEventListener("resize", updatePosition);
    return () => { observer.disconnect(); window.removeEventListener("resize", updatePosition); };
  }, []);

  return (
    <>
      <FixedTop />
      <main className="search-page" style={headerBottom === null ? undefined : { "--search-page-header-bottom": `${headerBottom}px` } as CSSProperties}>
        <div className="search-page-content">
          <SearchContents />
        </div>
      </main>
    </>
  );
}

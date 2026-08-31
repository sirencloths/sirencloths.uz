"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { blogArticles } from "@/lib/data";

export default function BlogImageViewerPage() {
  const { id, image } = useParams<{ id: string; image: string }>();
  const router = useRouter();
  const article = blogArticles.find((item) => item.id === id) ?? blogArticles[0];
  const images = [article.cover, ...article.gallery];
  const [current, setCurrent] = useState(Math.min(Math.max(Number(image) || 0, 0), images.length - 1));
  const startX = useRef<number | null>(null);

  const change = (nextIndex: number) => {
    const resolved = (nextIndex + images.length) % images.length;
    setCurrent(resolved);
    router.replace(`/blog/${article.id}/${resolved}`, { scroll: false });
  };

  const finishSwipe = (clientX: number) => {
    if (startX.current === null) return;
    const distance = clientX - startX.current;
    startX.current = null;
    if (Math.abs(distance) > 36) change(current + (distance < 0 ? 1 : -1));
  };

  return (
    <>
      <FixedTop />
      <main className="blog-viewer-page">
        <section className="blog-viewer-layout">
          <div className="blog-viewer-stage">
            <button type="button" className="blog-viewer-arrow" onClick={() => change(current - 1)} aria-label="Previous image">
              <Image src="/icons/arrow-right.svg" alt="" width={6} height={12} />
            </button>
            <div
              className="blog-viewer-frame"
              onPointerDown={(event) => { startX.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }}
              onPointerUp={(event) => finishSwipe(event.clientX)}
              onPointerCancel={() => { startX.current = null; }}
            >
              <Image key={images[current]} src={images[current]} alt={`${article.title} ${current + 1}`} width={760} height={760} priority />
            </div>
            <button type="button" className="blog-viewer-arrow" onClick={() => change(current + 1)} aria-label="Next image">
              <Image src="/icons/arrow-left.svg" alt="" width={6} height={12} />
            </button>
          </div>

          <div className="blog-viewer-copy">
            <time>{article.date}</time>
            <h1>{article.title}</h1>
            <p>{article.body}</p>
            <div className="blog-viewer-thumbnails">
              {images.map((item, index) => (
                <button type="button" key={item} className={current === index ? "is-active" : ""} onClick={() => change(index)}>
                  <Image src={item} alt="" width={110} height={74} />
                </button>
              ))}
            </div>
            <button type="button" className="blog-viewer-back" onClick={() => router.push("/blog")}>Назад</button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

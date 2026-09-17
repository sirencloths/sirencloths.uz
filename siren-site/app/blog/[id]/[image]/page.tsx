"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Footer from "@/components/Footer";
import { blogArticles } from "@/lib/data";
import { getStorefrontPosts, type ApiBlogPost } from "@/lib/api";

type ViewerPost = { id: string; title: string; body: string; date: string; images: string[] };
const asset = (url?: string | null) => !url ? "/images/banner.jpg" : url.startsWith("http") ? url : `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "")}${url}`;
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value)) : "";

function legacyPost(id: string): ViewerPost {
  const article = blogArticles.find((item) => item.id === id) ?? blogArticles[0];
  return { id: article.id, title: article.title, body: article.body, date: article.date, images: article.gallery.length ? article.gallery : [article.cover] };
}
function apiPost(post: ApiBlogPost): ViewerPost {
  const gallery = Array.isArray(post.seo?.galleryImageUrls) ? post.seo.galleryImageUrls.filter((image): image is string => typeof image === "string" && Boolean(image)) : [];
  return { id: post.slug || post.id, title: post.title, body: post.body || post.excerpt, date: formatDate(post.publishedAt), images: (gallery.length ? gallery : [post.coverImageUrl]).map(asset) };
}

export default function BlogImageViewerPage() {
  const { id, image } = useParams<{ id: string; image: string }>();
  const router = useRouter();
  const [post, setPost] = useState<ViewerPost | null>(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    setPost(null);
    void getStorefrontPosts().then((posts) => {
      const found = posts.find((item) => item.slug === id || item.id === id);
      if (active) setPost(found ? apiPost(found) : legacyPost(id));
    }).catch(() => { if (active) setPost(legacyPost(id)); });
    return () => { active = false; };
  }, [id]);

  if (!post) return <><main className="blog-viewer-page"><div className="blog-viewer-loading" aria-busy="true">GALEREYA YUKLANMOQDA…</div></main><Footer /></>;

  const activePost = post;
  const count = activePost.images.length;
  const routeIndex = Math.min(Math.max(Number(image) || 0, 0), Math.max(count - 1, 0));

  const change = (nextIndex: number) => {
    if (!count) return;
    const resolved = (nextIndex + count) % count;
    router.push(`/blog/${activePost.id}/${resolved}`, { scroll: false });
  };
  const finishSwipe = (clientX: number) => {
    if (startX.current === null) return;
    const distance = clientX - startX.current;
    startX.current = null;
    if (Math.abs(distance) > 36) change(routeIndex + (distance < 0 ? 1 : -1));
  };

  return <><main className="blog-viewer-page">
    <header className="blog-viewer-toolbar"><button type="button" onClick={() => router.back()}>← BLOGGA QAYTISH</button><div><span>GALEREYA</span><b>{routeIndex + 1} / {count}</b></div></header>
    <article className="blog-viewer-layout">
      <div className="blog-viewer-frame" onPointerDown={(event) => { startX.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => finishSwipe(event.clientX)} onPointerCancel={() => { startX.current = null; }}>
        <img key={activePost.images[routeIndex]} src={activePost.images[routeIndex]} alt={`${activePost.title} ${routeIndex + 1}`} />
      </div>
      <aside className="blog-viewer-copy"><time>{activePost.date}</time><h1>{activePost.title}</h1><p>{activePost.body}</p><div className="blog-viewer-thumbnails">{activePost.images.map((item, index) => <button type="button" key={`${item}-${index}`} className={routeIndex === index ? "is-active" : ""} onClick={() => change(index)}><img src={item} alt={`${index + 1}-rasm`} /></button>)}</div></aside>
    </article>
    {count > 1 && <nav className="blog-viewer-pagination" aria-label="Galereya navigatsiyasi"><button type="button" onClick={() => change(routeIndex - 1)}><ChevronLeft size={18} /> OLDINGI</button><span>{routeIndex + 1} / {count}</span><button type="button" onClick={() => change(routeIndex + 1)}>KEYINGI <ChevronRight size={18} /></button></nav>}
  </main><Footer /></>;
}

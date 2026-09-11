"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStorefrontPosts, type ApiBlogPost } from "@/lib/api";
import { useLanguage } from "./LanguageProvider";

const imageSource = (url?: string | null) => !url ? "/images/banner.jpg" : url.startsWith("http") ? url : `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "")}${url}`;
const displayDate = (value?: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "";

export default function Blog() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<ApiBlogPost[] | null>(null);

  useEffect(() => {
    void getStorefrontPosts().then(setPosts).catch(() => setPosts([]));
  }, []);

  const published = posts?.slice(0, 2) ?? [];

  if (published.length) {
    return (
      <section className="blog" id="blog">
        <div className="section-heading blog-heading"><h2>{t("blog")}</h2><Link href="/blog">{t("go")}</Link></div>
        <div className="blog-grid">
          {published.map((post, index) => (
            <Link className="blog-card blog-card--article" href="/blog" key={post.id}>
              <img src={imageSource(post.coverImageUrl)} alt={post.title} />
              <div className="blog-copy"><time>{displayDate(post.publishedAt)}</time><h3>{post.title}</h3><p>{post.excerpt || post.body}</p><span>{typeof post.seo?.textLinkLabel === "string" && post.seo.textLinkLabel || t("readMore")}</span></div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="blog" id="blog">
      <div className="section-heading blog-heading">
        <h2>{t("blog")}</h2>
        <a href="#">{t("go")}</a>
      </div>

      <div className="blog-grid">
        <a className="blog-card blog-card--image blog-card--hero" href="#">
          <Image
            src="/images/banner.jpg"
            alt="Нам нужно больше скейтеров"
            width={1920}
            height={920}
          />
          <div className="blog-copy blog-copy--mobile">
            <time dateTime="2025-12-22">{t("articleDate")}</time>
            <h3>{t("articleTitle")}</h3>
            <p>{t("articleBody")}</p>
            <span>{t("readMore")}</span>
          </div>
        </a>

        <a className="blog-card blog-card--article" href="#">
          <Image
            src="/images/collection-banner.jpg"
            alt="Образы сезона"
            width={1336}
            height={900}
          />
          <div className="blog-copy">
            <time dateTime="2025-12-22">{t("articleDate")}</time>
            <h3>{t("articleTitle")}</h3>
            <p>{t("articleBody")}</p>
            <span>{t("readMore")}</span>
          </div>
        </a>

        <a className="blog-card blog-card--article" href="#">
          <Image
            src="/images/small-banner.jpg"
            alt="Детали и аксессуары"
            width={840}
            height={614}
          />
          <div className="blog-copy">
            <time dateTime="2025-12-22">{t("articleDate")}</time>
            <h3>{t("articleTitle")}</h3>
            <p>{t("articleBody")}</p>
            <span>{t("readMore")}</span>
          </div>
        </a>

        <a className="blog-card blog-card--image blog-card--portrait" href="#">
          <Image
            src="/images/large-banner.jpg"
            alt="SIREN blog"
            width={840}
            height={900}
          />
        </a>
      </div>
    </section>
  );
}

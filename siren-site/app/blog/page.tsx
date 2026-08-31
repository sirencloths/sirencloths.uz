"use client";

import Image from "next/image";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { blogArticles } from "@/lib/data";
import { useLanguage } from "@/components/LanguageProvider";

export default function BlogPage() {
  const { t } = useLanguage();

  return (
    <>
      <FixedTop />
      <main className="blog-page">
        <div className="blog-page-heading">
          <h1>{t("blog")}</h1>
          <div className="blog-page-breadcrumb">
            <a href="/">{t("home")}</a><span>&gt;</span><span>{t("blog")}</span>
          </div>
        </div>

        <div className="blog-page-list">
          {blogArticles.map((article, index) => (
            <article className={`blog-page-article${index % 2 ? " blog-page-article--reverse" : ""}`} key={article.id}>
              <BlogGallery article={article} />
              <div className="blog-page-copy">
                <time>{t("articleDate")}</time>
                <h2>{t("articleTitle")}</h2>
                <p>{t("articleBody")}</p>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

function BlogGallery({ article }: { article: (typeof blogArticles)[number] }) {
  return (
    <div className="blog-page-gallery">
      <a href={`/blog/${article.id}/0`}>
        <Image className="blog-page-cover" src={article.cover} alt={article.title} width={620} height={330} />
      </a>
      <div className="blog-page-thumbnails">
        {article.gallery.map((image, index) => (
          <a href={`/blog/${article.id}/${index + 1}`} key={`${article.id}-${image}`}>
            <Image src={image} alt={`${article.title} ${index + 1}`} width={200} height={130} />
          </a>
        ))}
      </div>
    </div>
  );
}

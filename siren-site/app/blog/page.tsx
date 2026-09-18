import Footer from "@/components/Footer";
import BlogGallery from "@/components/BlogGallery";
import { blogArticles } from "@/lib/data";
import { getStorefrontPosts, type ApiBlogPost } from "@/lib/api";
import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Journal", description: "Stories, culture and new streetwear drops from SIREN in Tashkent.", path: "/blog" });

const asset = (url?: string | null) => !url ? "/images/banner.jpg" : url.startsWith("http") ? url : `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "")}${url}`;
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value)) : "";

export default async function BlogPage() {
  const savedPosts = await getStorefrontPosts().catch(() => []);
  const posts: ApiBlogPost[] = savedPosts.length ? savedPosts : blogArticles.map((article) => ({ id: article.id, slug: article.id, title: article.title, excerpt: article.body, body: article.body, coverImageUrl: article.cover, publishedAt: null, seo: { galleryImageUrls: article.gallery } }));

  return (
    <>
      <main className="blog-page">
        <div className="blog-page-heading">
          <h1>БЛОГ</h1>
          <div className="blog-page-breadcrumb">
            <Link href="/">ГЛАВНАЯ</Link><span>&gt;</span><span>БЛОГ</span>
          </div>
        </div>

        <div className="blog-page-list">
          {posts.map((article, index) => {
            const gallery = Array.isArray(article.seo?.galleryImageUrls) ? article.seo.galleryImageUrls.filter((image): image is string => typeof image === "string" && Boolean(image)) : [];
            return <article className={`blog-page-article${index % 2 ? " blog-page-article--reverse" : ""}`} key={article.id}>
              <BlogGallery postId={article.slug || article.id} title={article.title} cover={asset(article.coverImageUrl)} images={gallery.map(asset)} />
              <div className="blog-page-copy">
                <time>{date(article.publishedAt)}</time>
                <h2>{article.title}</h2>
                <p>{article.body || article.excerpt}</p>
              </div>
            </article>
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}

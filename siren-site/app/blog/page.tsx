import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { blogArticles } from "@/lib/data";
import { getStorefrontPosts } from "@/lib/api";

const asset = (url?: string | null) => !url ? "/images/banner.jpg" : url.startsWith("http") ? url : `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "")}${url}`;
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value)) : "";

export default async function BlogPage() {
  const savedPosts = await getStorefrontPosts().catch(() => []);
  const posts = savedPosts.length ? savedPosts : blogArticles.map((article) => ({ id: article.id, title: article.title, excerpt: article.body, body: article.body, coverImageUrl: article.cover, publishedAt: null }));

  return (
    <>
      <FixedTop />
      <main className="blog-page">
        <div className="blog-page-heading">
          <h1>БЛОГ</h1>
          <div className="blog-page-breadcrumb">
            <a href="/">ГЛАВНАЯ</a><span>&gt;</span><span>БЛОГ</span>
          </div>
        </div>

        <div className="blog-page-list">
          {posts.map((article, index) => (
            <article className={`blog-page-article${index % 2 ? " blog-page-article--reverse" : ""}`} key={article.id}>
              <div className="blog-page-gallery"><img className="blog-page-cover" src={asset(article.coverImageUrl)} alt={article.title} /></div>
              <div className="blog-page-copy">
                <time>{date(article.publishedAt)}</time>
                <h2>{article.title}</h2>
                <p>{article.body || article.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

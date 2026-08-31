"use client";

import Image from "next/image";
import { useLanguage } from "./LanguageProvider";

export default function Blog() {
  const { t } = useLanguage();

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

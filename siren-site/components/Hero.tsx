"use client";

import { useLanguage } from "./LanguageProvider";

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section className="hero" id="home">
      <div className="hero-content">
        <h1>
          {t("newCollection")}
        </h1>
        <a href="#collections">{t("go")}</a>
      </div>
    </section>
  );
}

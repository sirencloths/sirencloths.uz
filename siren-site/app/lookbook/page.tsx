"use client";

import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { lookbookItems } from "@/lib/data";
import { useLanguage } from "@/components/LanguageProvider";

export default function LookbookPage() {
  const { t } = useLanguage();

  return (
    <>
      <FixedTop />
      <main className="lookbook-page">
        <div className="lookbook-heading">
          <h1>{t("lookbook")}</h1>
          <div className="lookbook-breadcrumb">
            <a href="/">{t("home")}</a>
            <span>&gt;</span>
            <span>{t("lookbook")}</span>
          </div>
        </div>

        <section className="lookbook-grid" aria-label={t("lookbook")}>
          {lookbookItems.map((item) => (
            <a className="lookbook-card" href={`/lookbook/${item.id}`} key={item.id}>
              <Image src={item.image} alt={item.alt} width={640} height={640} />
            </a>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
import Image from "next/image";

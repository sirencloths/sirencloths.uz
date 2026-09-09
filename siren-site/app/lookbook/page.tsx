"use client";

import Image from "next/image";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { lookbookItems } from "@/lib/data";
import { getStorefrontLookbook, type ApiLookbookEntry } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";

const imageSource = (url: string) => url.startsWith("http") ? url : `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "")}${url}`;

export default function LookbookPage() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<ApiLookbookEntry[] | null>(null);
  useEffect(() => { void getStorefrontLookbook().then(setEntries).catch(() => setEntries([])); }, []);
  const items = entries?.length ? entries : lookbookItems;

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
          {items.map((item) => (
            <a className="lookbook-card" href={`/lookbook/${item.id}`} key={item.id}>
              {"imageUrl" in item ? <img src={imageSource(item.imageUrl)} alt={item.title} /> : <Image src={item.image} alt={item.alt} width={640} height={640} />}
            </a>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}

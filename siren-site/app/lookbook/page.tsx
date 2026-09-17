"use client";

import Footer from "@/components/Footer";
import { getStorefrontLookbook, type ApiLookbookEntry } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";
import Link from "next/link";

const imageSource = (url: string) => url.startsWith("http") ? url : `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "")}${url}`;

export default function LookbookPage() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<ApiLookbookEntry[]>([]);
  useEffect(() => { void getStorefrontLookbook().then(setEntries).catch(() => setEntries([])); }, []);

  return (
    <>
      <main className="lookbook-page">
        <div className="lookbook-heading">
          <h1>{t("lookbook")}</h1>
          <div className="lookbook-breadcrumb">
            <Link href="/">{t("home")}</Link>
            <span>&gt;</span>
            <span>{t("lookbook")}</span>
          </div>
        </div>

        <section className="lookbook-grid" aria-label={t("lookbook")}>
          {entries.map((item) => (
            <Link className="lookbook-card" href={`/lookbook/${item.id}`} key={item.id}>
              <img src={imageSource(item.imageUrl)} alt={item.title} />
            </Link>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}

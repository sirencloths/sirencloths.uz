"use client";

import { useParams } from "next/navigation";
import LookbookCarousel from "@/components/LookbookCarousel";
import FixedTop from "@/components/FixedTop";
import { lookbookItems } from "@/lib/data";
import { getStorefrontLookbook } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";

const imageSource = (url: string) => url.startsWith("http") ? url : `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "")}${url}`;

export default function LookbookViewerPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [items, setItems] = useState(lookbookItems);
  useEffect(() => { void getStorefrontLookbook().then((entries) => { if (entries.length) setItems(entries.map((entry) => ({ id: entry.id, image: imageSource(entry.imageUrl), alt: entry.title }))); }).catch(() => undefined); }, []);
  const initialIndex = Math.max(0, items.findIndex((item) => item.id === id));

  return (
    <>
      <FixedTop />
      <main className="lookbook-viewer-page">
        <h1>{t("lookbook")}</h1>
        <LookbookCarousel items={items} initialIndex={initialIndex} />
      </main>
    </>
  );
}

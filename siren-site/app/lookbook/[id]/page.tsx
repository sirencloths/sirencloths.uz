"use client";

import { useParams } from "next/navigation";
import LookbookCarousel from "@/components/LookbookCarousel";
import { getStorefrontLookbook } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";

const imageSource = (url: string) => url.startsWith("http") ? url : `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "")}${url}`;

export default function LookbookViewerPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [items, setItems] = useState<Array<{ id: string; image: string; alt: string }>>([]);
  useEffect(() => { void getStorefrontLookbook().then((entries) => setItems(entries.map((entry) => ({ id: entry.id, image: imageSource(entry.imageUrl), alt: entry.title })))).catch(() => setItems([])); }, []);
  const initialIndex = Math.max(0, items.findIndex((item) => item.id === id));

  return (
    <>
      <main className="lookbook-viewer-page">
        <h1>{t("lookbook")}</h1>
        <LookbookCarousel items={items} initialIndex={initialIndex} />
      </main>
    </>
  );
}

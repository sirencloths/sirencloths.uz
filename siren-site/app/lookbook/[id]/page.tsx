"use client";

import { useParams } from "next/navigation";
import LookbookCarousel from "@/components/LookbookCarousel";
import FixedTop from "@/components/FixedTop";
import { lookbookItems } from "@/lib/data";
import { useLanguage } from "@/components/LanguageProvider";

export default function LookbookViewerPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const initialIndex = Math.max(0, lookbookItems.findIndex((item) => item.id === id));

  return (
    <>
      <FixedTop />
      <main className="lookbook-viewer-page">
        <h1>{t("lookbook")}</h1>
        <LookbookCarousel items={lookbookItems} initialIndex={initialIndex} />
      </main>
    </>
  );
}

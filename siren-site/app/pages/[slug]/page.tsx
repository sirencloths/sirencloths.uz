"use client";

import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import { getStorefrontPage, type ApiPage } from "@/lib/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ManagedPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<ApiPage | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getStorefrontPage(slug)
      .then((result) => { if (mounted) setPage(result); })
      .catch(() => { if (mounted) setMissing(true); });
    return () => { mounted = false; };
  }, [slug]);

  return (
    <>
      <FixedTop />
      <main className="managed-page">
        <p className="ui-overline">SIREN</p>
        <h1>{page?.title ?? (missing ? "SAHIFA TOPILMADI" : "YUKLANMOQDA")}</h1>
        {page?.sections?.map((section) => (
          <section key={section.id} className="managed-page-section">
            {typeof section.content?.title === "string" && <h2>{section.content.title}</h2>}
            {typeof section.content?.text === "string" && <p>{section.content.text}</p>}
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}

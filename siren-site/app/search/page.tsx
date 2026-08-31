"use client";

import { useRouter } from "next/navigation";
import FixedTop from "@/components/FixedTop";
import { SearchContents } from "@/components/SearchProvider";

export default function SearchPage() {
  const router = useRouter();

  return (
    <>
      <FixedTop />
      <main className="search-page">
        <div className="search-page-content">
          <SearchContents onSubmit={(query) => router.push(`/shop?q=${encodeURIComponent(query)}`)} />
        </div>
      </main>
    </>
  );
}

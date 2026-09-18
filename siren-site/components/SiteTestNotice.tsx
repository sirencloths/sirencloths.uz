"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

export default function SiteTestNotice() {
  const pathname = usePathname();
  const { t } = useLanguage();
  if (pathname.startsWith("/social") || pathname.startsWith("/admin")) return null;
  return <aside className="site-test-notice" role="status">{t("siteTesting")}</aside>;
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

const marqueeItems = Array.from({ length: 8 });

export default function TopBar() {
  const { language, openLanguageSelector, t } = useLanguage();

  return (
    <div className="topbar">
      <button className="topbar-control" type="button" onClick={openLanguageSelector} aria-label={t("language")}>
        <Image src="/icons/lang.svg" alt="" width={22} height={22} />
        <span>{language.label}</span>
      </button>

      <div className="topbar-marquee" aria-hidden="true">
        <div className="marquee-track">
          {marqueeItems.map((_, i) => (
            <span key={i}>{t("sale")}</span>
          ))}
        </div>
      </div>

      <Link className="topbar-control topbar-control--right" href="/profile/settings#notifications" aria-label="Xabarlar sozlamalari">
        <span>XABARLAR</span>
      </Link>
    </div>
  );
}

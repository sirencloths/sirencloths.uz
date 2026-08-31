"use client";

import Image from "next/image";
import { useLanguage } from "./LanguageProvider";

export default function Promo() {
  const { t } = useLanguage();

  return (
    <section className="promo" id="lookbook">
      <a className="promo-card promo-card--large" href="#">
        <Image src="/images/large-banner.jpg" alt="Аксессуары" width={840} height={900} />
        <span className="banner-copy banner-copy--dark">
          <span>{t("accessories")}</span>
          <b>{t("go")}</b>
        </span>
      </a>

      <a className="promo-card promo-card--small" href="#">
        <Image src="/images/small-banner.jpg" alt="Мерч" width={840} height={614} />
        <span className="banner-copy banner-copy--dark banner-copy--right">
          <span>{t("merch")}</span>
          <b>{t("go")}</b>
        </span>
      </a>
    </section>
  );
}

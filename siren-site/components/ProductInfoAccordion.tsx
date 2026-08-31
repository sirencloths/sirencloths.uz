"use client";

import Image from "next/image";
import { useState } from "react";
import { useLanguage } from "./LanguageProvider";

export default function ProductInfoAccordion() {
  const { t } = useLanguage();
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [deliveryOpen, setDeliveryOpen] = useState(true);

  return (
    <div className="product-info-accordion">
      <section className="product-info-section">
        <button
          type="button"
          className="product-info-heading"
          onClick={() => setDescriptionOpen((prev) => !prev)}
          aria-expanded={descriptionOpen}
        >
          <span>{t("description")}</span>

          <Image
            className="product-info-arrow"
            src={
              descriptionOpen
                ? "/icons/arrow-up.svg"
                : "/icons/arrow-down.svg"
            }
            alt=""
            width={20}
            height={20}
          />
        </button>

        {descriptionOpen && (
          <div className="product-info-content">
            <ul>
              <li>{t("classicTee")}</li>
              <li>{t("graphicPrint")}</li>
              <li>{t("cotton")}</li>
              <li>170 Г</li>
              <li>{t("standardFit")}</li>
              <li>{t("article")}</li>
            </ul>
          </div>
        )}
      </section>

      <section className="product-info-section">
        <button
          type="button"
          className="product-info-heading"
          onClick={() => setDeliveryOpen((prev) => !prev)}
          aria-expanded={deliveryOpen}
        >
          <span>{t("delivery")}</span>

          <Image
            className="product-info-arrow"
            src={
              deliveryOpen
                ? "/icons/arrow-up.svg"
                : "/icons/arrow-down.svg"
            }
            alt=""
            width={20}
            height={20}
          />
        </button>

        {deliveryOpen && (
          <div className="product-info-content">
            <ul>
              <li>{t("processing")}</li>
              <li>{t("beforeNoon")}</li>
              <li>{t("shipping")}</li>
              <li>{t("returns")}</li>
            </ul>

            <button
              type="button"
              className="return-policy-link"
            >
              {t("returnPolicy")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";

export default function ProductInfoAccordion({ description, article }: { description?: string; article?: string }) {
  const { t } = useLanguage();
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  return (
    <div className="product-info-accordion">
      <section className="product-info-section">
        <button
          type="button"
          className="product-info-heading"
          onClick={() => { setDescriptionOpen((prev) => !prev); setDeliveryOpen(false); }}
          aria-expanded={descriptionOpen}
        >
          <span>{t("description")}</span>

          <span className="product-info-arrow" aria-hidden="true">{descriptionOpen ? "−" : "+"}</span>
        </button>

        {descriptionOpen && (
          <div className="product-info-content">
            <p>{description || t("classicTee")}</p>{article && <p className="product-detail-article">ARTIKUL: {article}</p>}
          </div>
        )}
      </section>

      <section className="product-info-section">
        <button
          type="button"
          className="product-info-heading"
          onClick={() => { setDeliveryOpen((prev) => !prev); setDescriptionOpen(false); }}
          aria-expanded={deliveryOpen}
        >
          <span>{t("delivery")}</span>

          <span className="product-info-arrow" aria-hidden="true">{deliveryOpen ? "−" : "+"}</span>
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

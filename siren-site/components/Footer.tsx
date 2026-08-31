"use client";

import Image from "next/image";
import { useLanguage } from "./LanguageProvider";

const tickerItems = Array.from({ length: 12 });

const socials = [
  { label: "Instagram", icon: "/icons/social/instagram.svg" },
  { label: "Telegram", icon: "/icons/social/telegram.svg" },
  { label: "Facebook", icon: "/icons/social/facebook.svg" },
  { label: "YouTube", icon: "/icons/social/youtube.svg" },
  { label: "TikTok", icon: "/icons/social/tik%20tok.svg" },
];

const payments = ["Payme", "Click", "Paynet"];

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="siren-footer">
      <div className="footer-ticker" aria-hidden="true">
        <div>
          {tickerItems.map((_, i) => (
            <span key={i}>
              <Image
                src="/icons/logo.svg"
                alt=""
                width={142}
                height={33}
              />
            </span>
          ))}
        </div>
      </div>

      <div className="siren-footer__inner">
        <nav className="footer-menu" aria-label="Footer navigation">
          <a href="#shop">{t("shop")}</a>
          <a href="#collections">{t("collections")}</a>
          <a href="#lookbook">{t("lookbook")}</a>
          <a href="/blog">{t("blog")}</a>
        </nav>

        <div className="footer-buyers">
          <h2>{t("customers")}</h2>
          <a href="#">{t("delivery")}</a>
          <a href="#">{t("exchange")}</a>
          <a href="#">{t("sizeGuide")}</a>
          <a href="#">FAQ</a>
        </div>

        <div className="footer-contacts">
          <h2>{t("contacts")}</h2>
          <p>
            <b>E-mail:</b> sirencloths@gmail.com
          </p>
          <p>
            <b>Телефон:</b> +998 (20) 001-66-68
          </p>
          <p>
            <b>{t("support")}:</b> ежедневно с 10:00 до 22:00
          </p>
        </div>

        <div className="footer-mobile-accordions">
          <details>
            <summary>{t("customers")}</summary>
            <div>
              <a href="#">{t("delivery")}</a>
              <a href="#">{t("exchange")}</a>
              <a href="#">{t("sizeGuide")}</a>
              <a href="#">FAQ</a>
            </div>
          </details>

          <details>
            <summary>{t("contacts")}</summary>
            <div>
              <p>Е-mail: sirencloths@gmail.com</p>
              <p>Телефон: +998 (20) 001-66-68</p>
              <p>{t("support")}: ежедневно с 10:00 до 22:00</p>
            </div>
          </details>

          <details>
            <summary>{t("payments")}</summary>
            <div>
              {payments.map((payment) => (
                <span key={payment}>{payment}</span>
              ))}
            </div>
          </details>
        </div>

        <div className="footer-social">
          <div className="social-icons" aria-label="Соцсети">
            {socials.map((social) => (
              <a key={social.label} href="#" aria-label={social.label}>
                <Image src={social.icon} alt="" width={22} height={22} />
              </a>
            ))}
          </div>

          <a className="policy-link" href="#">
            {t("privacy")}
          </a>

          <a className="policy-link" href="#">
            {t("terms")}
          </a>
        </div>

        <div className="footer-payments">
          <h2>{t("payments")}</h2>
          <div>
            {payments.map((payment) => (
              <span key={payment}>{payment}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="siren-footer__bottom">
        2025 © ИП ООО «SIREN» ВСЕ ПРАВА ЗАЩИЩЕНЫ
      </div>
    </footer>
  );
}

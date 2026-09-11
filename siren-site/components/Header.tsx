"use client";

import Image from "next/image";
import { useCart } from "./CartContext";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useSearch } from "./SearchProvider";
import { useEffect, useState } from "react";
import { useCustomerAuth } from "./CustomerAuthProvider";

type NavigationLink = { id: string; href: string; label: string; labels?: Partial<Record<"ru" | "uz" | "en", string>>; translationKey?: string; isActive?: boolean };

const defaultNavLinks: NavigationLink[] = [
  { id: "shop", href: "/shop", label: "shop", translationKey: "shop", isActive: true },
  { id: "collections", href: "/collections", label: "collections", translationKey: "collections", isActive: true },
  { id: "lookbook", href: "/lookbook", label: "lookbook", translationKey: "lookbook", isActive: true },
  { id: "blog", href: "/blog", label: "blog", translationKey: "blog", isActive: true },
];

const navIcons = [
  { href: "/search", label: "search", icon: "/icons/search.svg" },
  { href: "/favorites", label: "favorites", icon: "/icons/heart.svg" },
  { href: "/cart", label: "cart", icon: "/icons/cart.svg" },
  { href: "/profile", label: "profile", icon: "/icons/user.svg" },
] as const;

export default function Header() {
  const { cartCount, openCart } = useCart();
  const pathname = usePathname();
  const { t, locale } = useLanguage();
  const { isSearchOpen, toggleSearch } = useSearch();
  const { customer, openAuth } = useCustomerAuth();
  const [navLinks, setNavLinks] = useState<NavigationLink[] | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/content/navigation`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((items: NavigationLink[]) => {
        if (mounted && Array.isArray(items)) setNavLinks(items);
      })
      .catch(() => { if (mounted) setNavLinks(defaultNavLinks); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <header className="header">
      <nav className="nav" aria-label={t("home")}>

        {/* LOGO */}
        <a className="nav-logo" href="/">
          <Image
            src="/icons/logo.svg"
            alt="SIREN"
            width={141}
            height={33}
            priority
          />
        </a>

        {/* NAVIGATION */}
        <ul className="nav-menu">
          {(navLinks ?? []).map((link) => {
            const isActive = link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={
                    isActive
                      ? "nav-link nav-link--active"
                      : "nav-link"
                  }
                >
                  {link.translationKey ? t(link.translationKey) : link.labels?.[locale as "ru" | "uz" | "en"] || link.labels?.ru || link.labels?.en || link.label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* ICONS */}
        <div
          className="nav-icons"
          aria-label="Быстрые действия"
        >
          {navIcons.map((item) => {
            const isCartIcon = item.href === "/cart";
            const isSearchIcon = item.href === "/search";
            const isFavoriteIcon = item.href === "/favorites";
            const isProfileIcon = item.href === "/profile";
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const desktopCloseIcon = !isMobile && ((isSearchIcon && isSearchOpen) || (isFavoriteIcon && isActive) || (isProfileIcon && isActive));
            const href = isMobile
              ? item.href
              : isSearchIcon
                ? "#search"
                : isCartIcon
                  ? "#cart"
                  : desktopCloseIcon
                    ? "/"
                    : item.href;

            return (
              <a
                key={item.href}
                href={href}
                aria-label={t(item.label)}
                aria-current={isMobile && isActive ? "page" : undefined}
                className={`nav-icon-link${isMobile && isActive ? " nav-icon-link--active" : ""}`}
                onClick={(event) => {
                  if (isProfileIcon && !customer) {
                    event.preventDefault();
                    openAuth();
                    return;
                  }
                  if (isMobile) return;
                  if (isSearchIcon) {
                    event.preventDefault();
                    toggleSearch();
                  }
                  if (isCartIcon) {
                    event.preventDefault();
                    openCart();
                  }
                }}
              >
                <Image
                  src={desktopCloseIcon ? "/icons/close.svg" : item.icon}
                  alt=""
                  width={30}
                  height={30}
                />

                {/* CART BADGE */}
                {isCartIcon &&
                  cartCount > 0 && (
                    <span className="cart-badge">
                      {cartCount}
                    </span>
                  )}
              </a>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

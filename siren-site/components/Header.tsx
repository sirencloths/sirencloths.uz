"use client";

import Image from "next/image";
import { useCart } from "./CartContext";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useSearch } from "./SearchProvider";

const navLinks = [
  { href: "/shop", label: "shop" },
  { href: "/collections", label: "collections" },
  { href: "/lookbook", label: "lookbook" },
  { href: "/blog", label: "blog" },
] as const;

const navIcons = [
  { href: "#search", label: "search", icon: "/icons/search.svg" },
  { href: "/favorites", label: "favorites", icon: "/icons/heart.svg" },
  { href: "/cart", label: "cart", icon: "/icons/cart.svg" },
  { href: "/profile", label: "profile", icon: "/icons/user.svg" },
] as const;

export default function Header() {
  const { cartCount } = useCart();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { isSearchOpen, toggleSearch } = useSearch();

  const isCartPage = pathname === "/cart";
  const isFavoritesPage = pathname === "/favorites";
  const isProfilePage = pathname === "/profile";

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
          {navLinks.map((link) => {
            const isActive =
              (link.href === "/shop" &&
                (pathname === "/shop" ||
                  pathname.startsWith("/shop/"))) ||
              (link.href === "/collections" &&
                pathname === "/collections") ||
              (link.href === "/lookbook" && pathname === "/lookbook") ||
              (link.href === "/blog" && pathname === "/blog");

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
                  {t(link.label)}
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
            const isSearchIcon = item.href === "#search";
            const isFavoriteIcon = item.href === "/favorites";
            const isProfileIcon = item.href === "/profile";

            return (
              <a
                key={item.href}
                href={
                  isCartIcon && isCartPage
                    ? "/"
                    : isFavoriteIcon && isFavoritesPage
                    ? "/"
                    : isProfileIcon && isProfilePage
                    ? "/"
                    : item.href
                }
                aria-label={
                  isCartIcon && isCartPage
                    ? t("home")
                    : isFavoriteIcon && isFavoritesPage
                    ? t("home")
                    : isProfileIcon && isProfilePage
                    ? t("home")
                    : t(item.label)
                }
                className="nav-icon-link"
                onClick={(event) => {
                  if (isSearchIcon) {
                    event.preventDefault();
                    toggleSearch();
                  }
                }}
              >
                <Image
                  src={
                    isSearchIcon && isSearchOpen
                      ? "/icons/close.svg"
                      : isCartIcon && isCartPage
                      ? "/icons/close.svg"
                      : isFavoriteIcon && isFavoritesPage
                      ? "/icons/close.svg"
                      : isProfileIcon && isProfilePage
                      ? "/icons/close.svg"
                      : item.icon
                  }
                  alt=""
                  width={30}
                  height={30}
                />

                {/* CART BADGE */}
                {isCartIcon &&
                  !isCartPage &&
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

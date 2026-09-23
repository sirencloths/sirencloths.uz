"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useSearch } from "./SearchProvider";
import { useEffect, useState } from "react";
import { useCustomerAuth } from "./CustomerAuthProvider";
import { getStorefrontNavigation, type StorefrontNavigationItem } from "@/lib/api";

type NavigationLink = StorefrontNavigationItem;

// The storefront chrome deliberately stays mounted between routes.  Keep the
// last confirmed menu at module scope too, so even if React remounts the
// header during a route boundary it never paints an empty, narrower navbar
// while the settings request is in flight.
let confirmedNavigation: NavigationLink[] | null = null;
const navIcons: Array<{ href: "/shop" | "/search" | "/favorites" | "/cart" | "/profile"; label: "shop" | "search" | "favorites" | "cart" | "profile"; icon: string; overlay?: "search" | "cart"; catalog?: boolean }> = [
  { href: "/shop", label: "shop", icon: "/icons/shop.svg", catalog: true },
  { href: "/search", label: "search", icon: "/icons/search.svg", overlay: "search" },
  { href: "/favorites", label: "favorites", icon: "/icons/heart.svg" },
  { href: "/cart", label: "cart", icon: "/icons/cart.svg" },
  { href: "/profile", label: "profile", icon: "/icons/user.svg" },
];

export default function Header() {
  const { cartCount, isCartOpen, openCart, closeCart } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { isSearchOpen, toggleSearch } = useSearch();
  const { customer, openAuth } = useCustomerAuth();
  // Do not render a hard-coded fallback menu.  The admin setting is the only
  // source of truth, so a link that has been hidden can never flash on screen
  // during a refresh or a client-side page transition.
  const [navLinks, setNavLinks] = useState<NavigationLink[]>(() => confirmedNavigation ?? []);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 761px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const returnHome = () => {
    if (isSearchOpen) toggleSearch();
    if (isCartOpen) closeCart();
    router.push("/");
  };

  useEffect(() => {
    let active = true;
    void getStorefrontNavigation()
      .then((items) => {
        if (!active) return;
        const visibleItems = items.filter((item) => item.isActive !== false);
        confirmedNavigation = visibleItems;
        setNavLinks((current) => {
          const before = JSON.stringify(current.map(({ id, href, label, translationKey, isActive }) => ({ id, href, label, translationKey, isActive })));
          const after = JSON.stringify(visibleItems.map(({ id, href, label, translationKey, isActive }) => ({ id, href, label, translationKey, isActive })));
          return before === after ? current : visibleItems;
        });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <header className="header">
      <nav className="nav" aria-label={t("home")}>

        {/* LOGO */}
        <Link className="nav-logo" href="/">
          <Image
            src="/icons/logo.svg"
            alt="SIREN"
            width={141}
            height={33}
            priority
          />
        </Link>

        {/* NAVIGATION */}
        <ul className={`nav-menu${navLinks.length ? "" : " nav-menu--loading"}`}>
          {navLinks.filter((link) => link.isActive !== false && link.id !== "shop" && link.href !== "/shop").map((link) => {
            const isActive = link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
            const knownKey = link.translationKey || (link.id === "blog" || link.href === "/blog" ? "blog" : link.id === "lookbook" || link.href === "/lookbook" ? "lookbook" : link.id === "collections" || link.href === "/collections" ? "collections" : link.id === "records" || link.href === "/records" ? "records" : undefined);

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    isActive
                      ? "nav-link nav-link--active"
                      : "nav-link"
                  }
                >
                  {knownKey ? t(knownKey) : link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ICONS */}
        <div
          className="nav-icons"
          aria-label={t("quickActions")}
        >
          {navIcons.map((item) => {
            const isCartIcon = item.href === "/cart";
            const isSearchIcon = item.href === "/search";
            const isShopIcon = item.href === "/shop";
            const isProfileIcon = item.href === "/profile";
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isOverlayAction = Boolean(item.overlay) || (isCartIcon && isDesktop);
            // An open overlay gets the single close affordance.  The current
            // page icon must stay normal while search/cart is open; otherwise
            // two close marks appear in the desktop header.
            const isIconActive = isDesktop && (
              isSearchOpen
                ? isSearchIcon
                : isCartOpen
                  ? isCartIcon
                  : isActive
            );
            const icon = isIconActive ? "/icons/close.svg" : item.icon;

            if (isOverlayAction) {
              return <button
                key={item.href}
                type="button"
                aria-label={t(item.label)}
                aria-expanded={isSearchIcon ? isSearchOpen : isCartIcon ? isCartOpen : undefined}
                className={`nav-icon-link nav-icon-button${isSearchIcon ? " nav-search-link" : ""}${isIconActive ? " nav-icon-link--active" : ""}`}
                onClick={() => {
                  if (isIconActive && isSearchIcon && isSearchOpen) toggleSearch();
                  else if (isIconActive && isCartIcon && isCartOpen) closeCart();
                  else if (isIconActive) returnHome();
                  else if (isSearchIcon) toggleSearch();
                  else if (isCartIcon) openCart();
                  else openCart();
                }}
              >
                <Image src={icon} alt="" width={30} height={30} />
                {isCartIcon && cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </button>;
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={t(item.label)}
                aria-current={isActive ? "page" : undefined}
                className={`nav-icon-link${item.catalog ? " nav-catalog-link" : ""}${isIconActive ? " nav-icon-link--active" : ""}`}
                onClick={(event) => {
                  if (isIconActive) {
                    event.preventDefault();
                    returnHome();
                    return;
                  }
                  if (isProfileIcon && !customer) {
                    event.preventDefault();
                    openAuth();
                    return;
                  }
                }}
              >
                <Image
                  src={icon}
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
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

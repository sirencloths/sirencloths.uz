"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useEffect, useState } from "react";
import { useCustomerAuth } from "./CustomerAuthProvider";
import { getStorefrontNavigation, type StorefrontNavigationItem } from "@/lib/api";

type NavigationLink = StorefrontNavigationItem;

const defaultNavLinks: NavigationLink[] = [
  { id: "shop", href: "/shop", label: "shop", translationKey: "shop", isActive: true },
  { id: "collections", href: "/collections", label: "collections", translationKey: "collections", isActive: true },
  { id: "lookbook", href: "/lookbook", label: "lookbook", translationKey: "lookbook", isActive: true },
  { id: "blog", href: "/blog", label: "blog", translationKey: "blog", isActive: true },
];
const navIcons: Array<{ href: "/shop" | "/favorites" | "/cart" | "/profile"; label: "shop" | "favorites" | "cart" | "profile"; icon: string; overlay?: "cart"; catalog?: boolean }> = [
  { href: "/shop", label: "shop", icon: "/icons/catalog.svg", catalog: true },
  { href: "/favorites", label: "favorites", icon: "/icons/heart.svg" },
  { href: "/cart", label: "cart", icon: "/icons/cart.svg", overlay: "cart" },
  { href: "/profile", label: "profile", icon: "/icons/user.svg" },
];

export default function Header() {
  const { cartCount, openCart } = useCart();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { customer, openAuth } = useCustomerAuth();
  const [navLinks, setNavLinks] = useState<NavigationLink[]>(defaultNavLinks);

  useEffect(() => {
    let active = true;
    void getStorefrontNavigation()
      .then((items) => {
        if (!active || !items.length) return;
        setNavLinks((current) => {
          const before = JSON.stringify(current.map(({ id, href, label, translationKey }) => ({ id, href, label, translationKey })));
          const after = JSON.stringify(items.map(({ id, href, label, translationKey }) => ({ id, href, label, translationKey })));
          return before === after ? current : items;
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
        <ul className="nav-menu">
          {navLinks.filter((link) => link.id !== "shop" && link.href !== "/shop").map((link) => {
            const isActive = link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

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
                  {link.translationKey ? t(link.translationKey) : link.label}
                </Link>
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
            const isProfileIcon = item.href === "/profile";
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isOverlayAction = Boolean(item.overlay);

            if (isOverlayAction) {
              return <button
                key={item.href}
                type="button"
                aria-label={t(item.label)}
                className="nav-icon-link nav-icon-button"
                onClick={openCart}
              >
                <Image src={item.icon} alt="" width={30} height={30} />
                {isCartIcon && cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </button>;
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={t(item.label)}
                aria-current={isActive ? "page" : undefined}
                className={`nav-icon-link${item.catalog ? " nav-catalog-link" : ""}`}
                onClick={(event) => {
                  if (isProfileIcon && !customer) {
                    event.preventDefault();
                    openAuth();
                    return;
                  }
                }}
              >
                <Image
                  src={item.icon}
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

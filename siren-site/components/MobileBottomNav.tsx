"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useCart } from "./CartContext";

const items = [
  { href: "/", label: "home", icon: "/icons/home.svg" },
  { href: "/shop", label: "shop", icon: "/icons/shop.svg" },
  { href: "/cart", label: "cart", icon: "/icons/cart.svg" },
  { href: "/favorites", label: "favorites", icon: "/icons/heart.svg" },
  { href: "/profile", label: "profile", icon: "/icons/user.svg" },
] as const;

function NavIcon({ icon, home }: { icon: string; home?: boolean }) {
  if (home) return <img className="mobile-home-icon" src="/icons/home.svg" alt="" />;
  return <Image src={icon} alt="" width={30} height={30} />;
}

export default function MobileBottomNav() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { cartCount } = useCart();

  if (pathname.startsWith("/admin") || pathname.startsWith("/social")) return null;

  return (
    <nav className="mobile-bottom-nav" aria-label={t("mobileNavigation")}>
      {items.map((item) => {
        const hasItems = item.href === "/cart" && cartCount > 0;
        const isActive = item.href === "/"
          ? !["/search", "/shop", "/cart", "/checkout", "/favorites", "/profile"].some((route) => pathname.startsWith(route))
          : item.href === "/cart"
            ? pathname === "/cart" || pathname === "/checkout"
            : pathname === item.href;
        const className = `${isActive ? "is-active" : ""}${hasItems ? " has-items" : ""}`.trim();
        const ariaLabel = t(item.label);

        return (
        <Link
          key={item.label}
          href={item.href}
          aria-label={ariaLabel}
          aria-current={isActive ? "page" : undefined}
          className={className}
        >
          <NavIcon icon={item.icon} home={item.href === "/"} />
          {hasItems && <span aria-hidden="true" />}
        </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { useCart } from "./CartContext";

const items = [
  { href: "/", label: "Главная", icon: "/icons/home.svg" },
  { href: "/search", label: "Поиск", icon: "/icons/search.svg" },
  { href: "/cart", label: "Корзина", icon: "/icons/cart.svg" },
  { href: "/favorites", label: "Избранное", icon: "/icons/heart.svg" },
  { href: "/profile", label: "Профиль", icon: "/icons/user.svg" },
];

function NavIcon({ icon, home }: { icon: string; home?: boolean }) {
  if (home) return <img className="mobile-home-icon" src="/icons/home.svg" alt="" />;
  return <Image src={icon} alt="" width={30} height={30} />;
}

export default function MobileBottomNav() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { cartCount } = useCart();

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
      {items.map((item) => {
        const hasItems = item.href === "/cart" && cartCount > 0;
        const isActive = item.href === "/"
          ? !["/search", "/cart", "/checkout", "/favorites", "/profile"].some((route) => pathname.startsWith(route))
          : item.href === "/cart"
            ? pathname === "/cart" || pathname === "/checkout"
            : pathname === item.href;
        const className = `${isActive ? "is-active" : ""}${hasItems ? " has-items" : ""}`.trim();
        const ariaLabel = t(item.label === "Главная" ? "home" : item.label === "Поиск" ? "search" : item.label === "Корзина" ? "cart" : item.label === "Избранное" ? "favorites" : "profile");

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

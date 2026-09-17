"use client";

import { usePathname } from "next/navigation";
import FixedTop from "./FixedTop";

/**
 * Storefront chrome belongs to the root layout, rather than individual pages.
 * That keeps the header mounted while navigating between storefront routes.
 */
export default function SiteChrome() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;
  return <FixedTop />;
}

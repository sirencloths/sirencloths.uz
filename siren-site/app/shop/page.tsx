import ShopListing from "@/components/ShopListing";
import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
export const metadata: Metadata = pageMetadata({ title: "Shop streetwear", description: "Shop SIREN streetwear, clothing and accessories from Tashkent.", path: "/shop" });
export default function ShopPage() { return <Suspense fallback={null}><ShopListing /></Suspense>; }

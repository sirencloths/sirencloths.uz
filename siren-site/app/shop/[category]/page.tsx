import ShopListing from "@/components/ShopListing";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getStorefrontCategories } from "@/lib/api";
import { pageMetadata } from "@/lib/seo";
type Props = { params: Promise<{ category: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { category } = await params; const item = (await getStorefrontCategories().catch(() => [])).find((entry) => entry.slug === category); return pageMetadata({ title: item?.name || "Shop category", description: item?.description || `Shop ${item?.name || "streetwear"} from SIREN.`, path: `/shop/${encodeURIComponent(category)}`, noIndex: !item }); }
export default async function CategoryShopPage({ params }: Props) { const { category } = await params; return <Suspense fallback={null}><ShopListing category={category} /></Suspense>; }

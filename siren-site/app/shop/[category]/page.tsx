import ShopListing from "@/components/ShopListing";
import { Suspense } from "react";
export default async function CategoryShopPage({ params }: { params: Promise<{ category: string }> }) { const { category } = await params; return <Suspense fallback={null}><ShopListing category={category} /></Suspense>; }

import ShopListing from "@/components/ShopListing";
import { Suspense } from "react";
export default function ShopPage() { return <Suspense fallback={null}><ShopListing /></Suspense>; }

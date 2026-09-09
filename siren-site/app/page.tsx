import Blog from "@/components/Blog";
import Collection from "@/components/Collection";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import ManagedHomepageSections from "@/components/ManagedHomepageSections";
import Products from "@/components/Products";
import Promo from "@/components/Promo";
import Records from "@/components/Records";
import Tactical from "@/components/Tactical";
import { heroProducts } from "@/lib/data";
import { getCustomSections, getStorefrontBanners, getStorefrontProducts, getStorefrontRecords, toStorefrontColorCards, type ApiCustomSection } from "@/lib/api";

export default async function Home() {
  // Render active admin products in the initial HTML instead of waiting for a browser effect.
  const adminProducts = await getStorefrontProducts().catch(() => []);
  const adminRecords = await getStorefrontRecords().catch(() => []);
  const adminBanners = await getStorefrontBanners().catch(() => []);
  const savedSections = await getCustomSections().catch(() => []);
  const managedSections = savedSections.filter((section) => section.layoutType === "collection" || section.layoutType === "promo" || section.layoutType === "tactical") as Array<ApiCustomSection & { layoutType: "collection" | "promo" | "tactical" }>;
  const homepageProducts = adminProducts.length
    ? toStorefrontColorCards(adminProducts)
    : heroProducts;

  return (
    <>
      <FixedTop />

      <main>
        <Hero banners={adminBanners} />

        <Products
          products={homepageProducts}
          id="shop"
          ariaLabel="Популярные товары"
          slider
        />

        {managedSections.length ? <ManagedHomepageSections sections={managedSections} products={adminProducts} /> : <><Collection /><Promo /><Tactical /></>}
        <Records records={adminRecords} />
        <Blog />
      </main>

      <Footer />
    </>
  );
}

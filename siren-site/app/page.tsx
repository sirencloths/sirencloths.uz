import Blog from "@/components/Blog";
import Collection from "@/components/Collection";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Products from "@/components/Products";
import Promo from "@/components/Promo";
import Records from "@/components/Records";
import Tactical from "@/components/Tactical";
import { heroProducts } from "@/lib/data";

export default function Home() {
  return (
    <>
      <FixedTop />

      <main>
        <Hero />

        <Products
          products={heroProducts}
          id="shop"
          ariaLabel="Популярные товары"
          slider
        />

        <Collection />
        <Promo />
        <Tactical />

        <Records />
        <Blog />
      </main>

      <Footer />
    </>
  );
}

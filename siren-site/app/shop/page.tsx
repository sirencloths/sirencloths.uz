"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { heroProducts } from "@/lib/data";
import { searchProducts } from "@/lib/search";
import { useLanguage } from "@/components/LanguageProvider";

const categories = [
  "ВЕРХ",
  "НИЗ",
  "НОВИНКИ",
  "АКСЕССУАРЫ",
  "СКИДКИ",
] as const;

type Category = (typeof categories)[number];

type ProductWithCategory = (typeof heroProducts)[number] & {
  category?: Category;
};

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopPageContent />
    </Suspense>
  );
}

function ShopPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  // ВСЕ ТОВАРЫ — DEFAULT
  const [selectedCategories, setSelectedCategories] =
    useState<Category[]>([]);

  const isAllSelected =
    selectedCategories.length === 0;

  // ВСЕ ТОВАРЫ
  const handleAllProducts = () => {
    setSelectedCategories([]);
  };

  // CATEGORY
  const handleCategory = (category: Category) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter(
          (item) => item !== category
        );
      }

      return [...prev, category];
    });
  };

  const products =
    heroProducts as ProductWithCategory[];

  const searchedProducts = searchQuery
    ? searchProducts(searchQuery) as ProductWithCategory[]
    : products;

  const filteredProducts = isAllSelected
    ? searchedProducts
    : searchedProducts.filter((product) => {
        const category =
          product.category ?? "ВЕРХ";

        return selectedCategories.includes(category);
      });

  const heading = selectedCategories.length === 1
    ? `${t("shop")}-${selectedCategories[0]}`
    : t("shop");

  return (
    <>
      <FixedTop />

      <main className="shop-page">
        {/* TITLE */}
        <div className="shop-heading">
          <h1>{heading}</h1>

          <div className="shop-breadcrumb">
            <a href="/">{t("home")}</a>
            <span>&gt;</span>
            <span>{t("shop")}</span>
          </div>
        </div>

        <div className="shop-content">
          {/* FILTER */}
          <aside className="shop-filter">

            {/* ВСЕ ТОВАРЫ */}
            <button
              type="button"
              className="shop-filter-title"
              onClick={handleAllProducts}
            >
              <span>{t("allProducts")}</span>

              <span
                className={`filter-circle ${
                  isAllSelected
                    ? "filter-circle--active"
                    : ""
                }`}
              />
            </button>

            {/* CATEGORIES */}
            {categories.map((category) => {
              const active =
                selectedCategories.includes(category);

              return (
                <button
                  key={category}
                  type="button"
                  className={`shop-filter-item ${
                    active
                      ? "shop-filter-item--active"
                      : ""
                  }`}
                  onClick={() =>
                    handleCategory(category)
                  }
                >
                  <span>{category}</span>

                  {active ? (
                    <span className="filter-check">
                      <Image
                        src="/icons/check.svg"
                        alt=""
                        width={14}
                        height={14}
                      />
                    </span>
                  ) : (
                    <span className="filter-square" />
                  )}
                </button>
              );
            })}
          </aside>

          {/* PRODUCTS */}
          <div className="shop-products">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(
                (product, index) => (
                  <ProductCard
                    key={`${product.id}-${index}`}
                    product={product}
                  />
                )
              )
            ) : (
              <div className="shop-empty">
                ТОВАРЫ НЕ НАЙДЕНЫ
              </div>
            )}
          </div>
        </div>
      </main>

      <aside className={`mobile-shop-filter${isMobileFilterOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="mobile-shop-filter-trigger"
          aria-expanded={isMobileFilterOpen}
          aria-controls="mobile-shop-filter-options"
          onClick={() => setIsMobileFilterOpen((isOpen) => !isOpen)}
        >
          <span>ФИЛЬТР</span>
          <Image
            src={isMobileFilterOpen ? "/icons/arrow-down.svg" : "/icons/arrow-up.svg"}
            alt=""
            width={22}
            height={12}
          />
        </button>

        <div id="mobile-shop-filter-options" className="mobile-shop-filter-options">
          <button type="button" className="mobile-shop-filter-option mobile-shop-filter-option--all" onClick={handleAllProducts}>
            <span>{t("allProducts")}</span>
            <span className={`filter-circle ${isAllSelected ? "filter-circle--active" : ""}`} />
          </button>

          {categories.map((category) => {
            const active = selectedCategories.includes(category);

            return (
              <button
                key={category}
                type="button"
                className="mobile-shop-filter-option"
                onClick={() => handleCategory(category)}
              >
                <span>{category}</span>
                {active ? (
                  <span className="filter-check">
                    <Image src="/icons/check.svg" alt="" width={14} height={14} />
                  </span>
                ) : <span className="filter-square" />}
              </button>
            );
          })}
        </div>
      </aside>

      <Footer />
    </>
  );
}

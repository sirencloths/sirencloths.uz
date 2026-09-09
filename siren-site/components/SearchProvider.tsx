"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { heroProducts, type Product } from "@/lib/data";
import { searchCategories, searchProducts } from "@/lib/search";
import { useLanguage } from "./LanguageProvider";
import { getStorefrontProducts, toStorefrontColorCards } from "@/lib/api";

type SearchContextValue = {
  isSearchOpen: boolean;
  toggleSearch: () => void;
  closeSearch: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);
export function SearchProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  useEffect(() => {
    if (!isSearchOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isSearchOpen]);

  const value = useMemo(() => ({
    isSearchOpen,
    toggleSearch: () => setIsSearchOpen((open) => !open),
    closeSearch,
  }), [isSearchOpen]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      {isSearchOpen && <SearchOverlay close={closeSearch} />}
    </SearchContext.Provider>
  );
}

function SearchOverlay({ close }: { close: () => void }) {
  const { t } = useLanguage();
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);

  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".fixed-top .nav");
    if (!header) return;
    const updatePosition = () => setHeaderBottom(Math.round(header.getBoundingClientRect().bottom));
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(header);
    window.addEventListener("resize", updatePosition);
    return () => { observer.disconnect(); window.removeEventListener("resize", updatePosition); };
  }, []);

  return (
    <div className="site-search-layer" role="presentation" onMouseDown={close}>
      <section className="site-search" style={headerBottom === null ? undefined : { top: headerBottom }} role="dialog" aria-modal="true" aria-label={t("search")} onMouseDown={(event) => event.stopPropagation()}>
        <SearchContents onProductClick={close} />
      </section>
    </div>
  );
}

export function SearchContents({
  onProductClick,
  onSubmit,
}: {
  onProductClick?: () => void;
  onSubmit?: (query: string) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [remoteProducts, setRemoteProducts] = useState<Product[] | null>(null);
  useEffect(() => { let mounted = true; void getStorefrontProducts().then((items) => { if (mounted && items.length) setRemoteProducts(toStorefrontColorCards(items)); }).catch(() => undefined); return () => { mounted = false; }; }, []);
  const catalogue = remoteProducts?.length ? remoteProducts : heroProducts;
  const normalizedQuery = query.trim().toLocaleLowerCase("uz-UZ");
  const filtered = normalizedQuery ? catalogue.filter((product) => `${product.title} ${product.color}`.toLocaleLowerCase("uz-UZ").includes(normalizedQuery)).slice(0, 4) : searchProducts(query).slice(0, 4);
  const products = normalizedQuery ? filtered : catalogue.slice(0, 4);

  return (
    <>
        <label className="site-search-input">
          <Image src="/icons/search.svg" alt="" width={32} height={32} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && query.trim()) onSubmit?.(query.trim());
            }}
            placeholder={t("search")}
          />
        </label>
        {!query && <div className="site-search-categories">{searchCategories.map((category) => <button key={category} type="button" onClick={() => setQuery(category)}>{category}</button>)}</div>}
        <div className="site-search-products">
          {products.map((product) => (
            <Link href={`/products/${product.id}${product.colorSlug ? `?color=${encodeURIComponent(product.colorSlug)}` : ""}`} key={product.cardId ?? product.id} onClick={onProductClick} className="site-search-product">
              <Image src={product.image} alt={product.title} width={270} height={270} />
              <strong>{product.title}</strong><span>{product.color === "GRAY" ? t("gray") : product.color}</span><b>{product.price}</b>
            </Link>
          ))}
          {query && !products.length && <p className="site-search-empty">{t("notFound")}</p>}
        </div>
    </>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch must be used inside SearchProvider");
  return context;
}

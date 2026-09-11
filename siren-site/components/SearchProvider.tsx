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
import { useLanguage } from "./LanguageProvider";
import { getStorefrontProducts, getStorefrontRandomProducts, storefrontAssetUrl, toStorefrontColorCards } from "@/lib/api";

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
  const [isInputActive, setIsInputActive] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [remoteProducts, setRemoteProducts] = useState<Product[] | null>(null);
  const [randomProducts, setRandomProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    let mounted = true;
    void getStorefrontProducts().then((items) => { if (mounted && items.length) setRemoteProducts(toStorefrontColorCards(items)); }).catch(() => undefined);
    void getStorefrontRandomProducts(4).then((items) => { if (mounted && items.length) setRandomProducts(toStorefrontColorCards(items).slice(0, 4)); }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("siren-recent-searches") ?? "[]");
      if (Array.isArray(saved)) setRecentQueries(saved.filter((item): item is string => typeof item === "string").slice(0, 5));
    } catch { /* A broken local value should never block search. */ }
  }, []);
  const catalogue = remoteProducts?.length ? remoteProducts : heroProducts;
  const normalizedQuery = normalize(query);
  const filtered = normalizedQuery ? catalogue
    .map((product) => ({ product, score: productScore(product, normalizedQuery) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.product)
    .slice(0, 8) : [];
  const recommendations = randomProducts?.length ? randomProducts : catalogue.slice(0, 4);
  const relatedSearches = normalizedQuery ? getRelatedSearches(normalizedQuery, catalogue) : [];
  const saveQuery = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setRecentQueries((current) => {
      const next = [clean, ...current.filter((item) => normalize(item) !== normalize(clean))].slice(0, 5);
      try { window.localStorage.setItem("siren-recent-searches", JSON.stringify(next)); } catch { /* Storage can be unavailable in private mode. */ }
      return next;
    });
  };
  const history = recentQueries;

  return (
    <>
        <label className="site-search-input">
          <Image src="/icons/search.svg" alt="" width={32} height={32} />
          <input
            value={query}
            onFocus={() => setIsInputActive(true)}
            onChange={(event) => { setQuery(event.target.value); setIsInputActive(true); }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && query.trim()) { saveQuery(query); onSubmit?.(query.trim()); }
            }}
            placeholder={t("search")}
          />
        </label>
        {isInputActive && !query && history.length > 0 && <div className="site-search-history"><p>ПОСЛЕДНИЕ ЗАПРОСЫ</p><div className="site-search-categories">{history.map((category) => <button key={category} type="button" onClick={() => { setQuery(category); saveQuery(category); }}>{category}<span>→</span></button>)}</div></div>}
        {isInputActive && Boolean(query) && relatedSearches.length > 0 && <div className="site-search-suggestions" aria-label="Варианты поиска">
          {relatedSearches.map((suggestion) => <button key={suggestion} type="button" onClick={() => setQuery(suggestion)}>Возможно, вы искали: <strong>{suggestion}</strong></button>)}
        </div>}
        {isInputActive && Boolean(query) && filtered.length > 0 && <div className="site-search-products">
          {filtered.map((product) => (
            <Link href={`/products/${product.id}${product.colorSlug ? `?color=${encodeURIComponent(product.colorSlug)}` : ""}`} key={product.cardId ?? product.id} onClick={() => { saveQuery(query); onProductClick?.(); }} className="site-search-product">
              <SearchResultImage src={product.image} alt={product.title} />
              <strong>{product.title}</strong><span>{product.color === "GRAY" ? t("gray") : product.color}</span><b>{product.price}</b>
            </Link>
          ))}
        </div>
        }
        {isInputActive && Boolean(query) && !filtered.length && <section className="site-search-no-results">
          <p className="site-search-empty">ВАШ ТОВАР НЕ НАЙДЕН</p>
          <button type="button" className="site-search-back" onClick={() => setQuery("")}>НАЗАД</button>
          <p className="site-search-recommendation-title">РЕКОМЕНДУЕМ</p>
          <div className="site-search-products">
            {recommendations.map((product) => (
              <Link href={`/products/${product.id}${product.colorSlug ? `?color=${encodeURIComponent(product.colorSlug)}` : ""}`} key={product.cardId ?? product.id} onClick={() => { saveQuery(query); onProductClick?.(); }} className="site-search-product">
                <SearchResultImage src={product.image} alt={product.title} />
                <strong>{product.title}</strong><span>{product.color === "GRAY" ? t("gray") : product.color}</span><b>{product.price}</b>
              </Link>
            ))}
          </div>
        </section>}
    </>
  );
}

const synonymGroups = [
  ["futbolka", "футболка", "майка", "майки", "tshirt", "t shirt", "tee", "top"],
  ["sviter", "свитер", "sweater", "sweat", "hoodie", "худи"],
  ["ishton", "shim", "jinsi", "jeans", "trouser", "pants", "брюки", "джинс", "штаны"],
  ["tursik", "trusik", "trsik", "трусики", "белье", "бельё", "underwear"],
  ["galstuk", "galsuk", "галстук", "babochka", "бабочка", "bow tie"],
  ["kok", "ko k", "blue", "синий", "голубой"],
  ["qora", "black", "черный", "чёрный"],
  ["oq", "white", "белый"],
  ["qizil", "red", "красный"],
  ["yashil", "green", "зеленый", "зелёный"],
  ["binafsha", "purple", "фиолетовый"],
];

function normalize(value: string) {
  return value.toLocaleLowerCase("uz-UZ").replace(/[ʻ’'`]/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function getRelatedSearches(query: string, catalogue: Product[]) {
  const group = synonymGroups.find((items) => items.some((item) => {
    const term = normalize(item);
    return term === query || term.startsWith(query) || query.startsWith(term);
  }));
  if (!group) return [];
  const available = group.filter((item) => {
    const term = normalize(item);
    return catalogue.some((product) => normalize(`${product.title} ${product.color} ${product.category ?? ""}`).includes(term));
  });
  return [...new Set(available)].slice(0, 2);
}

function productScore(product: Product, query: string) {
  const haystack = normalize(`${product.title} ${product.color} ${product.category ?? ""}`);
  const queryTerms = query.split(" ").filter(Boolean);
  let score = 0;
  for (const term of queryTerms) {
    if (haystack.includes(term)) score += 12;
    const group = synonymGroups.find((items) => items.some((item) => normalize(item) === term || normalize(item).startsWith(term)));
    if (group?.some((item) => haystack.includes(normalize(item)))) score += 9;
    if (haystack.split(" ").some((word) => word.startsWith(term) || term.startsWith(word))) score += 4;
  }
  return score;
}

function SearchResultImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const imageSrc = failed ? "/images/p1.jpg" : storefrontAssetUrl(src) || "/images/p1.jpg";
  const isRemote = imageSrc.startsWith("http://") || imageSrc.startsWith("https://");
  return <Image src={imageSrc} alt={alt} width={270} height={270} unoptimized={isRemote} onError={() => setFailed(true)} />;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch must be used inside SearchProvider");
  return context;
}

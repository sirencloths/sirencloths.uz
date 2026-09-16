"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FixedTop from "@/components/FixedTop";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { ApiCategory, getStorefrontCategories, getStorefrontListing, StorefrontListing, toStorefrontColorCards } from "@/lib/api";

const labels: Record<string, string> = { male: "Мужское", female: "Женское", unisex: "Унисекс" };
const split = (value: string | null) => value?.split(",").filter(Boolean) ?? [];
export default function ShopListing({ category }: { category?: string }) {
  const router = useRouter(); const pathname = usePathname(); const current = useSearchParams();
  const [listing, setListing] = useState<StorefrontListing | null>(null); const [categories, setCategories] = useState<ApiCategory[]>([]); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(true);
  const params = useMemo(() => new URLSearchParams(current.toString()), [current]);
  const selectedCategory = category ?? current.get("category") ?? undefined;
  const listingKey = `${pathname}${params.size ? `?${params}` : ""}`;
  const restoredKey = useRef<string | null>(null);
  useEffect(() => { if (selectedCategory) params.set("category", selectedCategory); else params.delete("category"); let live = true; setLoading(true); Promise.all([getStorefrontListing(params), getStorefrontCategories()]).then(([data, all]) => { if (live) { setListing(data); setCategories(all); } }).catch(() => { if (live) setListing(null); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [selectedCategory, params]);
  useEffect(() => {
    const saveScroll = () => sessionStorage.setItem(`siren-shop-scroll:${listingKey}`, String(window.scrollY));
    saveScroll(); window.addEventListener("scroll", saveScroll, { passive: true });
    return () => { saveScroll(); window.removeEventListener("scroll", saveScroll); };
  }, [listingKey]);
  useEffect(() => {
    if (loading || restoredKey.current === listingKey) return;
    restoredKey.current = listingKey;
    const saved = Number(sessionStorage.getItem(`siren-shop-scroll:${listingKey}`));
    if (Number.isFinite(saved) && saved > 0) requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: "auto" }));
  }, [loading, listingKey]);
  const navigate = (next: URLSearchParams) => router.push(`${category ? "/shop" : pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  const selectCategory = (nextCategory?: string) => { const next = new URLSearchParams(current.toString()); if (nextCategory) next.set("category", nextCategory); else next.delete("category"); navigate(next); };
  const update = (key: string, value?: string) => { const next = new URLSearchParams(current.toString()); if (selectedCategory) next.set("category", selectedCategory); if (!value) next.delete(key); else next.set(key, value); navigate(next); };
  const toggle = (key: string, value: string) => { const items = split(current.get(key)); update(key, items.includes(value) ? items.filter((item) => item !== value).join(",") : [...items, value].join(",")); };
  const clear = () => navigate(selectedCategory ? new URLSearchParams({ category: selectedCategory }) : new URLSearchParams());
  const cards = listing ? toStorefrontColorCards(listing.products) : [];
  const title = selectedCategory ? (categories.find((item) => item.slug === selectedCategory)?.name || selectedCategory) : "МАГАЗИН";
  const active = ["gender", "colors", "sizes", "minPrice", "maxPrice"].flatMap((key) => split(current.get(key)).map((value) => ({ key, value })));
  return <><FixedTop /><main className="siren-shop-listing"><header className="siren-shop-heading"><div><p>МАГАЗИН / {selectedCategory ? "КАТЕГОРИЯ" : "ВСЕ ТОВАРЫ"}</p><h1>{title}</h1></div></header><nav className="siren-category-tabs" aria-label="Категории"><button className={!selectedCategory ? "is-active" : ""} onClick={() => selectCategory()}>ВСЕ ТОВАРЫ</button>{categories.map((item) => <button key={item.id} className={selectedCategory === item.slug ? "is-active" : ""} onClick={() => selectCategory(item.slug)}>{item.name}</button>)}</nav><div className="siren-listing-toolbar"><b>{loading ? "…" : listing?.total ?? 0} ТОВАРОВ</b><button type="button" onClick={() => setOpen(true)}>ФИЛЬТР И СОРТИРОВКА</button></div>{active.length > 0 && <div className="siren-filter-chips">{active.map(({ key, value }) => <button key={`${key}-${value}`} onClick={() => toggle(key, value)}>{labels[value] || value} ×</button>)}<button onClick={clear}>СБРОСИТЬ ВСЕ</button></div>}<section className={`siren-shop-grid${loading ? " is-loading" : ""}`}>{loading && Array.from({ length: 8 }, (_, index) => <div className="siren-product-skeleton" key={`skeleton-${index}`} aria-hidden="true"><i /><b /><span /><em /></div>)}{!loading && cards.map((product, index) => <ProductCard key={product.cardId ?? `${product.id}-${index}`} product={product} />)}{!loading && !cards.length && <div className="siren-shop-empty"><b>ТОВАРЫ НЕ НАЙДЕНЫ.</b><span>Попробуйте изменить условия фильтра.</span><button onClick={clear}>СБРОСИТЬ ФИЛЬТРЫ</button></div>}</section></main>{open && <FilterDrawer listing={listing} categories={categories} current={current} lockedCategory={selectedCategory} onClose={() => setOpen(false)} onUpdate={update} onToggle={toggle} onClear={clear} />}<Footer /></>;
}
function FilterDrawer({ listing, categories, current, lockedCategory, onClose, onUpdate, onToggle, onClear }: { listing: StorefrontListing | null; categories: ApiCategory[]; current: ReturnType<typeof useSearchParams>; lockedCategory?: string; onClose: () => void; onUpdate: (key: string, value?: string) => void; onToggle: (key: string, value: string) => void; onClear: () => void }) {
  const [min, setMin] = useState(current.get("minPrice") || ""); const [max, setMax] = useState(current.get("maxPrice") || ""); const selected = (key: string, value: string) => split(current.get(key)).includes(value);
  const options = (title: string, key: string, facets: Array<{ value: string; count: number }>, swatch = false) => <section><h3>{title}</h3>{facets.map((item) => <label key={item.value}><input type="checkbox" checked={selected(key, item.value)} onChange={() => onToggle(key, item.value)} />{swatch && <i style={{ background: item.value }} />}<span>{labels[item.value] || item.value}</span><small>{item.count}</small></label>)}</section>;
  return <div className="siren-filter-backdrop" onMouseDown={onClose}><aside className="siren-filter-drawer" onMouseDown={(event) => event.stopPropagation()}><header><h2>ФИЛЬТР И СОРТИРОВКА</h2><button onClick={onClose}>×</button></header><section><h3>СОРТИРОВАТЬ</h3><select value={current.get("sort") || "recommended"} onChange={(event) => onUpdate("sort", event.target.value === "recommended" ? undefined : event.target.value)}><option value="recommended">Рекомендуем</option><option value="newest">Сначала новые</option><option value="price-asc">Цена: по возрастанию</option><option value="price-desc">Цена: по убыванию</option></select></section>{options("ПОЛ", "gender", listing?.facets.genders ?? [])}{!lockedCategory && <section><h3>КАТЕГОРИЯ</h3>{categories.map((item) => <label key={item.id}><input type="radio" name="category" checked={current.get("category") === item.slug} onChange={() => onUpdate("category", item.slug)} /><span>{item.name}</span></label>)}</section>}{options("ЦВЕТ", "colors", listing?.facets.colors ?? [], true)}{options("РАЗМЕР", "sizes", listing?.facets.sizes ?? [])}<section><h3>ЦЕНА · {listing?.facets.price.min.toLocaleString()}–{listing?.facets.price.max.toLocaleString()} UZS</h3><div className="siren-price-inputs"><input inputMode="numeric" placeholder="ОТ" value={min} onChange={(event) => setMin(event.target.value)} /><input inputMode="numeric" placeholder="ДО" value={max} onChange={(event) => setMax(event.target.value)} /></div><button className="siren-price-apply" onClick={() => { onUpdate("minPrice", min); onUpdate("maxPrice", max); }}>ПРИМЕНИТЬ ЦЕНУ</button></section><footer><button onClick={onClear}>СБРОСИТЬ</button><button onClick={onClose}>ПОКАЗАТЬ {listing?.total ?? 0} ТОВАРОВ</button></footer></aside></div>;
}

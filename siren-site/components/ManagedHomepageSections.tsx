import { formatStorePrice, type ApiCustomSection, type ApiProduct } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/data";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const asset = (url: string) => url.startsWith("http") || !url.startsWith("/uploads/") ? url : `${apiOrigin}${url}`;

type Section = ApiCustomSection & { layoutType: "collection" | "promo" | "tactical" };

export default function ManagedHomepageSections({ sections, products }: { sections: Section[]; products: ApiProduct[] }) {
  return <>{sections.filter((section) => section.isActive !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((section) => {
    if (section.layoutType === "collection") return <CollectionSection key={section.id} section={section} products={products} />;
    if (section.layoutType === "promo") return <PromoSection key={section.id} section={section} />;
    return <TacticalSection key={section.id} section={section} products={products} />;
  })}</>;
}

function sectionProducts(section: Section, products: ApiProduct[], device: "desktop" | "mobile") {
  const skus = device === "mobile" ? (section.mobileCartItems?.length ? section.mobileCartItems : section.cartItems) : (section.desktopCartItems?.length ? section.desktopCartItems : section.cartItems);
  const bySku = new Map(products.flatMap((product) => product.variants.map((variant) => [variant.sku, { product, variant }] as const)));
  const selected = [...new Set(skus ?? [])].map((sku) => bySku.get(sku)).filter((item): item is { product: ApiProduct; variant: ApiProduct["variants"][number] } => Boolean(item));
  // The three default layouts remain complete before the admin chooses SKU
  // values for the first time. Once SKUs are selected, only those products
  // are rendered.
  // With no SKU chosen yet, show the first variant from separate admin
  // products. This makes a newly saved layout useful immediately and avoids
  // filling its cart with several variants of the same product.
  return selected.length
    ? selected
    : products.flatMap((product) => product.variants.slice(0, 1).map((variant) => ({ product, variant }))).slice(0, 2);
}

function Card({ item }: { item: { product: ApiProduct; variant: ApiProduct["variants"][number] } }) {
  const { product, variant } = item;
  const colorImages = Array.isArray(variant.attributes?.images)
    ? variant.attributes.images.filter((image): image is string => typeof image === "string" && Boolean(image.trim()))
    : [];
  const cardProduct: Product = {
    id: product.slug,
    image: asset(colorImages[0] || product.media[0]?.url || ""),
    hoverImage: asset(colorImages[1] || product.media[1]?.url || ""),
    alt: product.title,
    title: product.title,
    color: (variant.color || variant.size || "").toUpperCase(),
    price: formatStorePrice(variant.price || product.price, product.currencyCode),
  };
  // Reuse the site's actual product-card component so cards saved from admin
  // retain favourites, links, image framing and the same responsive layout.
  return <ProductCard product={cardProduct} small />;
}

function Copy({ section, mobile = false }: { section: Section; mobile?: boolean }) {
  const name = mobile ? section.mobileName || section.desktopName || section.name : section.desktopName || section.name;
  const label = mobile ? section.mobileLinkLabel || section.desktopLinkLabel || section.linkLabel : section.desktopLinkLabel || section.linkLabel;
  return <span className="banner-copy banner-copy--dark"><span>{name}</span><b>{label || "ПЕРЕЙТИ"}</b></span>;
}

function CollectionSection({ section, products }: { section: Section; products: ApiProduct[] }) {
  const desktop = sectionProducts(section, products, "desktop");
  const mobile = sectionProducts(section, products, "mobile");
  return <section className="managed-section managed-section--collection"><div className="collection"><div className="collection-side collection-side--desktop">{desktop.map((item) => <Card key={item.variant.id} item={item} />)}</div><a className="collection-banner" href={section.desktopLink || section.targetUrl || "#"}><picture><source media="(max-width:760px)" srcSet={asset(section.mobileImageUrl || section.desktopImageUrl)} /><img src={asset(section.desktopImageUrl)} alt="" /></picture><Copy section={section} /></a><div className="collection-side collection-side--mobile">{mobile.map((item) => <Card key={item.variant.id} item={item} />)}</div></div></section>;
}

function PromoSection({ section }: { section: Section }) {
  const slots = section.bannerItems?.length ? section.bannerItems : [{ id: section.id, desktopImageUrl: section.desktopImageUrl, mobileImageUrl: section.mobileImageUrl, targetUrl: section.targetUrl, linkLabel: section.linkLabel, desktopName: section.desktopName, mobileName: section.mobileName, desktopLinkLabel: section.desktopLinkLabel, mobileLinkLabel: section.mobileLinkLabel }];
  return <section className="managed-section managed-section--promo"><div className="promo">{slots.slice(0, 2).map((slot, index) => <a key={slot.id} className={`promo-card ${index === 0 ? "promo-card--large" : "promo-card--small"}`} href={slot.desktopLink || slot.targetUrl || "#"}><picture><source media="(max-width:760px)" srcSet={asset(slot.mobileImageUrl || slot.desktopImageUrl)} /><img src={asset(slot.desktopImageUrl)} alt="" /></picture><span className={`banner-copy banner-copy--dark${index === 1 ? " banner-copy--right" : ""}`}><span>{slot.desktopName || section.desktopName || section.name}</span><b>{slot.desktopLinkLabel || slot.linkLabel || "ПЕРЕЙТИ"}</b></span></a>)}</div></section>;
}

function TacticalSection({ section, products }: { section: Section; products: ApiProduct[] }) {
  const desktop = sectionProducts(section, products, "desktop");
  const mobile = sectionProducts(section, products, "mobile");
  return <section className="managed-section managed-section--tactical"><div className="tactical"><a className="tactical-banner" href={section.desktopLink || section.targetUrl || "#"}><picture><source media="(max-width:760px)" srcSet={asset(section.mobileImageUrl || section.desktopImageUrl)} /><img src={asset(section.desktopImageUrl)} alt="" /></picture><span className="tactical-banner-copy"><span>{section.desktopName || section.name}</span><b>{section.desktopLinkLabel || section.linkLabel || "ПЕРЕЙТИ"}</b></span></a><div className="tactical-products tactical-products--desktop">{desktop.map((item) => <Card key={item.variant.id} item={item} />)}</div><div className="tactical-products tactical-products--mobile">{mobile.map((item) => <Card key={item.variant.id} item={item} />)}</div></div></section>;
}

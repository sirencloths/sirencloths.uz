import { formatStorePrice, type ApiCustomSection, type ApiProduct } from "@/lib/api";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const imageUrl = (value: string) =>
  value.startsWith("http") || !value.startsWith("/uploads/")
    ? value
    : `${apiOrigin}${value}`;

export default function CustomSections({
  sections,
  placement,
  products,
}: {
  sections: ApiCustomSection[];
  placement: number;
  products: ApiProduct[];
}) {
  const visible = sections
    .filter((section) => section.isActive !== false && section.placement === placement)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  if (!visible.length) return null;

  return (
    <div className="custom-sections">
      {visible.map((section) => {
        if (section.sectionKind === "banner" && section.desktopBannerTemplate && section.mobileBannerTemplate) {
          return <BannerOnlySection key={section.id} section={section} />;
        }
        const desktopCartPosition = section.desktopCartPosition ?? "right";
        const mobileCartPosition = section.mobileCartPosition ?? "below";
        // Older saved sections may not yet have mobileTemplate. A section
        // marked as swipe must still receive the SVG 78 mobile layout.
        // Swipe is a layout decision, not merely a visual preference.  The
        // former editor stored four mobile SKU slots for the swipe template,
        // but some existing records still carry the old `stack-*` name.  Four
        // or more mobile cards therefore unambiguously means a swipe rail.
        const mobileSwipe = section.cartSwipe || section.mobileTemplate === "swipe-below" || (section.mobileCartItems?.length ?? 0) > 2;
        const mobileTemplate = mobileSwipe ? "swipe-below" : (section.mobileTemplate ?? "stack-top");
        const desktopImage = imageUrl(section.desktopImageUrl);
        const mobileImage = imageUrl(section.mobileImageUrl || section.desktopImageUrl);
        const desktopCart = section.cartEnabled ? (
          <SectionCart
            section={section}
            products={products}
            skus={section.desktopCartItems?.length ? section.desktopCartItems : section.cartItems}
            device="desktop"
          />
        ) : null;
        const mobileCart = section.cartEnabled ? (
          <SectionCart
            section={section}
            products={products}
            skus={section.mobileCartItems?.length ? section.mobileCartItems : section.cartItems}
            device="mobile"
            forceSwipe={mobileSwipe}
          />
        ) : null;
        return (
          <section
            className={`custom-section custom-section--desktop-${section.desktopBannerAlign ?? "center"} custom-section--mobile-${section.mobileBannerAlign === "center" ? "center" : "full"} custom-section--desktop-cart-${desktopCartPosition} custom-section--mobile-cart-${mobileCartPosition} custom-section--mobile-template-${mobileTemplate}`}
            key={section.id}
          >
            <div className="custom-section-desktop-layout">
              {desktopCartPosition === "left" && desktopCart}
              <a
                className={`custom-section-banner custom-section-text--${section.desktopTextPosition ?? "bottom-left"}`}
                href={section.targetUrl || "#"}
                style={{ borderRadius: section.borderRadius ?? 0 }}
              >
                <picture>
                  <source media="(max-width: 760px)" srcSet={mobileImage} />
                  <img src={desktopImage} alt="" />
                </picture>
                {section.shadow !== false && <span className="custom-section-shade" />}
                <span className="custom-section-copy custom-section-copy--desktop"><b>{section.desktopName || section.name}</b><small>{section.desktopLinkLabel || section.linkLabel || "ПЕРЕЙТИ"}</small></span>
                <span className="custom-section-copy custom-section-copy--mobile"><b>{section.mobileName || section.desktopName || section.name}</b><small>{section.mobileLinkLabel || section.desktopLinkLabel || section.linkLabel || "ПЕРЕЙТИ"}</small></span>
              </a>
              {desktopCartPosition === "right" && desktopCart}
              {desktopCartPosition === "below" && desktopCart}
              {mobileCart}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BannerOnlySection({ section }: { section: ApiCustomSection }) {
  const desktopTemplate = section.desktopBannerTemplate ?? "one-max";
  const mobileTemplate = section.mobileBannerTemplate ?? "one-full";
  const desktopCount = desktopTemplate === "one-max" ? 1 : 2;
  const mobileCount = mobileTemplate === "one-full" ? 1 : 2;
  const count = Math.max(desktopCount, mobileCount);
  const fallback = {
    id: `${section.id}-fallback`,
    desktopImageUrl: section.desktopImageUrl,
    mobileImageUrl: section.mobileImageUrl || section.desktopImageUrl,
    targetUrl: section.targetUrl,
    linkLabel: section.linkLabel,
    desktopName: section.desktopName || section.name,
    mobileName: section.mobileName || section.desktopName || section.name,
    desktopLink: section.desktopLink || section.targetUrl,
    mobileLink: section.mobileLink || section.desktopLink || section.targetUrl,
    desktopLinkLabel: section.desktopLinkLabel || section.linkLabel,
    mobileLinkLabel: section.mobileLinkLabel || section.desktopLinkLabel || section.linkLabel,
  };
  const source = section.bannerItems?.length ? section.bannerItems : [fallback];
  const items = Array.from({ length: count }, (_, index) => source[index] ?? source[0] ?? fallback);
  return <section className={`custom-banner-only custom-banner-only--desktop-${desktopTemplate} custom-banner-only--mobile-${mobileTemplate}`}>
    <div className="custom-banner-only-layout">
      {items.map((item, index) => <a className="custom-banner-only-slot" href={item.desktopLink || item.targetUrl || section.desktopLink || section.targetUrl || "#"} key={`${item.id}-${index}`}>
        <picture><source media="(max-width: 760px)" srcSet={imageUrl(item.mobileImageUrl || section.mobileImageUrl || section.desktopImageUrl)} /><img src={imageUrl(item.desktopImageUrl || section.desktopImageUrl)} alt="" /></picture>
        {section.shadow !== false && <span className="custom-section-shade" />}
        <span className="custom-banner-only-copy custom-banner-only-copy--desktop"><b>{item.desktopName || section.desktopName || section.name}</b><small>{item.desktopLinkLabel || item.linkLabel || section.desktopLinkLabel || section.linkLabel || "ПЕРЕЙТИ"}</small></span>
        <span className="custom-banner-only-copy custom-banner-only-copy--mobile"><b>{item.mobileName || item.desktopName || section.mobileName || section.desktopName || section.name}</b><small>{item.mobileLinkLabel || item.desktopLinkLabel || item.linkLabel || section.mobileLinkLabel || section.desktopLinkLabel || section.linkLabel || "ПЕРЕЙТИ"}</small></span>
      </a>)}
    </div>
  </section>;
}

function SectionCart({
  section,
  products,
  skus,
  device,
  forceSwipe = false,
}: {
  section: ApiCustomSection;
  products: ApiProduct[];
  skus: string[];
  device: "desktop" | "mobile";
  forceSwipe?: boolean;
}) {
  const catalog = new Map(products.flatMap((product) => product.variants.map((variant) => [variant.sku, { product, variant }] as const)));
  // A cart slot is a product reference, not a quantity.  Old sections may
  // contain the same SKU in several slots; render it once instead of showing
  // duplicate product cards to visitors.
  const uniqueSkus = [...new Set(skus.map((sku) => sku.trim()).filter(Boolean))];
  const items = uniqueSkus.map((sku) => catalog.get(sku)).filter((item): item is { product: ApiProduct; variant: ApiProduct["variants"][number] } => Boolean(item));
  if (!items.length) return null;
  return (
    <div
      className={`custom-section-cart custom-section-cart--${device}${(section.cartSwipe || forceSwipe || (device === "mobile" && section.mobileTemplate === "swipe-below")) ? " is-swipe" : ""}${section.cartLayout === "vertical" ? " is-vertical" : ""}`}
      aria-label="Custom section mahsulotlari"
    >
      {items.map(({ product, variant }, index) => (
        <a className="product-card custom-section-product-card" href={`/products/${product.slug}`} key={`${device}-${variant.id}-${index}`}>
          <span className="product-image"><img className="custom-section-product-image--primary" src={imageUrl(product.media[0]?.url ?? "")} alt="" />{product.media[1]?.url && <img className="custom-section-product-image--hover" src={imageUrl(product.media[1].url)} alt="" aria-hidden="true" />}<span className="like-btn"><img src="/icons/heart.svg" alt="" /></span></span>
          <h2>{product.title}</h2>
          <p>{(variant.color || variant.size || "").toUpperCase()}</p>
          <strong>{formatStorePrice(product.price, product.currencyCode)}</strong>
        </a>
      ))}
    </div>
  );
}

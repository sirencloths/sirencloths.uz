"use client";

import { CSSProperties, ElementType, FormEvent, Fragment, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Link from "next/link";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  Box,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Crown,
  FileText,
  GripVertical,
  LayoutDashboard,
  LockKeyhole,
  MoreVertical,
  Music2,
  Monitor,
  Package,
  Palette,
  Plus,
  Printer,
  RefreshCw,
  Download,
  Eye,
  Search,
  Settings2,
  SlidersHorizontal,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Tags,
  Trash2,
  Truck,
  Upload,
  Users,
} from "lucide-react";
import { isSpotifyUrl } from "@/lib/spotify";

declare global { interface HTMLElement { readonly cells: HTMLCollectionOf<HTMLTableCellElement>; } }
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsContent } from "./ui/tabs";
import PartnerManager from "./PartnerManager";
import AdminShell from "./tailadmin/AdminShell";
import EcommerceMetrics from "./tailadmin/EcommerceMetrics";
import StatisticsChart from "./tailadmin/StatisticsChart";
import MonthlySalesChart from "./tailadmin/MonthlySalesChart";
import TailAdminGridIcon from "./tailadmin/icons/GridIcon";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./tailadmin/ui/table";
import { OfflineCashier, OfflineInventory, OfflineReports, OfflineSales } from "./OfflineShopWorkspace";

const API = process.env.NEXT_PUBLIC_API_URL ?? (typeof window === "undefined" ? "http://localhost:4000/api" : `${window.location.protocol}//${window.location.hostname}:4000/api`);
type Tab =
  | "dashboard"
  | "products"
  | "catalog"
  | "orders"
  | "delivery"
  | "customers"
  | "discounts"
  | "partners"
  | "finance"
  | "currencies"
  | "analytics"
  | "content"
  | "notifications"
  | "pages"
  | "team"
  | "audit"
  | "settings"
  | "offline_cashier"
  | "offline_inventory"
  | "offline_sales"
  | "offline_reports";
type ContentSubsection = "main-banner" | "custom-pages" | "lookbook" | "blog" | "records" | "collections";
type StoreNotification = { id: string; kind?: "general" | "blog" | "discounts" | "products"; title: Record<string, string>; text: Record<string, string>; imageUrl?: string; href?: string; createdAt: string; isActive?: boolean; clicks?: number; clickVisitorIds?: string[] };
type Variant = {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  color?: string | null;
  size?: string | null;
  price?: string | null;
  inventoryQuantity: number;
  offlineInventoryQuantity?: number;
  totalInventoryAdded?: number;
  isActive: boolean;
  attributes?: Record<string, unknown>;
};
type InventoryTransfer = {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  direction: "to_offline" | "to_online";
  fromLocation: string;
  toLocation: string;
  actorId?: string | null;
  note?: string | null;
  createdAt: string;
  product?: Pick<Product, "id" | "title" | "slug">;
  variant?: Variant;
};
type CustomerRecord = {
  id: string; email?: string | null; phone?: string | null; firstName: string; lastName: string;
  createdAt: string; lastLoginAt?: string | null; region?: string | null; isActive?: boolean;
  emailVerifiedAt?: string | null; welcomeDiscountEligible?: boolean; welcomeDiscountPercent?: number;
  totalOrders: number; totalSpent: number;
};
type CustomerDetail = CustomerRecord & {
  paidOrders: number; averageOrder: number; lastOrderAt?: string | null;
  addresses: Array<{ id: string; country?: string; city?: string; line1?: string; line2?: string; postalCode?: string; isDefault?: boolean }>;
  orders: Array<{ id: string; orderNumber: string; status: string; paymentStatus: string; fulfillmentStatus?: string; totalAmount: string; currencyCode?: string; paymentMethod?: string | null; shippingAddress?: { country?: string; city?: string; address?: string }; note?: string | null; createdAt: string; items: Array<{ title: string; sku?: string | null; quantity: number; unitPrice: string }> }>;
};
type Product = {
  id: string;
  createdAt?: string;
  title: string;
  slug: string;
  description: string;
  status: "draft" | "active" | "archived";
  price: string;
  categoryId?: string | null;
  gender?: "male" | "female" | "unisex";
  currencyCode: string;
  media: Array<{ url: string }>;
  variants: Variant[];
  soldQuantity?: number;
  metadata?: {
    baseInventoryQuantity?: number;
    views?: number;
    sizeGuideImageUrl?: string;
    article?: string;
    fiscal?: { ikpuCode?: string; packageCode?: string; unitCode?: string; vatPercent?: number };
    translations?: {
      titleUz?: string;
      titleRu?: string;
      titleEn?: string;
      descriptionUz?: string;
      descriptionRu?: string;
      descriptionEn?: string;
    };
  };
};
type Taxonomy = { id: string; name: string; slug: string; isVisible: boolean; productCount?: number };
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus?: string;
  totalAmount: string;
  subtotalAmount?: string;
  discountAmount?: string;
  shippingAmount?: string;
  paymentMethod?: string | null; shippingAddress?: { country?: string; city?: string; address?: string }; note?: string | null;
  customer?: { id?: string; email?: string; firstName?: string; lastName?: string; phone?: string } | null;
  items?: Array<{ titleSnapshot: string; skuSnapshot?: string | null; quantity: number; unitPrice: string; imageUrl?: string | null }>;
  createdAt: string;
};
type Banner = {
  id: string;
  title: string;
  imageUrl: string;
  mobileImageUrl?: string | null;
  targetUrl?: string | null;
  linkLabel: string;
  textShadow: boolean;
  position: number;
  isActive: boolean;
};
type MusicRecord = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  audioUrl: string;
  coverImageUrl?: string | null;
  position: number;
  isActive: boolean;
};
type LookbookEntry = {
  id: string;
  title: string;
  imageUrl: string;
  caption?: string | null;
  targetUrl?: string | null;
  position: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};
type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  seo?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
type CmsPage = {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
};
type NavigationItem = {
  id: string;
  href: string;
  label: string;
  translationKey?: string;
  isActive: boolean;
  isBuiltIn?: boolean;
  pageId?: string;
};
const defaultNavigation: NavigationItem[] = [
  { id: "shop", href: "/shop", label: "shop", translationKey: "shop", isActive: true, isBuiltIn: true },
  { id: "collections", href: "/collections", label: "collections", translationKey: "collections", isActive: true, isBuiltIn: true },
  { id: "lookbook", href: "/lookbook", label: "lookbook", translationKey: "lookbook", isActive: true, isBuiltIn: true },
  { id: "blog", href: "/blog", label: "blog", translationKey: "blog", isActive: true, isBuiltIn: true },
];
type PageBannerDraft = {
  id: string;
  name: string;
  isActive?: boolean;
  isDuplicate?: boolean;
  layoutType?: "collection" | "promo" | "tactical";
  linkLabel: string;
  targetUrl: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  shadow: boolean;
  desktopHeight: number;
  mobileHeight: number;
  borderRadius: number;
  cartEnabled: boolean;
  cartItems: string[];
  cartPosition: "left" | "right" | "below";
  cartSwipe: boolean;
  cartLayout: "horizontal" | "vertical";
  desktopTextPosition: BannerTextPosition;
  mobileTextPosition: BannerTextPosition;
  desktopBannerAlign: "left" | "center" | "right";
  mobileBannerAlign: "full" | "center";
  desktopCartPosition: "left" | "right" | "below";
  mobileCartPosition: "left" | "right" | "below";
  placement: number;
  sortOrder?: number;
  desktopTemplate?: DesktopSectionTemplate;
  mobileTemplate?: MobileSectionTemplate;
  sectionKind?: "banner" | "banner-cart";
  desktopBannerTemplate?: BannerOnlyDesktopTemplate;
  mobileBannerTemplate?: BannerOnlyMobileTemplate;
  bannerItems?: Array<{ id: string; desktopImageUrl: string; mobileImageUrl: string; targetUrl: string; linkLabel: string; desktopName?: string; mobileName?: string; desktopLink?: string; mobileLink?: string; desktopLinkLabel?: string; mobileLinkLabel?: string; desktopShadow?: boolean; mobileShadow?: boolean }>;
  desktopName?: string;
  mobileName?: string;
  desktopLink?: string;
  mobileLink?: string;
  desktopLinkLabel?: string;
  mobileLinkLabel?: string;
  desktopShadow?: boolean;
  mobileShadow?: boolean;
  desktopCartItems?: string[];
  mobileCartItems?: string[];
};
type BannerTextPosition = "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";
type DesktopSectionTemplate = "carts-right" | "carts-left" | "carts-below";
type MobileSectionTemplate = "stack-top" | "stack-middle" | "swipe-below";
type BannerOnlyDesktopTemplate = "two-main-small" | "two-small-main" | "two-equal" | "one-max";
type BannerOnlyMobileTemplate = "one-full-one-max" | "one-max-one-full" | "two-max" | "one-full";
type SectionBannerSlot = { id: string; desktopImageUrl: string; mobileImageUrl: string; targetUrl: string; linkLabel: string; desktopName?: string; mobileName?: string; desktopLink?: string; mobileLink?: string; desktopLinkLabel?: string; mobileLinkLabel?: string; desktopShadow?: boolean; mobileShadow?: boolean };
type SiteSetting = { id: string; key: string; value: Record<string, unknown> };
const blankPageBanner = (): PageBannerDraft => ({
  id: `page-banner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "Yangi page banner",
  isActive: true,
  linkLabel: "ПЕРЕЙТИ",
  targetUrl: "",
  desktopImageUrl: "",
  mobileImageUrl: "",
  shadow: true,
  desktopHeight: 420,
  mobileHeight: 280,
  borderRadius: 0,
  cartEnabled: false,
  cartItems: [],
  cartPosition: "right",
  cartSwipe: false,
  cartLayout: "horizontal",
  desktopTextPosition: "bottom-left",
  mobileTextPosition: "bottom-left",
  desktopBannerAlign: "center",
  mobileBannerAlign: "full",
  desktopCartPosition: "right",
  mobileCartPosition: "below",
  placement: 2,
  sortOrder: 0,
  desktopTemplate: "carts-right",
  mobileTemplate: "stack-top",
  sectionKind: "banner",
  bannerItems: [],
  desktopName: "",
  mobileName: "",
  desktopLink: "",
  mobileLink: "",
  desktopLinkLabel: "",
  mobileLinkLabel: "",
  desktopShadow: true,
  mobileShadow: true,
  desktopCartItems: [],
  mobileCartItems: [],
});
const defaultHomepageSections = (): PageBannerDraft[] => [
  {
    ...blankPageBanner(),
    id: "default-collection",
    name: "Collection",
    layoutType: "collection",
    sectionKind: "banner-cart",
    desktopCartPosition: "left",
    mobileTemplate: "stack-middle",
    desktopImageUrl: "/images/collection-banner.jpg",
    mobileImageUrl: "/images/collection-banner.jpg",
    desktopName: "Новая коллекция",
    mobileName: "Новая коллекция",
    desktopLinkLabel: "ПЕРЕЙТИ",
    mobileLinkLabel: "ПЕРЕЙТИ",
    sortOrder: 0,
  },
  {
    ...blankPageBanner(),
    id: "default-promo",
    name: "Promo",
    layoutType: "promo",
    sectionKind: "banner",
    desktopBannerTemplate: "two-main-small",
    mobileBannerTemplate: "one-full-one-max",
    desktopImageUrl: "/images/large-banner.jpg",
    mobileImageUrl: "/images/large-banner.jpg",
    bannerItems: [
      { id: "promo-large", desktopImageUrl: "/images/large-banner.jpg", mobileImageUrl: "/images/large-banner.jpg", targetUrl: "#", linkLabel: "ПЕРЕЙТИ", desktopName: "Аксессуары", mobileName: "Аксессуары", desktopLinkLabel: "ПЕРЕЙТИ", mobileLinkLabel: "ПЕРЕЙТИ" },
      { id: "promo-small", desktopImageUrl: "/images/small-banner.jpg", mobileImageUrl: "/images/small-banner.jpg", targetUrl: "#", linkLabel: "ПЕРЕЙТИ", desktopName: "Мерч", mobileName: "Мерч", desktopLinkLabel: "ПЕРЕЙТИ", mobileLinkLabel: "ПЕРЕЙТИ" },
    ],
    sortOrder: 1,
  },
  {
    ...blankPageBanner(),
    id: "default-tactical",
    name: "Tactical",
    layoutType: "tactical",
    sectionKind: "banner-cart",
    desktopCartPosition: "right",
    mobileTemplate: "stack-middle",
    desktopImageUrl: "/images/banner.jpg",
    mobileImageUrl: "/images/banner.jpg",
    desktopName: "Тактичные",
    mobileName: "Тактичные",
    desktopLinkLabel: "ПЕРЕЙТИ",
    mobileLinkLabel: "ПЕРЕЙТИ",
    sortOrder: 2,
  },
];
const blankProduct = () => ({
  title: "",
  titleUz: "",
  titleRu: "",
  titleEn: "",
  article: "",
  slug: "",
  description: "",
  descriptionUz: "",
  descriptionRu: "",
  descriptionEn: "",
  status: "draft" as Product["status"],
  price: "",
  currencyCode: "UZS",
  categoryId: "",
  gender: "unisex" as "male" | "female" | "unisex",
  inventoryQuantity: 0,
  sizeGuideImageUrl: "",
  ikpuCode: "",
  packageCode: "",
  unitCode: "",
  vatPercent: 0,
});
const newCharacteristicId = () => `characteristic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const blankVariant = () => ({
  sourceId: "",
  characteristicId: newCharacteristicId(),
  sku: "",
  name: "",
  color: "",
  size: "",
  price: "",
  costPrice: "",
  expensePrice: "",
  inventoryQuantity: 0,
  isActive: true,
  imageUrl: "",
  extraImageUrls: [] as string[],
});
const variantDraftFrom = (source: Variant) => {
  const images = Array.isArray(source.attributes?.images)
    ? source.attributes.images.filter((image): image is string => typeof image === "string")
    : [];
  const colorGroup = source.color?.trim().toLocaleLowerCase("uz-UZ");
  return {
    ...blankVariant(),
    sourceId: source.id,
    // A variant is a colour. Sizes live inside that colour group and must
    // therefore share its identifier (including on the edit screen).
    characteristicId: colorGroup ? `color-${colorGroup}` : `existing-${source.id}`,
    sku: source.sku,
    name: source.name,
    color: source.color ?? "",
    size: source.size ?? "",
    price: source.price ?? "",
    costPrice: String(source.attributes?.costPrice ?? ""),
    expensePrice: String(source.attributes?.expensePrice ?? ""),
    inventoryQuantity: source.inventoryQuantity,
    isActive: source.isActive,
    imageUrl: images[0] ?? "",
    extraImageUrls: images.slice(1),
  };
};
const normalizedArticle = (value: string) => value.trim().toLocaleLowerCase("uz-UZ");
const articlePart = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
const generatedVariantSku = (article: string, color: string, size: string) => {
  const parts = [articlePart(article), articlePart(color), articlePart(size)].filter(Boolean);
  return parts.length >= 2 ? parts.join("-") : "";
};
const blankTaxonomy = () => ({ name: "", slug: "", isVisible: true });
async function api<T>(path: string, token: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const r = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });
  const body = await r.json().catch(() => ({}));
  if (r.status === 401) {
    // A backend restart or an expired JWT used to leave the admin on a broken
    // editor screen.  Clear the stale token and let the console show login
    // again, before reporting the reason to the current action.
    if (typeof window !== "undefined") {
      localStorage.removeItem("siren-admin-token");
      window.dispatchEvent(new Event("siren-admin-unauthorized"));
    }
    throw new Error("Sessiya tugadi. Qayta kiring.");
  }
  if (!r.ok)
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join(", ")
        : (body.message ?? "So‘rov bajarilmadi"),
    );
  return body as T;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ui-field grid gap-1.5">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}
type FiscalIkpuOption = { code: string; name: string; category: string };
type FiscalPackage = { code: string; label: string; unitCode: string; unitName: string };
type FiscalFieldsValue = { ikpuCode: string; packageCode: string; unitCode: string; vatPercent: number };
function FiscalCatalogPicker({ token, categoryName, productTitle, value, onChange }: { token: string; categoryName: string; productTitle: string; value: FiscalFieldsValue; onChange: (next: FiscalFieldsValue) => void }) {
  const suggestedQuery = [categoryName, productTitle].filter(Boolean).join(' ').trim();
  const [query, setQuery] = useState(suggestedQuery);
  const [options, setOptions] = useState<FiscalIkpuOption[]>([]);
  const [packages, setPackages] = useState<FiscalPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setQuery(suggestedQuery); }, [suggestedQuery]);
  const find = async () => {
    if (query.trim().length < 2) { setMessage('Qidirish uchun kamida 2 ta belgi yozing.'); return; }
    setLoading(true); setMessage('');
    try {
      const result = await api<FiscalIkpuOption[]>(`/admin/catalog/fiscal/ikpu?query=${encodeURIComponent(query.trim())}`, token);
      setOptions(result);
      setMessage(result.length ? `${result.length} ta rasmiy IKPU topildi.` : 'Mos IKPU topilmadi. Mahsulot turini aniqroq yozing.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'IKPU katalogidan qidirib bo‘lmadi.'); }
    finally { setLoading(false); }
  };
  const loadPackages = async (code: string) => {
    if (!code) { setPackages([]); return; }
    setLoading(true); setMessage('');
    try {
      const result = await api<FiscalIkpuOption & { packages: FiscalPackage[] }>(`/admin/catalog/fiscal/ikpu/${encodeURIComponent(code)}`, token);
      setPackages(result.packages);
      setOptions((current) => current.some((item) => item.code === result.code) ? current : [{ code: result.code, name: result.name, category: result.category }, ...current]);
      if (!result.packages.length) setMessage('Bu IKPU uchun rasmiy qadoq kodi topilmadi.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Qadoq kodlarini olib bo‘lmadi.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (value.ikpuCode) void loadPackages(value.ikpuCode); else setPackages([]); }, [value.ikpuCode]);
  return <>
    <div className="product-fiscal-search">
      <Field label="Mahsulot kategoriyasi"><div className="product-fiscal-category">{categoryName || 'Avval kategoriya tanlang'}</div></Field>
      <Field label="Rasmiy katalogdan IKPU qidirish"><div className="product-fiscal-search-input"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Masalan: futbolka, krossovka" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void find(); } }} /><Button type="button" size="sm" onClick={() => void find()} disabled={loading}>{loading ? 'Qidirilmoqda…' : 'Qidirish'}</Button></div></Field>
    </div>
    {message && <p className="product-fiscal-message" role="status">{message}</p>}
    <div className="ui-form-grid product-fiscal-grid">
      <Field label="IKPU kodi"><select value={value.ikpuCode} onChange={(event) => { const code = event.target.value; onChange({ ...value, ikpuCode: code, packageCode: '', unitCode: '' }); }}><option value="">Rasmiy katalogdan IKPU tanlang</option>{options.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}</select><small>Faqat rasmiy katalogdan tanlangan kod Payme fiskal chekiga yuboriladi.</small></Field>
      <Field label="Qadoq kodi"><select value={value.packageCode} disabled={!value.ikpuCode || loading} onChange={(event) => { const selected = packages.find((item) => item.code === event.target.value); onChange({ ...value, packageCode: event.target.value, unitCode: selected?.unitCode ?? '' }); }}><option value="">{value.ikpuCode ? 'Qadoq turini tanlang' : 'Avval IKPU tanlang'}</option>{packages.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}</select><small>Tanlangan IKPU uchun rasmiy katalogdagi qadoqlar.</small></Field>
      <Field label="O‘lchov birligi kodi"><input value={value.unitCode} readOnly placeholder="Qadoq tanlanganda to‘ladi" /><small>{packages.find((item) => item.code === value.packageCode)?.unitName || 'Katalogdagi o‘lchov birligi avtomatik to‘ladi.'}</small></Field>
      <Field label="QQS foizi"><select value={value.vatPercent} onChange={(event) => onChange({ ...value, vatPercent: Number(event.target.value) })}><option value={0}>QQSsiz — 0%</option><option value={12}>12%</option></select></Field>
    </div>
  </>;
}
const colorChoices = ["Black", "White", "Gray", "Blue", "Green", "Red", "Brown", "Pink"];
const namedColors = ["AliceBlue","AntiqueWhite","Aqua","Aquamarine","Azure","Beige","Bisque","Black","BlanchedAlmond","Blue","BlueViolet","Brown","BurlyWood","CadetBlue","Chartreuse","Chocolate","Coral","CornflowerBlue","Cornsilk","Crimson","Cyan","DarkBlue","DarkCyan","DarkGoldenRod","DarkGray","DarkGreen","DarkKhaki","DarkMagenta","DarkOliveGreen","DarkOrange","DarkOrchid","DarkRed","DarkSalmon","DarkSeaGreen","DarkSlateBlue","DarkSlateGray","DarkTurquoise","DarkViolet","DeepPink","DeepSkyBlue","DimGray","DodgerBlue","FireBrick","FloralWhite","ForestGreen","Fuchsia","Gainsboro","GhostWhite","Gold","GoldenRod","Gray","Green","GreenYellow","HoneyDew","HotPink","IndianRed","Indigo","Ivory","Khaki","Lavender","LavenderBlush","LawnGreen","LemonChiffon","LightBlue","LightCoral","LightCyan","LightGoldenRodYellow","LightGray","LightGreen","LightPink","LightSalmon","LightSeaGreen","LightSkyBlue","LightSlateGray","LightSteelBlue","LightYellow","Lime","LimeGreen","Linen","Magenta","Maroon","MediumAquaMarine","MediumBlue","MediumOrchid","MediumPurple","MediumSeaGreen","MediumSlateBlue","MediumSpringGreen","MediumTurquoise","MediumVioletRed","MidnightBlue","MintCream","MistyRose","Moccasin","NavajoWhite","Navy","OldLace","Olive","OliveDrab","Orange","OrangeRed","Orchid","PaleGoldenRod","PaleGreen","PaleTurquoise","PaleVioletRed","PapayaWhip","PeachPuff","Peru","Pink","Plum","PowderBlue","Purple","RebeccaPurple","Red","RosyBrown","RoyalBlue","SaddleBrown","Salmon","SandyBrown","SeaGreen","SeaShell","Sienna","Silver","SkyBlue","SlateBlue","SlateGray","Snow","SpringGreen","SteelBlue","Tan","Teal","Thistle","Tomato","Turquoise","Violet","Wheat","White","WhiteSmoke","Yellow","YellowGreen"];
const colorHex = (value: string) => (({ black: "#111111", white: "#ffffff", gray: "#8c8c8c", blue: "#1769aa", green: "#0b7a3a", red: "#b91c1c", brown: "#704214", pink: "#db5b82" }[value.toLowerCase()] ?? value.trim()) || "#d6d6d2");
function ManualColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <Field label="Inglizcha nomi"><div className="variant-color-field"><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Blue" /><button type="button" className="variant-color-trigger" aria-label="Rang tanlash" title="100+ rangdan tanlash" style={{ backgroundColor: colorHex(value) }} onClick={() => setOpen((current) => !current)} /></div>{open && <div className="manual-color-picker"><div className="manual-color-picker-head"><b>Rangni tanlang</b><span>{namedColors.length}+ rang</span></div><div className="manual-color-picker-grid">{namedColors.map((color) => <button type="button" key={color} title={color} aria-label={color} className={value.toLowerCase() === color.toLowerCase() ? "is-selected" : ""} style={{ backgroundColor: color }} onClick={() => { onChange(color); setOpen(false); }} />)}</div></div>}</Field>;
}
function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <Field label="Rang nomi"><div className="variant-color-field"><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Blue" /><button type="button" className="variant-color-trigger" aria-label="Rang tanlash" title="Rang tanlash" style={{ backgroundColor: colorHex(value) }} onClick={() => setOpen((current) => !current)} /></div>{open && <div className="variant-color-options">{colorChoices.map((color) => <button type="button" key={color} className={value.toLowerCase() === color.toLowerCase() ? "is-selected" : ""} onClick={() => { onChange(color); setOpen(false); }}><i style={{ backgroundColor: colorHex(color) }} />{color}</button>)}</div>}</Field>;
}
const amountOf = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const money = (value: number, currency: string) => `${new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(Math.max(0, value))} ${currency}`;
type FinanceRow = { sku: string; color?: string | null; price?: string | null; costPrice?: string; expensePrice?: string; attributes?: Record<string, unknown> };
type VariantDraft = ReturnType<typeof blankVariant>;
function VariantCharacteristics({ drafts, onUpdate, onAddColor, onAddSize, onRemoveSize }: {
  drafts: VariantDraft[];
  onUpdate: (index: number, updates: Partial<VariantDraft>) => void;
  onAddColor: () => void;
  onAddSize: (index: number) => void;
  onRemoveSize: (index: number) => void;
}) {
  const groups = drafts.reduce<Array<{ key: string; indices: number[] }>>((all, item, index) => {
    const key = item.characteristicId || item.color.trim().toLowerCase() || `empty-${index}`;
    const group = all.find((entry) => entry.key === key);
    if (group) group.indices.push(index); else all.push({ key, indices: [index] });
    return all;
  }, []);
  return <section className="variant-characteristics-sheet">
    <div className="variant-characteristics-sheet-head"><h3>Harakteristikalar</h3><Button type="button" size="sm" onClick={onAddColor}><Plus size={16} /> Qo‘shish</Button></div>
    {groups.map((group) => {
      const firstIndex = group.indices[0];
      const first = drafts[firstIndex];
      return <div className="variant-characteristics-row" key={group.key}>
        <ManualColorPicker value={first.color} onChange={(color) => group.indices.forEach((index) => onUpdate(index, { color }))} />
        <div className="variant-stack-field"><span>O‘lcham <b>(Majburiy emas)</b></span>{group.indices.map((index) => <input key={index} value={drafts[index].size} onChange={(event) => onUpdate(index, { size: event.target.value })} placeholder="XL" />)}<div className="variant-size-actions"><button type="button" className="variant-size-remove" aria-label="Oxirgi razmerni olib tashlash" title="Oxirgi razmerni olib tashlash" onClick={() => onRemoveSize(group.indices[group.indices.length - 1])}><Trash2 size={16} /></button><Button type="button" size="icon" onClick={() => onAddSize(firstIndex)}><Plus size={16} /></Button></div></div>
        <div className="variant-stack-field"><span>Soni</span>{group.indices.map((index) => <input key={index} type="number" min="0" value={drafts[index].inventoryQuantity || ""} onChange={(event) => onUpdate(index, { inventoryQuantity: Math.max(0, Number(event.target.value)) })} />)}</div>
        <div className="variant-stack-field"><span>Sub-Artikul <b>(Avtomatik ravishda)</b></span>{group.indices.map((index) => <div className="generated-sku-cell" key={index}>{drafts[index].sku || "Artikul va rangni kiriting"}<LockKeyhole size={18} /></div>)}</div>
      </div>;
    })}
  </section>;
}
function VariantImages({ drafts, onAddImage, onRemoveImage }: { drafts: VariantDraft[]; onAddImage: (index: number, url: string, file: File | null) => void; onRemoveImage: (index: number, image: string) => void }) {
  const [target, setTarget] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const groups = drafts.reduce<Array<{ key: string; indices: number[] }>>((all, item, index) => {
    const key = item.characteristicId || item.color.trim().toLowerCase() || `empty-${index}`;
    const group = all.find((entry) => entry.key === key);
    if (group) group.indices.push(index); else all.push({ key, indices: [index] });
    return all;
  }, []);
  const open = (index: number) => { setTarget(index); setUrl(""); setFile(null); };
  return <section className="variant-images-section">
    <h3>Rasmlar</h3>
    <div className="variant-images-groups">{groups.map((group) => {
      const first = drafts[group.indices[0]];
      // A colour may have several size SKUs, but its image collection belongs
      // to the colour. Variants keep the same image references for reliable
      // storefront reads, so only render each image once in this editor.
      const images = [...new Set(group.indices.flatMap((index) => [drafts[index].imageUrl, ...drafts[index].extraImageUrls]).filter(Boolean))];
      return <div className="variant-images-group" key={group.key}><div className="variant-images-color"><b>{first.color || "Rang tanlanmagan"}</b><i style={{ backgroundColor: colorHex(first.color) }} /></div><div className="variant-image-list">{images.map((image, index) => <div className="variant-image-item" key={`${image}-${index}`}><img src={image} alt={`${first.color} rasm ${index + 1}`} /><button type="button" className="variant-image-remove" aria-label={`${first.color} rasmini olib tashlash`} title="Rasmni olib tashlash" onClick={() => onRemoveImage(group.indices[0], image)}><Trash2 size={15} /></button></div>)}<button type="button" className="variant-image-add" onClick={() => open(group.indices[0])}><Plus size={17} /> Rasm</button></div></div>;
    })}</div>
    {target !== null && <div className="variant-image-modal-backdrop" role="presentation" onMouseDown={() => setTarget(null)}><form className="variant-image-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onAddImage(target, url, file); setTarget(null); }}><div><p className="ui-overline">RASM QO‘SHISH</p><h4>Rasm manbasini tanlang</h4></div><Field label="Rasm URL linki"><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://.../image.jpg" /></Field><Field label="Kompyuterdan yuklash"><input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Field><div className="variant-image-modal-actions"><Button type="button" variant="outline" onClick={() => setTarget(null)}>Bekor qilish</Button><Button disabled={!url.trim() && !file}><Plus size={16} /> Rasm qo‘shish</Button></div></form></div>}
  </section>;
}
function FinanceTable({ rows, currency, onChange }: { rows: FinanceRow[]; currency: string; onChange?: (indices: number[], field: "costPrice" | "expensePrice" | "price", value: string) => void }) {
  const colorRows = rows.reduce<Array<{ row: FinanceRow; indices: number[] }>>((all, row, index) => {
    const key = row.color?.trim().toLowerCase() || `variant-${index}`;
    const group = all.find((item) => (item.row.color?.trim().toLowerCase() || "") === key);
    if (group) group.indices.push(index); else all.push({ row, indices: [index] });
    return all;
  }, []);
  return <section className="product-finance">
    <div className="product-finance-head"><div><p className="ui-overline">FINANCE</p><h3>Narxlar kalkulyatsiyasi</h3></div><span>Valyuta: <b>{currency}</b></span></div>
    <div className="product-finance-table" role="table">
      <div className="product-finance-row product-finance-row--head" role="row"><span>Model/rang</span><span>Tannarx</span><span>Xarajat</span><span>Sotuv narxi</span><span>Markup</span><span>Marja</span><span>Sof foyda</span></div>
      {colorRows.map(({ row, indices }, index) => {
        const cost = amountOf(row.costPrice ?? row.attributes?.costPrice);
        const expense = amountOf(row.expensePrice ?? row.attributes?.expensePrice);
        const sale = amountOf(row.price);
        const total = cost + expense;
        const profit = sale - total;
        const markup = total ? (profit / total) * 100 : 0;
        const margin = sale ? (profit / sale) * 100 : 0;
        const field = (name: "costPrice" | "expensePrice" | "price", value: string | null | undefined, fallback: unknown) => onChange ? <label className="product-finance-input"><input type="number" min="0" step="1" value={value ?? String(fallback ?? "")} onChange={(event) => onChange(indices, name, event.target.value)} inputMode="numeric" /><small>{currency || "UZS"}</small></label> : <span>{money(amountOf(value ?? fallback), currency)}</span>;
        return <div className="product-finance-row" role="row" key={`${row.sku}-${index}`}><span><i style={{ backgroundColor: colorHex(row.color ?? "") }} />{row.color || row.sku || `Variant ${index + 1}`}</span>{field("costPrice", row.costPrice, row.attributes?.costPrice)}{field("expensePrice", row.expensePrice, row.attributes?.expensePrice)}{field("price", row.price, null)}<span className={profit >= 0 ? "is-positive" : "is-negative"}>{markup.toFixed(1)}%</span><span className={profit >= 0 ? "is-positive" : "is-negative"}>{margin.toFixed(1)}%</span><strong className={profit >= 0 ? "is-profit" : "is-loss"}>{profit >= 0 ? money(profit, currency) : `−${money(Math.abs(profit), currency)}`}</strong></div>;
      })}
    </div>
  </section>;
}
function productImages(product: Product) {
  const variantImages = product.variants.flatMap((variant) =>
    Array.isArray(variant.attributes?.images)
      ? variant.attributes.images.filter((image): image is string => typeof image === "string" && Boolean(image.trim()))
      : [],
  );
  return [...new Set([...product.media.map((item) => item.url).filter(Boolean), ...variantImages])];
}
function AdminProductImageRotator({ product }: { product: Product }) {
  const images = productImages(product);
  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [product.id, images.length]);
  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % images.length), 8000);
    return () => window.clearInterval(timer);
  }, [images.length]);
  if (!images.length) return <Package size={30} />;
  return <img className="admin-product-rotating-image" key={`${product.id}-${images[index]}`} src={images[index]} alt={product.title} />;
}
function SelectionCheckbox({ checked, indeterminate = false, disabled = false, onChange, label }: { checked: boolean; indeterminate?: boolean; disabled?: boolean; onChange: (checked: boolean) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />;
}
const offlineOf = (variant: Variant) => Math.max(0, Number(variant.offlineInventoryQuantity ?? 0));
const physicalOf = (variant: Variant) => Math.max(0, variant.inventoryQuantity) + offlineOf(variant);
const ean13Parity = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
const ean13Digits = {
  L: ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"],
  G: ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"],
  R: ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"],
} as const;
const labelEscape = (value: string) => value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] ?? character);
function ean13BarcodeSvg(ean13: string) {
  if (!/^\d{13}$/.test(ean13)) return "";
  const digits = ean13.split("").map(Number);
  const pattern = `101${digits.slice(1, 7).map((digit, index) => ean13Digits[ean13Parity[digits[0]][index] as "L" | "G"][digit]).join("")}01010${digits.slice(7).map((digit) => ean13Digits.R[digit]).join("")}101`;
  const bars: string[] = [];
  let start = -1;
  for (let index = 0; index <= pattern.length; index += 1) {
    if (pattern[index] === "1" && start < 0) start = index;
    if ((pattern[index] !== "1" || index === pattern.length) && start >= 0) {
      const guard = start < 3 || (start < 50 && index > 45) || start >= 92;
      bars.push(`<rect x="${start}" y="0" width="${index - start}" height="${guard ? 54 : 45}" />`);
      start = -1;
    }
  }
  return `<svg class="thermal-barcode" viewBox="0 0 95 66" role="img" aria-label="EAN-13 ${ean13}" preserveAspectRatio="none"><rect width="95" height="66" fill="#fff" />${bars.join("")}<text x="47.5" y="64" text-anchor="middle">${ean13}</text></svg>`;
}
type ThermalLabel = { title: string; sku: string; color: string; size: string; price: string; barcode: string; quantity: number };
function printThermalLabels(labels: ThermalLabel[]) {
  const copies = labels.flatMap((label) => Array.from({ length: label.quantity }, () => label));
  if (!copies.length) return false;
  const popup = window.open("", "_blank", "width=440,height=620");
  if (!popup) return false;
  popup.opener = null;
  const markup = copies.map((label) => `<article class="label"><h1>${labelEscape(label.title)}</h1><p class="variant">${labelEscape(label.color)} · ${labelEscape(label.size)}</p><p class="sku">SKU: ${labelEscape(label.sku)}</p><p class="price">${labelEscape(label.price)}</p>${ean13BarcodeSvg(label.barcode)}</article>`).join("");
  popup.document.open();
  popup.document.write(`<!doctype html><html><head><title>SIREN yorliqlari</title><style>@page{size:58mm 40mm;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;color:#000;font-family:Arial,sans-serif}.label{width:58mm;height:40mm;padding:3mm;overflow:hidden;page-break-after:always;break-after:page}.label:last-child{page-break-after:auto;break-after:auto}h1{margin:0;overflow:hidden;font-size:11pt;line-height:1.1;white-space:nowrap;text-overflow:ellipsis}.variant,.sku,.price{margin:1.2mm 0 0;font-size:7.5pt;font-weight:700}.sku{font-size:6.5pt}.price{font-size:10pt}.thermal-barcode{display:block;width:50mm;height:15mm;margin:1.5mm auto 0}.thermal-barcode text{font-family:Arial,sans-serif;font-size:8px;letter-spacing:1.2px}@media screen{body{padding:12px;background:#ddd}.label{margin:0 auto 12px;background:#fff;box-shadow:0 1px 5px #999}}</style></head><body>${markup}</body></html>`);
  popup.document.close();
  window.setTimeout(() => { popup.focus(); popup.print(); }, 250);
  return true;
}
const productVariantGroups = (product: Product) => {
  const groups = new Map<string, Variant[]>();
  product.variants.forEach((variant) => {
    const color = variant.color?.trim() || "Rangsiz";
    const key = color.toLocaleLowerCase("uz-UZ");
    groups.set(key, [...(groups.get(key) ?? []), variant]);
  });
  return [...groups.entries()].map(([key, variants]) => ({ key, color: variants[0]?.color?.trim() || "Rangsiz", variants }));
};
/** Mahsulotlar sahifasidagi ochiladigan SKU / rang / razmer inventar jadvali. */
export function InventoryProductTable({ products, categories, openProducts, openColors, selected, isValid, setVariants, toggleProduct, toggleColor, onEdit, onInspect, onQuantityChange, selectionLabel = "Transfer" }: {
  products: Product[];
  categories: Taxonomy[];
  openProducts: Set<string>;
  openColors: Set<string>;
  selected: Record<string, number>;
  isValid: (variant: Variant) => boolean;
  setVariants: (variants: Variant[], checked: boolean) => void;
  toggleProduct: (id: string) => void;
  toggleColor: (key: string) => void;
  onEdit: (product: Product) => void;
  onInspect: (product: Product) => void;
  onQuantityChange: (variant: Variant, quantity: number) => void;
  selectionLabel?: string;
}) {
  const selectionLine = (variants: Variant[]) => {
    const valid = variants.filter(isValid);
    const count = valid.filter((variant) => selected[variant.id] !== undefined).length;
    return { checked: valid.length > 0 && count === valid.length, indeterminate: count > 0 && count < valid.length, disabled: valid.length === 0 };
  };
  const visibleValid = products.flatMap((product) => product.variants).filter(isValid);
  return <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th><SelectionCheckbox label="Ko‘rinib turgan barcha variantlarni tanlash" checked={visibleValid.length > 0 && visibleValid.every((variant) => selected[variant.id] !== undefined)} indeterminate={visibleValid.some((variant) => selected[variant.id] !== undefined) && !visibleValid.every((variant) => selected[variant.id] !== undefined)} disabled={!visibleValid.length} onChange={(checked) => setVariants(visibleValid, checked)} /></th><th>Mahsulot / variant</th><th>SKU</th><th>EAN-13 shtrix kodi</th><th>Kategoriya</th><th>Narx</th><th>Jami qoldiq</th><th>Online</th><th>Offline</th><th>Holat</th><th>Yaratilgan</th><th>Amallar</th></tr></thead><tbody>
    {products.map((product) => {
      const groups = productVariantGroups(product);
      const variants = product.variants;
      const productState = selectionLine(variants);
      const physical = variants.reduce((sum, variant) => sum + physicalOf(variant), 0);
      const online = variants.reduce((sum, variant) => sum + variant.inventoryQuantity, 0);
      const offline = variants.reduce((sum, variant) => sum + offlineOf(variant), 0);
      const price = variants.map((variant) => amountOf(variant.price)).filter(Boolean);
      return <Fragment key={product.id}><tr className="inventory-row inventory-row--product"><td><SelectionCheckbox label={`${product.title} barcha variantlarini tanlash`} {...productState} onChange={(checked) => setVariants(variants, checked)} /></td><td><button type="button" className="inventory-expand" onClick={() => toggleProduct(product.id)} aria-expanded={openProducts.has(product.id)}>{openProducts.has(product.id) ? "▼" : "▶"}</button><div className="inventory-product-cell"><div className="inventory-thumb"><AdminProductImageRotator product={product} /></div><span><b>{product.title}</b><small>{product.metadata?.article || variants[0]?.sku || "SKU yo‘q"}</small></span></div></td><td>{product.metadata?.article || "—"}</td><td>—</td><td>{categories.find((category) => category.id === product.categoryId)?.name ?? "—"}</td><td>{money(price.length ? Math.min(...price) : amountOf(product.price), product.currencyCode)}</td><td>{physical}</td><td>{online}</td><td>{offline}</td><td><Badge variant={flavor(product.status)}>{product.status}</Badge></td><td>{readableDate(product.createdAt)}</td><td><div className="inventory-actions"><Button size="sm" variant="outline" onClick={() => onEdit(product)}>Tahrirlash</Button><Button size="sm" variant="outline" onClick={() => onInspect(product)}>Ma’lumot</Button></div></td></tr>
        {openProducts.has(product.id) && groups.map((group) => { const colorKey = `${product.id}:${group.key}`; const colorState = selectionLine(group.variants); const colorPhysical = group.variants.reduce((sum, variant) => sum + physicalOf(variant), 0); const colorOnline = group.variants.reduce((sum, variant) => sum + variant.inventoryQuantity, 0); const colorOffline = group.variants.reduce((sum, variant) => sum + offlineOf(variant), 0); return <Fragment key={colorKey}><tr className="inventory-row inventory-row--color"><td><SelectionCheckbox label={`${group.color} barcha razmerlarini tanlash`} {...colorState} onChange={(checked) => setVariants(group.variants, checked)} /></td><td><button type="button" className="inventory-expand" onClick={() => toggleColor(colorKey)} aria-expanded={openColors.has(colorKey)}>{openColors.has(colorKey) ? "▼" : "▶"}</button><span className="inventory-color-name"><i style={{ backgroundColor: colorHex(group.color) }} />{group.color}</span></td><td>—</td><td>—</td><td>Rang</td><td>—</td><td>{colorPhysical}</td><td>{colorOnline}</td><td>{colorOffline}</td><td>—</td><td>—</td><td /></tr>
          {openColors.has(colorKey) && group.variants.map((variant) => { const active = isValid(variant); const value = selected[variant.id]; return <tr className={`inventory-row inventory-row--size ${active ? "" : "is-disabled"}`} key={variant.id}><td><SelectionCheckbox label={`${group.color} ${variant.size || "ONE SIZE"} ni tanlash`} checked={value !== undefined} disabled={!active} onChange={(checked) => setVariants([variant], checked)} /></td><td><span className="inventory-size-name">{variant.size || "ONE SIZE"}</span></td><td>{variant.sku || "—"}</td><td>{variant.barcode || "Yaratilmoqda…"}</td><td>Razmer</td><td>{money(amountOf(variant.price || product.price), product.currencyCode)}</td><td>{physicalOf(variant)}</td><td>{variant.inventoryQuantity}</td><td>{offlineOf(variant)}</td><td>{variant.isActive ? "Active" : "Faol emas"}</td><td>—</td><td>{value !== undefined ? <label className="inventory-qty"><span>{selectionLabel}</span><input type="number" min="1" max={variant.inventoryQuantity} value={value} onChange={(event) => onQuantityChange(variant, Number(event.target.value) || 1)} /></label> : <span className="inventory-unavailable">{active ? "Tanlang" : "Mavjud emas"}</span>}</td></tr>; })}</Fragment>; })}</Fragment>;
    })}
    {!products.length && <tr><td colSpan={12}><Empty>Qidiruv yoki filter bo‘yicha mahsulot topilmadi.</Empty></td></tr>}
  </tbody></table></div>;
}
function ProductInventoryWorkspace({ products, categories, transfers, token, onEdit, onInspect, onRefresh, onNotice }: {
  products: Product[];
  categories: Taxonomy[];
  transfers: InventoryTransfer[];
  token: string;
  onEdit: (product: Product) => void;
  onInspect: (product: Product) => void;
  onRefresh: () => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [openProducts, setOpenProducts] = useState<Set<string>>(new Set());
  const [openColors, setOpenColors] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const allColors = [...new Set(products.flatMap((product) => product.variants.map((variant) => variant.color?.trim()).filter(Boolean)))];
  const allSizes = [...new Set(products.flatMap((product) => product.variants.map((variant) => variant.size?.trim()).filter(Boolean)))];
  const isValid = (variant: Variant) => variant.isActive && variant.inventoryQuantity > 0 && Boolean(variant.id && variant.sku);
  const filtered = products.filter((product) => {
    const words = `${product.title} ${product.metadata?.article ?? ""} ${product.variants.map((variant) => variant.sku).join(" ")}`.toLocaleLowerCase("uz-UZ");
    if (query.trim() && !words.includes(query.trim().toLocaleLowerCase("uz-UZ"))) return false;
    if (categoryId && product.categoryId !== categoryId) return false;
    if (status && product.status !== status) return false;
    const variants = product.variants;
    if (stockFilter === "in" && !variants.some((variant) => variant.inventoryQuantity > 0)) return false;
    if (stockFilter === "low" && !variants.some((variant) => variant.inventoryQuantity > 0 && variant.inventoryQuantity <= 5)) return false;
    if (stockFilter === "offline" && !variants.some((variant) => offlineOf(variant) > 0)) return false;
    if (colorFilter && !variants.some((variant) => variant.color?.trim() === colorFilter)) return false;
    if (sizeFilter && !variants.some((variant) => variant.size?.trim() === sizeFilter)) return false;
    return true;
  });
  const visibleValid = filtered.flatMap((product) => product.variants).filter(isValid);
  const selectedIds = Object.keys(selected);
  const setVariants = (variants: Variant[], checked: boolean) => setSelected((current) => {
    const next = { ...current };
    variants.filter(isValid).forEach((variant) => {
      if (checked) next[variant.id] = Math.min(Math.max(1, next[variant.id] ?? 1), variant.inventoryQuantity);
      else delete next[variant.id];
    });
    return next;
  });
  const toggleOpen = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => setter((current) => {
    const next = new Set(current);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const selectionSummary = selectedIds.reduce((sum, id) => sum + Math.max(0, selected[id]), 0);
  const printLabels = () => {
    const labels = selectedIds.flatMap((id) => {
      const product = products.find((entry) => entry.variants.some((variant) => variant.id === id));
      const variant = product?.variants.find((entry) => entry.id === id);
      if (!product || !variant || !variant.barcode) return [];
      return [{ title: product.title, sku: variant.sku, color: variant.color || "Rangsiz", size: variant.size || "ONE SIZE", price: money(amountOf(variant.price || product.price), product.currencyCode), barcode: variant.barcode, quantity: selected[id] }];
    });
    if (!labels.length) { onNotice("Chop etish uchun EAN-13 kodi bor variantni tanlang."); return; }
    if (!printThermalLabels(labels)) onNotice("Print oynasi bloklandi. Brauzerda pop-upga ruxsat bering.");
  };
  const submit = async () => {
    setSubmitting(true);
    try {
      const items = selectedIds.map((variantId) => ({ variantId, quantity: selected[variantId] }));
      const response = await api<{ movedUnits: number; movedVariants: number }>("/admin/catalog/transfers", token, { method: "POST", body: JSON.stringify({ items, note }) });
      await onRefresh();
      setSelected({}); setNote(""); setConfirming(false);
      onNotice(`${response.movedUnits} dona Offline Sales ga o‘tkazildi.`);
    } finally { setSubmitting(false); }
  };
  const selectionLine = (variants: Variant[]) => {
    const valid = variants.filter(isValid);
    const count = valid.filter((variant) => selected[variant.id] !== undefined).length;
    return { checked: valid.length > 0 && count === valid.length, indeterminate: count > 0 && count < valid.length, disabled: valid.length === 0 };
  };
  return <section className="tailadmin-data-page inventory-workspace">
    <div className="tailadmin-data-card">
    <div className="tailadmin-data-card-toolbar inventory-toolbar reference-products-toolbar">
      <label><Search size={19} aria-hidden="true" /><span className="sr-only">Qidirish</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Qidirish..." /></label>
      <details className="reference-filter-menu"><summary><SlidersHorizontal size={18} /> Filter</summary><div className="reference-filter-panel">
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Barcha kategoriya</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Barcha holat</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
        <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="">Barcha qoldiq</option><option value="in">Mavjud</option><option value="low">Kam qoldiq (≤5)</option><option value="offline">Offline qoldiq bor</option></select>
        <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value)}><option value="">Barcha rang</option>{allColors.map((color) => <option key={color} value={color}>{color}</option>)}</select>
        <select value={sizeFilter} onChange={(event) => setSizeFilter(event.target.value)}><option value="">Barcha razmer</option>{allSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select>
      </div></details>
    </div>
    <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th><SelectionCheckbox label="Ko‘rinib turgan barcha variantlarni tanlash" checked={visibleValid.length > 0 && visibleValid.every((variant) => selected[variant.id] !== undefined)} indeterminate={visibleValid.some((variant) => selected[variant.id] !== undefined) && !visibleValid.every((variant) => selected[variant.id] !== undefined)} disabled={!visibleValid.length} onChange={(checked) => setVariants(visibleValid, checked)} /></th><th>Mahsulot / variant</th><th>SKU</th><th>EAN-13 shtrix kodi</th><th>Kategoriya</th><th>Narx</th><th>Jami qoldiq</th><th>Online</th><th>Offline</th><th>Holat</th><th>Yaratilgan</th><th>Amallar</th></tr></thead><tbody>
      {filtered.map((product) => {
        const groups = productVariantGroups(product);
        const variants = product.variants;
        const productState = selectionLine(variants);
        const physical = variants.reduce((sum, variant) => sum + physicalOf(variant), 0);
        const online = variants.reduce((sum, variant) => sum + variant.inventoryQuantity, 0);
        const offline = variants.reduce((sum, variant) => sum + offlineOf(variant), 0);
        const price = variants.map((variant) => amountOf(variant.price)).filter(Boolean);
        return <Fragment key={product.id}><tr className="inventory-row inventory-row--product"><td><SelectionCheckbox label={`${product.title} barcha variantlarini tanlash`} {...productState} onChange={(checked) => setVariants(variants, checked)} /></td><td><button type="button" className="inventory-expand" onClick={() => toggleOpen(setOpenProducts, product.id)} aria-expanded={openProducts.has(product.id)}>{openProducts.has(product.id) ? "▼" : "▶"}</button><div className="inventory-product-cell"><div className="inventory-thumb"><AdminProductImageRotator product={product} /></div><span><b>{product.title}</b><small>{product.metadata?.article || variants[0]?.sku || "SKU yo‘q"}</small></span></div></td><td>{product.metadata?.article || "—"}</td><td>—</td><td>{categories.find((category) => category.id === product.categoryId)?.name ?? "—"}</td><td>{money(price.length ? Math.min(...price) : amountOf(product.price), product.currencyCode)}</td><td>{physical}</td><td>{online}</td><td>{offline}</td><td><Badge variant={flavor(product.status)}>{product.status}</Badge></td><td>{readableDate(product.createdAt)}</td><td><div className="inventory-actions"><Button size="sm" variant="outline" onClick={() => onEdit(product)}>Tahrirlash</Button><Button size="sm" variant="outline" onClick={() => onInspect(product)}>Ma’lumot</Button></div></td></tr>
          {openProducts.has(product.id) && groups.map((group) => { const colorKey = `${product.id}:${group.key}`; const colorState = selectionLine(group.variants); const colorPhysical = group.variants.reduce((sum, variant) => sum + physicalOf(variant), 0); const colorOnline = group.variants.reduce((sum, variant) => sum + variant.inventoryQuantity, 0); const colorOffline = group.variants.reduce((sum, variant) => sum + offlineOf(variant), 0); return <Fragment key={colorKey}><tr className="inventory-row inventory-row--color"><td><SelectionCheckbox label={`${group.color} barcha razmerlarini tanlash`} {...colorState} onChange={(checked) => setVariants(group.variants, checked)} /></td><td><button type="button" className="inventory-expand" onClick={() => toggleOpen(setOpenColors, colorKey)} aria-expanded={openColors.has(colorKey)}>{openColors.has(colorKey) ? "▼" : "▶"}</button><span className="inventory-color-name"><i style={{ backgroundColor: colorHex(group.color) }} />{group.color}</span></td><td>—</td><td>—</td><td>Rang</td><td>—</td><td>{colorPhysical}</td><td>{colorOnline}</td><td>{colorOffline}</td><td>—</td><td>—</td><td /></tr>
            {openColors.has(colorKey) && group.variants.map((variant) => { const active = isValid(variant); const value = selected[variant.id]; return <tr className={`inventory-row inventory-row--size ${active ? "" : "is-disabled"}`} key={variant.id}><td><SelectionCheckbox label={`${group.color} ${variant.size || "ONE SIZE"} ni tanlash`} checked={value !== undefined} disabled={!active} onChange={(checked) => setVariants([variant], checked)} /></td><td><span className="inventory-size-name">{variant.size || "ONE SIZE"}</span></td><td>{variant.sku || "—"}</td><td>{variant.barcode || "Yaratilmoqda…"}</td><td>Razmer</td><td>{money(amountOf(variant.price || product.price), product.currencyCode)}</td><td>{physicalOf(variant)}</td><td>{variant.inventoryQuantity}</td><td>{offlineOf(variant)}</td><td>{variant.isActive ? "Active" : "Faol emas"}</td><td>—</td><td>{value !== undefined ? <label className="inventory-qty"><span>Transfer</span><input type="number" min="1" max={variant.inventoryQuantity} value={value} onChange={(event) => setSelected((current) => ({ ...current, [variant.id]: Math.min(variant.inventoryQuantity, Math.max(1, Number(event.target.value) || 1)) }))} /></label> : <span className="inventory-unavailable">{active ? "Tanlang" : "Mavjud emas"}</span>}</td></tr>; })}</Fragment>; })}</Fragment>;
      })}
      {!filtered.length && <tr><td colSpan={12}><Empty>Qidiruv yoki filter bo‘yicha mahsulot topilmadi.</Empty></td></tr>}
    </tbody></table></div>
    <div className="inventory-bulk-bar"><div><b>{selectedIds.length} variant tanlandi</b><span>{selectionSummary} dona Offline Sales ga o‘tkaziladi</span></div><div className="inventory-actions"><Button type="button" variant="outline" disabled={!selectedIds.length} onClick={printLabels}><Printer size={15} /> Yorliq chop etish</Button><Button disabled={!selectedIds.length || submitting} onClick={() => setConfirming(true)}>Transfer</Button></div></div>
    </div>
    {confirming && <div className="inventory-confirm-backdrop" role="presentation" onMouseDown={() => setConfirming(false)}><section className="inventory-confirm" role="dialog" aria-modal="true" aria-label="Offline transfer tasdiqlash" onMouseDown={(event) => event.stopPropagation()}><p className="ui-overline">TRANSFER TO OFFLINE SALES</p><h3>Transferni tasdiqlang</h3><p>{selectedIds.length} variant, jami <b>{selectionSummary} dona</b>. Fizik qoldiq o‘zgarmaydi: birliklar faqat Online dan Offline Sales ga o‘tadi.</p><div className="inventory-confirm-items">{selectedIds.map((id) => { const product = products.find((entry) => entry.variants.some((variant) => variant.id === id)); const variant = product?.variants.find((entry) => entry.id === id); return <span key={id}>{product?.title} · {variant?.color || "Rangsiz"} / {variant?.size || "ONE SIZE"} × {selected[id]}</span>; })}</div><Field label="Izoh (ixtiyoriy)"><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Offline savdo nuqtasi" /></Field><div className="inventory-confirm-actions"><Button type="button" variant="outline" onClick={() => setConfirming(false)}>Bekor qilish</Button><Button disabled={submitting} onClick={() => void submit()}>{submitting ? "Tekshirilmoqda…" : "Transferni tasdiqlash"}</Button></div></section></div>}
  </section>;
}
function OfflineTransferWorkspace({ products, transfers, token, onRefresh, onNotice }: { products: Product[]; transfers: InventoryTransfer[]; token: string; onRefresh: () => Promise<void>; onNotice: (message: string) => void }) {
  const [returning, setReturning] = useState<{ product: Product; variant: Variant } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const rows = products.flatMap((product) => product.variants.filter((variant) => offlineOf(variant) > 0).map((variant) => ({ product, variant })));
  const latestFor = (variantId: string) => transfers.find((item) => item.variantId === variantId);
  const returnStock = async () => {
    if (!returning) return;
    setSubmitting(true);
    try {
      const response = await api<{ movedUnits: number }>("/admin/catalog/transfers/return", token, { method: "POST", body: JSON.stringify({ items: [{ variantId: returning.variant.id, quantity }] }) });
      await onRefresh(); setReturning(null); onNotice(`${response.movedUnits} dona Online ga qaytarildi.`);
    } finally { setSubmitting(false); }
  };
  return <section className="inventory-workspace inventory-transfer-page">
    <div className="inventory-transfer-head"><div><p className="ui-overline">OFFLINE SALES</p><h2>Transfer</h2><span>Offline savdo uchun ajratilgan variantlar va harakatlar tarixi.</span></div><Badge variant="neutral">{rows.length} ta offline variant</Badge></div>
    <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Mahsulot</th><th>EAN-13 shtrix kodi</th><th>Variant</th><th>Rang</th><th>Razmer</th><th>SKU</th><th>Offline qoldiq</th><th>Oxirgi transfer</th><th>Kim</th><th>Holat</th><th>Amallar</th></tr></thead><tbody>
      {rows.map(({ product, variant }) => { const last = latestFor(variant.id); return <tr key={variant.id}><td>{product.title}</td><td>{variant.barcode || "Yaratilmoqda…"}</td><td>{variant.color || "Rangsiz"} / {variant.size || "ONE SIZE"}</td><td><span className="inventory-color-name"><i style={{ backgroundColor: colorHex(variant.color || "") }} />{variant.color || "—"}</span></td><td>{variant.size || "ONE SIZE"}</td><td>{variant.sku}</td><td><b>{offlineOf(variant)}</b></td><td>{last ? new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(last.createdAt)) : "—"}</td><td>{last?.actorId ? "Admin" : "—"}</td><td>{variant.isActive ? "Active" : "Faol emas"}</td><td><Button size="sm" variant="outline" onClick={() => { setReturning({ product, variant }); setQuantity(1); }}>Online ga qaytarish</Button></td></tr>; })}
      {!rows.length && <tr><td colSpan={11}><Empty>Offline qoldiq hali yo‘q.</Empty></td></tr>}
    </tbody></table></div>
    <section className="inventory-history"><p className="ui-overline">AUDIT TRAIL</p><h3>Transfer tarixi</h3>{transfers.length ? <div>{transfers.slice(0, 30).map((transfer) => <p key={transfer.id}><b>{transfer.direction === "to_offline" ? "Offline ga transfer" : "Online ga qaytarish"}</b> · {transfer.product?.title || "Mahsulot"} · SKU: {transfer.variant?.sku || "—"} · EAN-13: {transfer.variant?.barcode || "—"} · {transfer.variant?.color || "Rang"} / {transfer.variant?.size || "ONE SIZE"} × {transfer.quantity} <span>{new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(transfer.createdAt))}</span></p>)}</div> : <Empty>Transfer tarixi hali yo‘q.</Empty>}</section>
    {returning && <div className="inventory-confirm-backdrop" role="presentation" onMouseDown={() => setReturning(null)}><section className="inventory-confirm" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><p className="ui-overline">RETURN TO ONLINE</p><h3>Online qoldiqqa qaytarish</h3><p>{returning.product.title} · {returning.variant.color || "Rangsiz"} / {returning.variant.size || "ONE SIZE"}. Offline qoldiq: <b>{offlineOf(returning.variant)}</b>.</p><Field label="Qaytariladigan miqdor"><input type="number" min="1" max={offlineOf(returning.variant)} value={quantity} onChange={(event) => setQuantity(Math.min(offlineOf(returning.variant), Math.max(1, Number(event.target.value) || 1)))} /></Field><div className="inventory-confirm-actions"><Button type="button" variant="outline" onClick={() => setReturning(null)}>Bekor qilish</Button><Button disabled={submitting} onClick={() => void returnStock()}>{submitting ? "Tekshirilmoqda…" : "Qaytarishni tasdiqlash"}</Button></div></section></div>}
  </section>;
}
function ProductInspector({ product, onClose }: { product: Product; onClose: () => void }) {
  const stock = product.variants.reduce((sum, variant) => sum + variant.inventoryQuantity, 0);
  const cost = product.variants.reduce((sum, variant) => sum + amountOf(variant.attributes?.costPrice) * variant.inventoryQuantity, 0);
  const expense = product.variants.reduce((sum, variant) => sum + amountOf(variant.attributes?.expensePrice) * variant.inventoryQuantity, 0);
  const salePrices = product.variants.map((variant) => amountOf(variant.price)).filter(Boolean);
  const article = product.metadata?.article || "—";
  const totalAdded = Math.max(Number(product.metadata?.baseInventoryQuantity ?? 0), product.variants.reduce((sum, variant) => sum + (variant.totalInventoryAdded ?? variant.inventoryQuantity), 0));
  return <div className="product-inspector-backdrop" role="presentation" onMouseDown={onClose}><section className="product-inspector" role="dialog" aria-modal="true" aria-label={`${product.title} ma’lumotlari`} onMouseDown={(event) => event.stopPropagation()}><header><div><p className="ui-overline">PRODUCT INSPECTOR</p><h3>{product.title}</h3><span>{article} · {product.status}</span></div><button type="button" onClick={onClose} aria-label="Yopish">×</button></header><div className="product-inspector-metrics"><div><span>Sotilgan</span><b>{product.soldQuantity ?? 0}</b></div><div><span>Ko‘rishlar</span><b>{Number(product.metadata?.views ?? 0)}</b></div><div><span>Ombordagi qoldiq</span><b>{stock}</b></div><div><span>Jami kiritilgan</span><b>{totalAdded}</b></div><div><span>Tannarx</span><b>{money(cost, product.currencyCode)}</b></div><div><span>Xarajat</span><b>{money(expense, product.currencyCode)}</b></div><div><span>Sotuv narxi</span><b>{salePrices.length ? `${money(Math.min(...salePrices), product.currencyCode)} — ${money(Math.max(...salePrices), product.currencyCode)}` : money(amountOf(product.price), product.currencyCode)}</b></div></div><div className="product-inspector-table-wrap"><table><thead><tr><th>SKU</th><th>Rang</th><th>Razmer</th><th>Qoldiq</th><th>Tannarx</th><th>Xarajat</th><th>Sotuv narxi</th><th>Holat</th></tr></thead><tbody>{product.variants.length ? product.variants.map((variant) => <tr key={variant.id}><td>{variant.sku}</td><td>{variant.color || "—"}</td><td>{variant.size || "ONE SIZE"}</td><td>{variant.inventoryQuantity}</td><td>{money(amountOf(variant.attributes?.costPrice), product.currencyCode)}</td><td>{money(amountOf(variant.attributes?.expensePrice), product.currencyCode)}</td><td>{money(amountOf(variant.price || product.price), product.currencyCode)}</td><td>{variant.isActive ? "Active" : "Off"}</td></tr>) : <tr><td colSpan={8}>Variantlar yo‘q.</td></tr>}</tbody></table></div><footer><Button type="button" variant="outline" onClick={onClose}>Yopish</Button><Link className="ui-button ui-button--primary" href={`/products/${product.slug}`}>Saytda ko‘rish <ChevronRight size={15} /></Link></footer></section></div>;
}
type AdminModuleConfig = { title: string; description: string; tabs: string[]; columns: string[]; fields: string[]; metrics?: string[]; action: string };
const adminModules: Record<"delivery" | "customers" | "promos" | "partners" | "finance" | "currencies" | "analytics" | "settings", AdminModuleConfig> = {
  delivery: { title: "Yetkazib berish", description: "Yetkazmalar, hududlar, tariflar va kuryerlar boshqaruvi.", tabs: ["Barcha yetkazmalar", "Kutilmoqda", "Tayyorlanmoqda", "Kuryerga berilgan", "Yo‘lda", "Yetkazilgan", "Muvaffaqiyatsiz yetkazma", "Bekor qilingan", "Yetkazish hududlari", "Yetkazish tariflari", "Kuryerlar"], columns: ["Buyurtma raqami", "Mijoz", "Telefon", "Manzil", "Shahar / viloyat", "Yetkazish turi", "Kuryer", "Tracking", "Narx", "Status", "Yaratilgan", "Yetkazilgan"], fields: ["Buyurtma raqami", "Mijoz ismi", "Telefon", "Manzil", "Shahar / viloyat", "Yetkazish turi", "Kuryer", "Tracking raqami", "Yetkazish narxi", "Status"], action: "Yetkazma qo‘shish" },
  customers: { title: "Mijozlar", description: "Mijoz segmentlari, xarid faolligi va profil ma’lumotlari.", tabs: ["Barcha mijozlar", "Yangi mijozlar", "Doimiy mijozlar", "VIP mijozlar", "Blacklist", "Segmentlar"], columns: ["Ism", "Telefon", "Email", "Ro‘yxatdan o‘tgan", "Buyurtmalar", "Jami xarid", "O‘rtacha chek", "Oxirgi buyurtma", "Segment"], fields: ["Ism", "Telefon", "Email", "Ro‘yxatdan o‘tgan sana", "Buyurtmalar soni", "Jami xarid summasi", "O‘rtacha chek", "Oxirgi buyurtma", "Sevimli kategoriya", "Eng ko‘p xarid qilgan mahsulotlar", "Asosiy o‘lcham", "Asosiy rang", "Qaytarishlar", "Promokod tarixi", "Izohlar"], action: "Mijoz qo‘shish" },
  promos: { title: "Promokodlar", description: "Chegirmalar, foydalanish limitlari va promokod statistikasi.", tabs: ["Barcha promokodlar", "Aktiv", "Rejalashtirilgan", "Tugagan", "O‘chirilgan", "Statistika"], columns: ["Kod", "Chegirma", "Minimal buyurtma", "Limit", "Ishlatilgan", "Boshlanish", "Tugash", "Status"], fields: ["Kod nomi", "Chegirma turi", "Foizli chegirma", "Fiks summa", "Bepul yetkazib berish", "Minimal buyurtma", "Maksimal chegirma", "Umumiy limit", "Bir mijoz limiti", "Boshlanish sanasi", "Tugash sanasi", "Yangi mijozlar uchun", "Mahsulotlar", "Kategoriya", "Collection", "Drop", "Aktiv holati"], metrics: ["Necha marta ishlatilgan", "Revenue", "Berilgan chegirma", "Yangi mijozlar", "Qaytgan mijozlar", "O‘rtacha chek"], action: "Promokod yaratish" },
  partners: { title: "Hamkorlar", description: "Sponsor, influencer, affiliate va referral hamkorlar.", tabs: ["Barcha hamkorlar", "Sponsorlar", "Influencerlar", "Affiliate", "Referral hamkorlar", "Hamkorlik statistikasi", "To‘lovlar"], columns: ["Nomi", "Kontakt", "Hamkor turi", "Promokod", "Referral link", "Komissiya", "Buyurtmalar", "Revenue", "Qarzdorlik", "Status"], fields: ["Nomi", "Kontakt", "Telefon", "Email", "Instagram", "TikTok", "Telegram", "Hamkor turi", "Promokod", "Referral link", "Komissiya foizi", "Tashriflar", "Buyurtmalar", "Revenue", "Komissiya summasi", "To‘langan summa", "Qarzdorlik", "Boshlangan sana", "Status"], action: "Hamkor qo‘shish" },
  finance: { title: "Moliya", description: "Daromad, xarajat, foyda, to‘lov va hisobotlar nazorati.", tabs: ["Overview", "Daromad", "Xarajatlar", "Foyda", "To‘lovlar", "Tranzaksiyalar", "Refundlar", "Qarzdorlik", "Hisobotlar"], columns: ["Nomi", "Kategoriya", "Summa", "Valyuta", "Sana", "Kim qo‘shgan", "Izoh"], fields: ["Nomi", "Kategoriya", "Summa", "Valyuta", "Sana", "Izoh", "Kim qo‘shgan", "Fayl / chek"], metrics: ["Gross Revenue", "Net Revenue", "Xarajatlar", "Gross Profit", "Net Profit", "Margin", "Buyurtmalar", "O‘rtacha chek", "Refund", "Yetkazish xarajatlari", "Payment commission"], action: "Xarajat qo‘shish" },
  currencies: { title: "Valyutalar", description: "Kurslar, konvertatsiya va saytda ko‘rinadigan valyutalar.", tabs: ["Valyutalar", "Kurslar", "Sozlamalar"], columns: ["Valyuta", "Belgi", "Kurs", "Holat", "Oxirgi yangilanish"], fields: ["Asosiy valyuta", "Valyutani yoqish", "Kurs", "Avtomatik yangilash", "Rounding qoidasi", "Belgi pozitsiyasi"], action: "Kurs yangilash" },
  analytics: { title: "Analitika", description: "Sotuv, tashrif, mahsulot va konversiyaning asosiy ko‘rsatkichlari.", tabs: ["Umumiy", "Sotuvlar", "Tashriflar", "Mahsulotlar", "Konversiya"], columns: ["Ko‘rsatkich", "Bugun", "Bu hafta", "Bu oy", "O‘zgarish"], fields: ["Revenue", "Profit", "Orders", "Units Sold", "Visitors", "Customers", "Average Order Value", "Conversion Rate", "Cart Rate", "Refund Rate"], metrics: ["Visitor", "Product View", "Add to Cart", "Checkout", "Payment", "Purchase"], action: "Hisobotni yuklash" },
  settings: { title: "Sozlamalar", description: "Do‘kon, buyurtma, to‘lov, yetkazish va xavfsizlik sozlamalari.", tabs: ["Umumiy", "Do‘kon", "Buyurtmalar", "To‘lov", "Yetkazib berish", "Valyuta", "Soliq", "Bildirishnomalar", "Integratsiyalar", "Xavfsizlik"], columns: ["Sozlama", "Qiymat", "Yangilangan", "Holat"], fields: ["Store name", "Logo", "Favicon", "Email", "Telefon", "Asosiy til", "Timezone", "Sana formati", "Default currency", "Default country", "Stock settings", "Minimum order", "Maximum order", "Order prefix", "Admin login", "2FA", "Sessionlar", "IP history", "Role permissions"], action: "Sozlamani saqlash" },
};
function AdminModulePage({ config, loading, error, onNotify, customers = [] }: { config: AdminModuleConfig; loading: boolean; error: string; onNotify: (message: string) => void; customers?: CustomerRecord[] }) {
  const [subtab, setSubtab] = useState(config.tabs[0]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  useEffect(() => { setSubtab(config.tabs[0]); setQuery(""); setPage(1); }, [config]);
  const visibleCustomers = customers.filter((customer) => `${customer.firstName} ${customer.lastName} ${customer.email ?? ""} ${customer.phone ?? ""}`.toLocaleLowerCase("uz-UZ").includes(query.toLocaleLowerCase("uz-UZ")));
  const customerRows = config.title === "Mijozlar" ? visibleCustomers : [];
  return <section className="tailadmin-module-page">
    <aside className="tailadmin-module-tabs"><p>{config.title}</p>{config.tabs.map((item) => <button type="button" key={item} className={subtab === item ? "is-active" : ""} onClick={() => { setSubtab(item); setPage(1); }}>{item}</button>)}</aside>
    <div className="tailadmin-module-content">
      <header className="tailadmin-page-heading"><div><p className="ui-overline">{config.title}</p><h2>{subtab}</h2><span>{config.description}</span></div><Button type="button" onClick={() => onNotify(`${config.action} formasi tayyorlanmoqda.`)}><Plus size={16} />{config.action}</Button></header>
      {config.metrics && <div className="admin-module-metrics">{config.metrics.slice(0, 6).map((metric) => <div key={metric}><span>{metric}</span><b>—</b></div>)}</div>}
      <div className="tailadmin-data-card">
        <div className="tailadmin-data-card-toolbar admin-table-tools"><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Qidirish..." aria-label="Qidirish"/><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Saralash"><option value="newest">Eng yangisi</option><option value="oldest">Eng eskisi</option><option value="az">A–Z</option><option value="za">Z–A</option></select><select aria-label="Filter"><option>Barcha statuslar</option><option>Aktiv</option><option>Kutilmoqda</option><option>Yakunlangan</option></select></div>
        {loading ? <div className="admin-module-state">Yuklanmoqda…</div> : error ? <div className="admin-module-state is-error">{error}</div> : <div className={`admin-module-table-wrap${config.title === "Mijozlar" ? " admin-customer-table-wrap" : ""}`}>
          <Table className={`admin-module-table${config.title === "Mijozlar" ? " admin-customer-table" : ""}`}>
            <TableHeader><TableRow>{config.columns.map((column) => <TableCell isHeader key={column}>{column}</TableCell>)}</TableRow></TableHeader>
            <TableBody>{customerRows.map((customer) => <TableRow key={customer.id}><TableCell className="customer-cell-name">{`${customer.firstName} ${customer.lastName}`.trim() || "—"}</TableCell><TableCell className="customer-cell-phone">{customer.phone || "—"}</TableCell><TableCell className="customer-cell-email" title={customer.email || ""}>{customer.email || "—"}</TableCell><TableCell className="customer-cell-date">{readableDate(customer.createdAt)}</TableCell><TableCell>{customer.totalOrders}</TableCell><TableCell>{Math.round(customer.totalSpent).toLocaleString("uz-UZ")} UZS</TableCell><TableCell>{Math.round(customer.totalOrders ? customer.totalSpent / customer.totalOrders : 0).toLocaleString("uz-UZ")} UZS</TableCell><TableCell>—</TableCell><TableCell><span className={`customer-segment${customer.welcomeDiscountEligible ? " is-welcome" : ""}`}>{customer.welcomeDiscountEligible ? `${customer.welcomeDiscountPercent || 15}% welcome` : "Faol"}</span></TableCell></TableRow>)}{!customerRows.length && <TableRow><TableCell colSpan={config.columns.length}><Empty>{query ? "Qidiruv bo‘yicha natija topilmadi." : "Bu bo‘limda hozircha ma’lumot yo‘q."}</Empty></TableCell></TableRow>}</TableBody>
          </Table>
        </div>}
        <div className="admin-table-pagination"><span>{config.title === "Mijozlar" ? customerRows.length : 0} ta natija · {page}-sahifa</span><div><Button type="button" size="sm" variant="outline" disabled>Oldingi</Button><Button type="button" size="sm" variant="outline" disabled>Keyingi</Button></div></div>
      </div>
      <Card className="admin-module-fields"><CardHeader><CardTitle>{subtab} uchun ma’lumotlar</CardTitle><CardDescription>Yaratish yoki tahrirlash formasida quyidagi maydonlar bo‘ladi.</CardDescription></CardHeader><CardContent><div>{config.fields.map((field) => <span key={field}>{field}</span>)}</div></CardContent></Card>
    </div>
  </section>;
}
function CustomerManager({ customers, loading, error, token }: { customers: CustomerRecord[]; loading: boolean; error: string; token: string }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [receipt, setReceipt] = useState<CustomerDetail["orders"][number] | null>(null);
  const [detailError, setDetailError] = useState("");
  const [opening, setOpening] = useState(false);
  const filtered = customers.filter((customer) => `${customer.firstName} ${customer.lastName} ${customer.email ?? ""} ${customer.phone ?? ""}`.toLocaleLowerCase("uz-UZ").includes(query.toLocaleLowerCase("uz-UZ")));
  const openCustomer = async (customer: CustomerRecord) => {
    setOpening(true); setDetailError("");
    try { setSelected(await api<CustomerDetail>(`/admin/customers/${customer.id}`, token)); }
    catch (reason) { setDetailError(reason instanceof Error ? reason.message : "Mijoz ma’lumotini olib bo‘lmadi."); }
    finally { setOpening(false); }
  };
  const customerName = (customer: Pick<CustomerRecord, "firstName" | "lastName">) => `${customer.firstName} ${customer.lastName}`.trim() || "—";
  const closeProfile = () => { setSelected(null); setReceipt(null); };
  return <section className="tailadmin-customers-page">
    <header className="tailadmin-page-heading"><div><p className="ui-overline">MIJOZLAR</p><h2>Barcha mijozlar</h2><span>Mijoz profili, buyurtmalar va xarid faolligi.</span></div><Badge variant="neutral">{customers.length} ta mijoz</Badge></header>
    <div className="tailadmin-data-card"><div className="tailadmin-data-card-toolbar admin-table-tools"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ism, email yoki telefon qidirish..." aria-label="Mijoz qidirish" /></div>{loading ? <div className="admin-module-state">Yuklanmoqda…</div> : error ? <div className="admin-module-state is-error">{error}</div> : <div className="admin-module-table-wrap"><table className="admin-module-table customer-list-table"><thead><tr><th>Mijoz</th><th>Telefon</th><th>Email</th><th>Buyurtmalar</th><th>Jami savdo</th><th>O‘rtacha chek</th><th>Oxirgi buyurtma</th><th>Holat</th></tr></thead><tbody>{filtered.map((customer) => { const average = customer.totalOrders ? customer.totalSpent / customer.totalOrders : 0; return <tr key={customer.id}><td><button type="button" className="customer-name-trigger" onClick={() => void openCustomer(customer)}>{customerName(customer)}<small>Profilni ko‘rish</small></button></td><td>{customer.phone || "—"}</td><td>{customer.email || "—"}{customer.emailVerifiedAt ? <small> ✓</small> : null}</td><td>{customer.totalOrders}</td><td><b>{Math.round(customer.totalSpent).toLocaleString("uz-UZ")} UZS</b></td><td>{Math.round(average).toLocaleString("uz-UZ")} UZS</td><td>—</td><td><span className={`customer-segment${customer.welcomeDiscountEligible ? " is-welcome" : ""}`}>{customer.isActive === false ? "Nofaol" : customer.welcomeDiscountEligible ? `${customer.welcomeDiscountPercent || 15}% welcome` : "Faol"}</span></td></tr>; })}{!filtered.length && <tr><td colSpan={8}><Empty>{query ? "Qidiruv bo‘yicha mijoz topilmadi." : "Hali customer yozuvi yo‘q."}</Empty></td></tr>}</tbody></table></div>}<div className="admin-table-pagination"><span>{filtered.length} ta natija</span></div></div>
    {opening && <p className="customer-detail-loading">Mijoz profili yuklanmoqda…</p>}{detailError && <p className="admin-module-state is-error">{detailError}</p>}
    {selected && <div className="inventory-confirm-backdrop customer-detail-backdrop" onMouseDown={closeProfile}><section className="customer-detail-dialog" role="dialog" aria-modal="true" aria-label={`${customerName(selected)} profili`} onMouseDown={(event) => event.stopPropagation()}><header><div><p className="ui-overline">MIJOZ PROFILI</p><h3>{customerName(selected)}</h3><span>{selected.email || "Email kiritilmagan"}</span></div><button type="button" onClick={closeProfile} aria-label="Yopish">×</button></header><div className="customer-detail-metrics"><div><span>Buyurtmalar</span><b>{selected.totalOrders} ta</b></div><div><span>To‘langan</span><b>{selected.paidOrders} ta</b></div><div><span>Jami savdo</span><b>{money(selected.totalSpent, "UZS")}</b></div><div><span>O‘rtacha chek</span><b>{money(selected.averageOrder, "UZS")}</b></div></div><div className="customer-detail-columns"><section><h4>Aloqa va joylashuv</h4><dl><div><dt>Telefon</dt><dd>{selected.phone || "—"}</dd></div><div><dt>Hudud</dt><dd>{selected.region || "—"}</dd></div><div><dt>Ro‘yxatdan o‘tgan</dt><dd>{readableDate(selected.createdAt)}</dd></div><div><dt>Oxirgi kirish</dt><dd>{selected.lastLoginAt ? readableDate(selected.lastLoginAt) : "—"}</dd></div></dl>{selected.addresses.length ? <div className="customer-addresses">{selected.addresses.map((address) => <p key={address.id}><b>{address.isDefault ? "Asosiy manzil" : "Manzil"}</b><span>{[address.country, address.city, address.line1, address.line2, address.postalCode].filter(Boolean).join(", ")}</span></p>)}</div> : <p className="customer-detail-empty">Saqlangan manzil yo‘q.</p>}</section><section><h4>Buyurtmalar tarixi</h4><div className="customer-detail-orders">{selected.orders.map((order) => <article key={order.id}><div><button type="button" className="customer-receipt-trigger" onClick={() => setReceipt(order)}>#{order.orderNumber}</button><span>{readableDate(order.createdAt)} · {order.paymentStatus}</span><small>{order.items.map((item) => `${item.title} × ${item.quantity}`).join(", ") || "Mahsulot yo‘q"}</small></div><strong>{money(Number(order.totalAmount), order.currencyCode || "UZS")}</strong></article>)}{!selected.orders.length && <p className="customer-detail-empty">Bu mijozda buyurtma yo‘q.</p>}</div></section></div></section></div>}
    {receipt && <div className="inventory-confirm-backdrop customer-receipt-backdrop" onMouseDown={() => setReceipt(null)}><section className="customer-receipt-dialog" role="dialog" aria-modal="true" aria-label={`Chek #${receipt.orderNumber}`} onMouseDown={(event) => event.stopPropagation()}><header><div><p className="ui-overline">BUYURTMA CHEKI</p><h3>Chek #{receipt.orderNumber}</h3><span>{readableDate(receipt.createdAt)} · {receipt.paymentStatus}</span></div><button type="button" onClick={() => setReceipt(null)} aria-label="Yopish">×</button></header><div className="customer-receipt-items">{receipt.items.map((item, index) => <article key={`${item.sku || item.title}-${index}`}><div><b>{item.title}</b><span>{item.sku || "SKU yo‘q"} × {item.quantity}</span></div><strong>{money(Number(item.unitPrice) * item.quantity, receipt.currencyCode || "UZS")}</strong></article>)}</div><dl><div><dt>To‘lov turi</dt><dd>{receipt.paymentMethod || "—"}</dd></div><div><dt>Buyurtma holati</dt><dd>{receipt.status}</dd></div><div className="is-total"><dt>Jami</dt><dd>{money(Number(receipt.totalAmount), receipt.currencyCode || "UZS")}</dd></div></dl></section></div>}
  </section>;
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="admin-empty-v2">{children}</p>;
}
function toastTone(message: string, forced?: "success" | "warning" | "error") {
  if (forced) return forced;
  const text = message.toLocaleLowerCase("uz-UZ");
  if (/saqlanmadi|o‘chirilmadi|yaratilmagan|xato|yetarli|manfiy|muvaffaqiyatsiz|rad et/.test(text)) return "error";
  if (/kiriting|tanlang|majburiy|vaqtincha|draft|archive|kutilmoqda|to‘ldir/.test(text)) return "warning";
  return "success";
}
function AdminToast({ message, tone }: { message?: string; tone?: "success" | "warning" | "error" }) {
  const [visible, setVisible] = useState(Boolean(message));
  useEffect(() => {
    if (!message) { setVisible(false); return; }
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), tone === "error" ? 15000 : 8000);
    return () => window.clearTimeout(timeout);
  }, [message, tone]);
  if (!message || !visible) return null;
  const variant = toastTone(message, tone);
  return <p key={message} role="status" className={`admin-toast ui-alert ui-alert--${variant}`}>{message}</p>;
}
function flavor(x: string) {
  return x === "active" || x === "paid" || x === "delivered"
    ? "success"
    : x === "draft" || x === "pending"
      ? "warning"
      : ("danger" as const);
}
type OrderStage = "pending" | "paid" | "on-way" | "success" | "fail";
const orderStage = (order: Pick<Order, "status" | "paymentStatus" | "fulfillmentStatus">): OrderStage => {
  const status = order.status.toLowerCase(); const payment = order.paymentStatus.toLowerCase(); const fulfillment = (order.fulfillmentStatus || "").toLowerCase();
  if (["cancelled", "refunded", "failed", "fail"].includes(status) || ["failed", "fail", "refunded"].includes(payment)) return "fail";
  if (["delivered", "success", "completed"].includes(status) || ["delivered", "success", "completed"].includes(fulfillment)) return "success";
  if (["shipped", "on_way", "on way", "in_transit"].includes(status) || ["shipped", "on_way", "on way", "in_transit"].includes(fulfillment)) return "on-way";
  if (payment === "paid" || ["paid", "processing"].includes(status)) return "paid";
  return "pending";
};
function OrderStageBadge({ order }: { order: Pick<Order, "status" | "paymentStatus" | "fulfillmentStatus"> }) {
  const stage = orderStage(order); const label: Record<OrderStage, string> = { pending: "PENDING", paid: "PAID", "on-way": "ON WAY", success: "SUCCESS", fail: "FAIL" };
  return <span className={`order-stage-badge is-${stage}`}><i aria-hidden="true" />{label[stage]}</span>;
}

type DashboardData = {
  currency?: { code?: string; available?: boolean };
  kpis?: { current?: Record<string, number>; previous?: Record<string, number>; changes?: Record<string, number | null> };
  chart?: { metric?: string; granularity?: string; current?: Array<{ label: string; value: number }>; previous?: Array<{ label: string; value: number }>; currentTotal?: number; previousTotal?: number; change?: number | null; financial?: boolean };
  monthlySales?: Array<{ label: string; value: number }>;
  team?: Array<{ id: string; firstName: string; lastName: string; email: string; role: string; isActive: boolean; lastSeen?: string | null; online: boolean }>;
  activity?: Array<{ id: string; action: string; entityType: string; entityId?: string | null; user: string; createdAt: string }>;
};
const DASHBOARD_METRICS: Array<[string, string]> = [["visitors", "Tashrif buyurganlar"], ["customers", "Mijozlar"], ["orders", "Buyurtmalar"], ["units", "Sotilgan mahsulotlar"], ["revenue", "Savdo / Revenue"], ["profit", "Foyda"]];
const DASHBOARD_PERIODS: Array<[string, string]> = [["today", "Kun"], ["7d", "Hafta"], ["month", "Oy"], ["year", "Yil"]];
function dashboardMoney(value: number, currency: string) {
  const amount = new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: currency === "UZS" ? 0 : 2 }).format(value);
  return currency === "USD" ? `$${amount}` : currency === "EUR" ? `€${amount}` : `${amount} ${currency}`;
}
function dashboardTime(value?: string | null) {
  if (!value) return "Faollik yozilmagan";
  const diff = Date.now() - new Date(value).valueOf();
  if (diff < 60_000) return "Hozirgina";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min oldin`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} soat oldin`;
  return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function dashboardActivityTitle(action: string, entityType: string) {
  const actions: Record<string, string> = { created: "Yaratildi", activated: "Faollashtirildi", deactivated: "O‘chirildi", updated: "Yangilandi", deleted: "O‘chirildi", logged_in: "Tizimga kirildi", registered: "Ro‘yxatdan o‘tdi" };
  const entities: Record<string, string> = { product_discount: "chegirma", product: "mahsulot", customer: "mijoz", partner: "hamkor", admin_session: "admin sessiyasi", order: "buyurtma" };
  const entity = entities[entityType] ?? entityType.replaceAll("_", " ");
  return entity ? `${actions[action] ?? action.replaceAll("_", " ")} · ${entity}` : (actions[action] ?? action.replaceAll("_", " "));
}

let orderAlertAudio: AudioContext | null = null;
function prepareOrderAlertSound() {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  orderAlertAudio ??= new AudioContextClass();
  if (orderAlertAudio.state === "suspended") void orderAlertAudio.resume();
}
function playOrderAlertSound() {
  if (!orderAlertAudio || orderAlertAudio.state !== "running") return;
  const now = orderAlertAudio.currentTime;
  [0, .16].forEach((offset, index) => {
    const tone = orderAlertAudio!.createOscillator(); const gain = orderAlertAudio!.createGain();
    tone.type = "sine"; tone.frequency.setValueAtTime(index ? 880 : 660, now + offset);
    gain.gain.setValueAtTime(.0001, now + offset); gain.gain.exponentialRampToValueAtTime(.14, now + offset + .012); gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .13);
    tone.connect(gain).connect(orderAlertAudio!.destination); tone.start(now + offset); tone.stop(now + offset + .14);
  });
}
function DashboardOverview({ dashboard, currency, period, metric, granularity, customFrom, customTo, onCurrency, onPeriod, onMetric, onGranularity, onCustomFrom, onCustomTo }: { dashboard: DashboardData | null; currency: string; period: string; metric: string; granularity: string; customFrom: string; customTo: string; onCurrency: (value: string) => void; onPeriod: (value: string) => void; onMetric: (value: string) => void; onGranularity: (value: string) => void; onCustomFrom: (value: string) => void; onCustomTo: (value: string) => void }) {
  const kpis = dashboard?.kpis?.current ?? {}; const changes = dashboard?.kpis?.changes ?? {}; const chart = dashboard?.chart; const chartCurrency = dashboard?.currency?.code ?? currency;
  const cards: Array<[string, string, typeof Package, boolean]> = [["Jami mijozlar", "customers", Users, false], ["Jami savdo", "revenue", BarChart3, true], ["Ombordagi mahsulotlar", "inventory", Package, false], ["Jami sotilgan birliklar", "units", ShoppingBag, false], ["Asosiy mahsulot modellari", "baseProducts", Box, false], ["Buyurtmalar", "orders", ClipboardList, false], ["O‘rtacha chek", "averageOrderValue", BarChart3, true], ["Foyda", "profit", ArrowUp, true]];
  const current = chart?.current ?? []; const previous = chart?.previous ?? []; const labels = Array.from(new Set([...current.map((item) => item.label), ...previous.map((item) => item.label)]));
  const chartFinancial = chart?.financial ?? false;
  const metricCards = cards.map(([label, key, Icon, financial]) => { const count = new Intl.NumberFormat("uz-UZ").format(kpis[key] ?? 0); return { label, icon: Icon, change: changes[key], value: financial ? dashboardMoney(kpis[key] ?? 0, chartCurrency) : key === "inventory" ? `${count} dona` : count }; });
  return <section className="dashboard-overview">
    <header className="dashboard-controls"><div><p className="ui-overline">REAL-TIME OVERVIEW</p><h2>Dashboard</h2></div><div className="dashboard-control-fields"><label>Valyuta<select value={currency} onChange={(event) => onCurrency(event.target.value)}>{["UZS", "USD", "EUR", "RUB", "KZT"].map((code) => <option key={code} value={code}>{code}</option>)}</select></label></div></header>
    {dashboard?.currency?.available === false && <p className="dashboard-rate-warning">{currency} kursi <b>currency-rates</b> sozlamasida kiritilmagan. Moliyaviy qiymatlar UZSda ko‘rsatilmoqda.</p>}
    <EcommerceMetrics metrics={metricCards} />
    <Card className="dashboard-chart-card tailadmin-statistics-card"><CardHeader className="tailadmin-statistics-head"><div><CardTitle>Statistika</CardTitle><CardDescription>Tanlangan davr bo‘yicha haqiqiy ko‘rsatkichlar.</CardDescription></div><div className="tailadmin-statistics-controls"><div className="tailadmin-statistics-metrics">{DASHBOARD_METRICS.map(([value, label]) => <button type="button" className={metric === value ? "is-active" : ""} onClick={() => onMetric(value)} key={value}>{label}</button>)}</div><label className="tailadmin-statistics-period"><CalendarDays size={18} /><select value={period} onChange={(event) => { const value = event.target.value; onPeriod(value); onGranularity(value === "year" ? "monthly" : "daily"); }}>{DASHBOARD_PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></CardHeader><CardContent><div className="dashboard-chart-summary"><span>Joriy davr<b>{chartFinancial ? dashboardMoney(chart?.currentTotal ?? 0, chartCurrency) : new Intl.NumberFormat("uz-UZ").format(chart?.currentTotal ?? 0)}</b></span><span>Oldingi davr<b>{chartFinancial ? dashboardMoney(chart?.previousTotal ?? 0, chartCurrency) : new Intl.NumberFormat("uz-UZ").format(chart?.previousTotal ?? 0)}</b></span><strong className={(chart?.change ?? 0) >= 0 ? "is-positive" : "is-negative"}>{chart?.change === null || chart?.change === undefined ? "—" : `${chart.change >= 0 ? "+" : ""}${chart.change.toFixed(1)}%`}</strong></div>{labels.length ? <StatisticsChart current={current} previous={previous} /> : <div className="dashboard-chart-wrap"><p>Tanlangan davrda haqiqiy ma’lumot yo‘q.</p></div>}<div className="dashboard-legend"><span><i /> Joriy davr</span><span><i /> Oldingi davr</span></div></CardContent></Card>
    <Card className="tailadmin-monthly-sales-card"><CardHeader><div><CardTitle>Oylik savdo</CardTitle><CardDescription>Joriy yildagi faqat to‘langan buyurtmalar.</CardDescription></div><button type="button" className="tailadmin-chart-more" aria-label="Oylik savdo menyusi"><MoreVertical size={20} /></button></CardHeader><CardContent>{dashboard?.monthlySales?.length ? <MonthlySalesChart points={dashboard.monthlySales} /> : <div className="dashboard-chart-wrap"><p>Oylik savdo ma’lumoti yo‘q.</p></div>}</CardContent></Card>
    <div className="dashboard-lower-grid"><Card><CardHeader><div><p className="ui-overline">JAMOA</p><CardTitle>Jamoa faolligi</CardTitle></div></CardHeader><CardContent><div className="dashboard-team">{(dashboard?.team ?? []).map((member) => <article key={member.id}><span className="dashboard-avatar">{`${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}` || member.email[0]?.toUpperCase()}</span><div><b>{`${member.firstName} ${member.lastName}`.trim() || member.email}</b><small>{member.role}</small></div><span className={member.online && member.isActive ? "is-online" : "is-offline"}>{member.online && member.isActive ? "● Online" : `○ ${dashboardTime(member.lastSeen)}`}</span></article>)}{!dashboard?.team?.length && <p className="dashboard-empty">Jamoa ma’lumoti yo‘q.</p>}</div></CardContent></Card><Card><CardHeader><div><p className="ui-overline">AUDIT</p><CardTitle>So‘nggi faollik</CardTitle></div></CardHeader><CardContent><div className="dashboard-activity">{(dashboard?.activity ?? []).map((item) => <article key={item.id}><b>{item.action} · {item.entityType}</b><span>{item.user} · {dashboardTime(item.createdAt)}</span></article>)}{!dashboard?.activity?.length && <p className="dashboard-empty">Audit yozuvlari yo‘q.</p>}</div></CardContent></Card></div>
  </section>;
}

type ProductDiscountRecord = { id: string; productId: string; color?: string | null; size?: string | null; percent: number; endsAt?: string | null; isActive: boolean; discountSoldQuantity?: number; product?: Pick<Product, "title" | "metadata" | "price" | "currencyCode"> };
function DiscountManager({ token, products, onNotice }: { token: string; products: Product[]; onNotice: (message: string) => void }) {
  const [items, setItems] = useState<ProductDiscountRecord[]>([]); const [query, setQuery] = useState(""); const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); const [scope, setScope] = useState<"sku" | "color" | "size">("sku"); const [color, setColor] = useState(""); const [size, setSize] = useState(""); const [percent, setPercent] = useState(10); const [salePrice, setSalePrice] = useState(""); const [endsAt, setEndsAt] = useState(""); const [saving, setSaving] = useState(false); const [deleteCandidate, setDeleteCandidate] = useState<ProductDiscountRecord | null>(null);
  const load = useCallback(async () => setItems(await api<ProductDiscountRecord[]>("/admin/catalog/discounts", token)), [token]);
  useEffect(() => { void load().catch(() => undefined); }, [load]);
  const matches = products.filter((product) => `${product.title} ${product.metadata?.article || ""} ${product.variants.map((variant) => variant.sku).join(" ")}`.toLocaleLowerCase("uz-UZ").includes(query.trim().toLocaleLowerCase("uz-UZ"))).map((product) => { const prices = product.variants.map((variant) => amountOf(variant.price ?? product.price)).filter((price) => price > 0); return prices.length ? { ...product, price: String(Math.min(...prices)) } : product; });
  const targetVariants = (selectedProduct?.variants ?? []).filter((variant) => scope === "sku" || (variant.color || "Rangsiz") === color).filter((variant) => scope !== "size" || (variant.size || "ONE SIZE") === size);
  const baseAmount = Math.min(...targetVariants.map((variant) => amountOf(variant.price || selectedProduct?.price)).filter((value) => value > 0), amountOf(selectedProduct?.price));
  const colors = [...new Set((selectedProduct?.variants ?? []).map((variant) => variant.color || "Rangsiz"))]; const sizes = [...new Set((selectedProduct?.variants ?? []).filter((variant) => !color || (variant.color || "Rangsiz") === color).map((variant) => variant.size || "ONE SIZE"))];
  useEffect(() => { if (selectedProduct && baseAmount > 0) setSalePrice(String(Math.round(baseAmount * (100 - percent) / 100))); }, [selectedProduct?.id, scope, color, size, baseAmount, percent]);
  const open = (product: Product) => { setSelectedProduct(product); setScope("sku"); setColor(""); setSize(""); setPercent(10); setSalePrice(String(Math.round(amountOf(product.price) * .9))); setEndsAt(""); };
  const setPercentAndPrice = (value: number) => { const next = Math.max(1, Math.min(99, value || 1)); setPercent(next); if (baseAmount > 0) setSalePrice(String(Math.round(baseAmount * (100 - next) / 100))); };
  const setPriceAndPercent = (value: string) => { setSalePrice(value); const price = Number(value); if (baseAmount > 0 && price > 0) setPercent(Math.max(1, Math.min(99, Math.round((1 - price / baseAmount) * 100)))); };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!selectedProduct || !percent || (scope !== "sku" && !color) || (scope === "size" && !size)) return; setSaving(true); try { await api("/admin/catalog/discounts", token, { method: "POST", body: JSON.stringify({ productId: selectedProduct.id, color: scope === "sku" ? null : color, size: scope === "size" ? size : null, percent, endsAt: endsAt ? new Date(endsAt).toISOString() : null }) }); await load(); setSelectedProduct(null); onNotice("Chegirma saytda faollashtirildi."); } finally { setSaving(false); } };
  const remove = async () => { if (!deleteCandidate) return; setSaving(true); try { await api(`/admin/catalog/discounts/${deleteCandidate.id}`, token, { method: "DELETE" }); await load(); setDeleteCandidate(null); onNotice("Chegirma butunlay o‘chirildi."); } finally { setSaving(false); } };
  const toggleActive = async (item: ProductDiscountRecord) => { setSaving(true); try { await api(`/admin/catalog/discounts/${item.id}`, token, { method: "PATCH", body: JSON.stringify({ isActive: !item.isActive }) }); await load(); onNotice(item.isActive ? "Chegirma vaqtincha o‘chirildi." : "Chegirma qayta yoqildi."); } finally { setSaving(false); } };
  const timer = (value?: string | null) => value ? new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Taymersiz";
  useEffect(() => { const showInfo = (event: MouseEvent) => { const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-discount-extra="info"]') : null; if (!target) return; event.preventDefault(); event.stopPropagation(); const row = target.closest("tr"); const rows = [...document.querySelectorAll(".discount-manager > .ui-card:nth-of-type(2) tbody tr")]; const item = row ? items[rows.indexOf(row)] : undefined; if (!item) return; document.querySelector(".discount-info-backdrop")?.remove(); const product = item.product; const layer = document.createElement("div"); layer.className = "discount-info-backdrop"; layer.innerHTML = `<section class="discount-info-dialog" role="dialog" aria-modal="true"><button type="button" aria-label="Yopish" data-close>×</button><p>CHEGIRMA MA’LUMOTLARI</p><h3>${product?.title || "Mahsulot"}</h3><dl><div><dt>Variant</dt><dd>${item.size ? `${item.color} · ${item.size}` : item.color || "Barcha variant"}</dd></div><div><dt>Chegirma</dt><dd>−${item.percent}%</dd></div><div><dt>Chegirmadagi narx</dt><dd>${money(Math.round(amountOf(product?.price) * (100 - item.percent) / 100), product?.currencyCode || "UZS")}</dd></div><div><dt>Sotilgan</dt><dd>${item.discountSoldQuantity || 0} ta</dd></div><div><dt>Muddat</dt><dd>${timer(item.endsAt)}</dd></div><div><dt>Holat</dt><dd>${item.isActive ? "Faol" : "Off"}</dd></div></dl></section>`; layer.addEventListener("click", (click) => { if (click.target === layer || (click.target instanceof Element && click.target.closest("[data-close]"))) layer.remove(); }); document.body.append(layer); }; document.addEventListener("click", showInfo, true); return () => document.removeEventListener("click", showInfo, true); }, [items]);
  useEffect(() => { const frame = window.requestAnimationFrame(() => document.querySelectorAll<HTMLElement>(".discount-manager > .ui-card:nth-of-type(2) tbody tr").forEach((row) => { const status = row.cells[6]?.querySelector<HTMLElement>(".ui-badge"); if (status?.textContent?.includes("Vaqtincha o‘chirilgan")) { status.textContent = "Off"; status.classList.add("discount-status-off"); } const view = row.querySelector<HTMLElement>('[data-discount-extra="view"]'); if (view && !view.dataset.eyeMounted) { view.dataset.eyeMounted = "true"; createRoot(view).render(<Eye size={16} strokeWidth={2} />); } })); return () => window.cancelAnimationFrame(frame); }, [items]);
  useEffect(() => { document.querySelectorAll<HTMLElement>(".discount-manager > .ui-card:nth-of-type(2) tbody tr").forEach((row) => { const status = row.cells[6]?.querySelector<HTMLElement>(".ui-badge"); if (status?.textContent?.includes("Vaqtincha o‘chirilgan")) { status.textContent = "Off"; status.classList.add("discount-status-off"); } const view = row.querySelector<HTMLElement>('[data-discount-extra="view"]'); if (view && !view.dataset.eyeMounted) { view.dataset.eyeMounted = "true"; createRoot(view).render(<Eye size={16} strokeWidth={2} />); } }); }, [items]);
  useEffect(() => { const toolbar = document.querySelector<HTMLElement>(".discount-manager > .ui-card:first-child .inventory-toolbar"); if (!toolbar || toolbar.querySelector("[data-discount-filter]")) return; const toggle = document.createElement("button"); toggle.type = "button"; toggle.dataset.discountFilter = "toggle"; toggle.className = "discount-source-filter-toggle"; toggle.innerHTML = "<span>☷</span> Filter"; const panel = document.createElement("div"); panel.dataset.discountFilter = "panel"; panel.className = "discount-source-filter-panel"; panel.innerHTML = '<label>Qoldiq<select data-filter="stock"><option value="all">Barchasi</option><option value="in">Mavjud</option><option value="out">Tugagan</option></select></label><label>Min. narx<input data-filter="min" type="number" min="0" placeholder="0" /></label><label>Max. narx<input data-filter="max" type="number" min="0" placeholder="Chegarasiz" /></label><div><button type="button" data-filter="reset">Tozalash</button><button type="button" data-filter="apply">Qo‘llash</button></div>'; const apply = () => { const stock = panel.querySelector<HTMLSelectElement>('[data-filter="stock"]')?.value || "all"; const min = Number(panel.querySelector<HTMLInputElement>('[data-filter="min"]')?.value || 0); const maxText = panel.querySelector<HTMLInputElement>('[data-filter="max"]')?.value || ""; const max = maxText ? Number(maxText) : Infinity; document.querySelectorAll<HTMLTableRowElement>(".discount-manager > .ui-card:first-child tbody tr").forEach((row) => { const price = Number((row.cells[2]?.textContent || "").replace(/[^0-9]/g, "")); const stockValue = Number((row.cells[4]?.textContent || "").replace(/[^0-9]/g, "")); row.hidden = price < min || price > max || (stock === "in" && stockValue <= 0) || (stock === "out" && stockValue > 0); }); panel.classList.remove("is-open"); }; toggle.addEventListener("click", () => panel.classList.toggle("is-open")); panel.querySelector('[data-filter="apply"]')?.addEventListener("click", apply); panel.querySelector('[data-filter="reset"]')?.addEventListener("click", () => { panel.querySelectorAll<HTMLInputElement>("input").forEach((input) => input.value = ""); const stock = panel.querySelector<HTMLSelectElement>("select"); if (stock) stock.value = "all"; document.querySelectorAll<HTMLTableRowElement>(".discount-manager > .ui-card:first-child tbody tr").forEach((row) => row.hidden = false); panel.classList.remove("is-open"); }); toolbar.append(toggle, panel); }, [products]);
  useEffect(() => { const rows = document.querySelectorAll<HTMLElement>(".discount-manager > .ui-card:nth-of-type(2) tbody tr"); rows.forEach((row, index) => { const media = (items[index]?.product as (Product & { media?: Array<{ url?: string }> }) | undefined)?.media?.[0]?.url; if (!media) return; const source = media.startsWith("http") ? media : `${API.replace(/\/api$/, "")}${media}`; row.style.setProperty("--discount-product-image", `url("${source.replace(/"/g, "\\\"")}")`); }); }, [items]);
  useEffect(() => { const rows = document.querySelectorAll<HTMLTableRowElement>(".discount-manager > .ui-card:nth-of-type(2) tbody tr"); rows.forEach((row, index) => { const item = items[index]; const actions = row.querySelector<HTMLElement>(".inventory-actions"); if (!item || !actions || actions.querySelector("[data-discount-extra]")) return; const product = item.product as (typeof item.product & { slug?: string }) | undefined; const info = document.createElement("button"); info.type = "button"; info.dataset.discountExtra = "info"; info.className = "discount-extra-action"; info.textContent = "Ma’lumotlar"; info.addEventListener("click", () => window.alert([`Mahsulot: ${product?.title || item.productId}`, `Variant: ${item.size ? `${item.color} · ${item.size}` : item.color || "Barcha variant"}`, `Chegirma: −${item.percent}%`, `Asl narx: ${money(amountOf(product?.price), product?.currencyCode || "UZS")}`, `Chegirmadagi narx: ${money(Math.round(amountOf(product?.price) * (100 - item.percent) / 100), product?.currencyCode || "UZS")}`, `Muddat: ${timer(item.endsAt)}`, `Holat: ${item.isActive ? "Faol" : "Vaqtincha o‘chirilgan"}`].join("\n"))); const view = document.createElement("a"); view.dataset.discountExtra = "view"; view.className = "discount-extra-action discount-extra-view"; view.href = product?.slug ? `/products/${product.slug}` : "/shop"; view.title = "Mahsulotni ko‘rish"; view.setAttribute("aria-label", "Mahsulotni ko‘rish"); view.textContent = "◉"; actions.prepend(info); actions.prepend(view); }); }, [items]);
  return <section className="discount-manager"><Card><CardHeader><div><p className="ui-overline">CHEGIRMALI MAHSULOTLAR</p><CardTitle>Mahsulotni tanlang</CardTitle><CardDescription>Qidiruv natijasidagi mahsulotni bosing — chegirma sozlamalari oynada ochiladi.</CardDescription></div></CardHeader><CardContent><div className="inventory-toolbar"><label><span>Qidirish</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mahsulot nomi, artikul yoki SKU" /></label></div><div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Mahsulot</th><th>Artikul / SKU</th><th>Narx</th><th>Variantlar</th><th>Qoldiq</th><th /></tr></thead><tbody>{matches.map((product) => <tr key={product.id}><td><div className="inventory-product-cell"><div className="inventory-thumb"><AdminProductImageRotator product={product} /></div><span><b>{product.title}</b><small>{product.metadata?.article || "Artikul yo‘q"}</small></span></div></td><td>{product.variants.map((variant) => variant.sku).filter(Boolean).join(", ") || "—"}</td><td>{money(amountOf(product.price), product.currencyCode)}</td><td>{product.variants.length}</td><td>{product.variants.reduce((sum, variant) => sum + variant.inventoryQuantity, 0)}</td><td><Button type="button" size="sm" onClick={() => open(product)}>Chegirma berish</Button></td></tr>)}{!matches.length && <tr><td colSpan={6}><Empty>Mahsulot topilmadi.</Empty></td></tr>}</tbody></table></div></CardContent></Card><Card><CardHeader><div><p className="ui-overline">ACTIVE DISCOUNTS</p><CardTitle>Faol chegirmalar</CardTitle></div></CardHeader><CardContent><div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Mahsulot</th><th>Daraja</th><th>Asl narx</th><th>Chegirma</th><th>Chegirmadagi narx</th><th>Taymer / muddat</th><th>Holat</th><th /></tr></thead><tbody>{items.map((item) => { const original = amountOf(item.product?.price); const sale = Math.round(original * (100 - item.percent) / 100); const active = item.isActive && (!item.endsAt || new Date(item.endsAt) > new Date()); return <tr key={item.id}><td><b>{item.product?.metadata?.article || item.product?.title || item.productId}</b></td><td>{item.size ? `${item.color} · ${item.size}` : item.color || "Barcha variant"}</td><td>{money(original, item.product?.currencyCode || "UZS")}</td><td><b>−{item.percent}%</b></td><td><b>{money(sale, item.product?.currencyCode || "UZS")}</b></td><td>{timer(item.endsAt)}</td><td><Badge variant={active ? "success" : "warning"}>{active ? "Faol" : item.isActive ? "Tugagan" : "Vaqtincha o‘chirilgan"}</Badge></td><td><div className="inventory-actions"><Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void toggleActive(item)}>{item.isActive ? "Vaqtincha o‘chirish" : "Qayta yoqish"}</Button><Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => setDeleteCandidate(item)}>O‘chirish</Button></div></td></tr>; })}{!items.length && <tr><td colSpan={8}><Empty>Chegirma yo‘q.</Empty></td></tr>}</tbody></table></div></CardContent></Card>{selectedProduct && <div className="inventory-confirm-backdrop" onMouseDown={() => !saving && setSelectedProduct(null)}><form className="inventory-confirm" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><p className="ui-overline">CHEGIRMA SOZLAMASI</p><h3>{selectedProduct.title}</h3><p>{selectedProduct.metadata?.article || "Artikulsiz mahsulot"} · Asl narx: <b>{money(baseAmount, selectedProduct.currencyCode)}</b></p><div className="ui-form ui-form-grid"><Field label="Daraja"><select value={scope} onChange={(event) => { setScope(event.target.value as "sku" | "color" | "size"); setColor(""); setSize(""); }}><option value="sku">Barcha rang va razmer</option><option value="color">Faqat rang</option><option value="size">Rang va razmer</option></select></Field>{scope !== "sku" && <Field label="Rang"><select required value={color} onChange={(event) => { setColor(event.target.value); setSize(""); }}><option value="">Tanlang</option>{colors.map((value) => <option key={value}>{value}</option>)}</select></Field>}{scope === "size" && <Field label="Razmer"><select required value={size} onChange={(event) => setSize(event.target.value)}><option value="">Tanlang</option>{sizes.map((value) => <option key={value}>{value}</option>)}</select></Field>}<Field label="Chegirma foizi"><input type="number" min="1" max="99" value={percent} onChange={(event) => setPercentAndPrice(Number(event.target.value))} /></Field><Field label="Chegirmadagi narx"><input type="number" min="1" value={salePrice} onChange={(event) => setPriceAndPercent(event.target.value)} /><small>Narx va foiz bir-biriga avtomatik bog‘langan.</small></Field><Field label="Muddat (ixtiyoriy)"><input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /><small>Bo‘sh qoldirilsa chegirma taymersiz davom etadi.</small></Field></div><div className="inventory-confirm-actions"><Button type="button" variant="outline" onClick={() => setSelectedProduct(null)}>Bekor qilish</Button><Button disabled={saving}>{saving ? "Saqlanmoqda…" : "Chegirmani saqlash"}</Button></div></form></div>}{deleteCandidate && <div className="admin-confirm-backdrop" onMouseDown={() => !saving && setDeleteCandidate(null)}><section className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-label="Chegirmani o‘chirish" onMouseDown={(event) => event.stopPropagation()}><p className="ui-overline">CHEGIRMANI O‘CHIRISH</p><h3>Butunlay o‘chirilsinmi?</h3><p>“{deleteCandidate.product?.title || deleteCandidate.productId}” chegirmasi qayta tiklanmaydi. Vaqtincha o‘chirish uchun jadvaldagi alohida tugmadan foydalaning.</p><div><Button type="button" variant="outline" disabled={saving} onClick={() => setDeleteCandidate(null)}>Bekor qilish</Button><Button type="button" disabled={saving} onClick={() => void remove()}>{saving ? "O‘chirilmoqda…" : "Butunlay o‘chirish"}</Button></div></section></div>}</section>;
}

type CurrencyRates = { rates: Record<string, number | null>; updatedAt?: string | null; source?: string; sourceUpdatedAt?: string | null; live?: boolean };
function CurrencyManager({ token, onNotice }: { token: string; onNotice: (message: string) => void }) {
  const [data, setData] = useState<CurrencyRates | null>(null); const [loading, setLoading] = useState(false); const codes = ["UZS", "USD", "EUR", "RUB", "KZT"];
  const load = useCallback(async () => setData(await api<CurrencyRates>("/admin/currencies", token)), [token]);
  useEffect(() => { void load().catch(() => onNotice("Valyuta kurslarini yuklab bo‘lmadi.")); }, [load, onNotice]);
  const refresh = async () => { setLoading(true); try { setData(await api<CurrencyRates>("/admin/currencies/refresh", token, { method: "POST" })); onNotice("Valyuta kurslari yangilandi."); } catch { onNotice("Jonli kurs manbasiga ulanib bo‘lmadi."); } finally { setLoading(false); } };
  return <section className="currency-manager"><Card><CardHeader><div><p className="ui-overline">LIVE EXCHANGE RATES</p><CardTitle>Valyutalar</CardTitle><CardDescription>Kurslar UZS bazasida: 1 birlik valyuta necha so‘m ekanini ko‘rsatadi.</CardDescription></div><Button type="button" disabled={loading} onClick={() => void refresh()}><RefreshCw size={16} />{loading ? "Yangilanmoqda…" : "Kurslarni yangilash"}</Button></CardHeader><CardContent><div className="currency-source"><span>{data?.live ? "● Jonli kurs" : "○ Saqlangan kurs"}</span><small>{data?.source || "Kurs manbasi"} · {data?.updatedAt ? new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.updatedAt)) : "Hali yangilanmagan"}</small></div><div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Valyuta</th><th>Belgi</th><th>1 birlik = UZS</th><th>Holat</th><th>Oxirgi yangilanish</th></tr></thead><tbody>{codes.map((code) => { const rate = data?.rates?.[code]; return <tr key={code}><td><b>{code}</b></td><td>{{ UZS: "so‘m", USD: "$", EUR: "€", RUB: "₽", KZT: "₸" }[code]}</td><td>{rate ? new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: code === "UZS" ? 0 : 2 }).format(rate) : "—"}</td><td>{rate ? "Faol" : "Kurs yo‘q"}</td><td>{data?.updatedAt ? new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.updatedAt)) : "—"}</td></tr>; })}</tbody></table></div></CardContent></Card></section>;
}

export default function AdminConsole() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [contentSubsection, setContentSubsection] = useState<ContentSubsection>("main-banner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(
    null,
  );
  const [dashboardCurrency, setDashboardCurrency] = useState("UZS");
  const [dashboardPeriod, setDashboardPeriod] = useState("month");
  const [dashboardMetric, setDashboardMetric] = useState("revenue");
  const [dashboardGranularity, setDashboardGranularity] = useState("daily");
  const [dashboardFrom, setDashboardFrom] = useState("");
  const [dashboardTo, setDashboardTo] = useState("");
  const [adminProfile, setAdminProfile] = useState<{ firstName?: string; lastName?: string; email?: string; role?: string } | null>(null);
  const [adminTheme, setAdminTheme] = useState<"light" | "midnight" | "violet" | "graphite" | "forest">("light");
  const [sidebarCompact, setSidebarCompact] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readActivityIds, setReadActivityIds] = useState<string[]>([]);
  const [notificationSection, setNotificationSection] = useState<"system" | "orders">("system");
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const orderNotificationIds = useRef(new Set<string>());
  const orderNotificationsReady = useRef(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [productSubsection, setProductSubsection] = useState<"all" | "transfer">("all");
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [collections, setCollections] = useState<Taxonomy[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [orderCustomer, setOrderCustomer] = useState<CustomerDetail | null>(null);
  const [orderCustomerLoading, setOrderCustomerLoading] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState("all");
  const [orderFilterOpen, setOrderFilterOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [lookbookEntries, setLookbookEntries] = useState<LookbookEntry[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [records, setRecords] = useState<MusicRecord[]>([]);
  const [storeNotifications, setStoreNotifications] = useState<StoreNotification[]>([]);
  const [pageBanners, setPageBanners] = useState<PageBannerDraft[]>([]);
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [users, setUsers] = useState<
    Array<{ id: string; email: string; role: string }>
  >([]);
  const [audit, setAudit] = useState<Record<string, unknown>[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectedProductId, setInspectedProductId] = useState<string | null>(null);
  const [productView, setProductView] = useState<"list" | "create" | "edit">(
    "list",
  );
  const [form, setForm] = useState(blankProduct());
  const [imageUrl, setImageUrl] = useState("");
  const [sizeGuideFile, setSizeGuideFile] = useState<File | null>(null);
  const [variant, setVariant] = useState(blankVariant());
  const [variantImageFiles, setVariantImageFiles] = useState<File[]>([]);
  const [additionalVariants, setAdditionalVariants] = useState<Array<ReturnType<typeof blankVariant>>>([]);
  const [additionalVariantFiles, setAdditionalVariantFiles] = useState<File[][]>([]);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [category, setCategory] = useState(blankTaxonomy());
  const [collection, setCollection] = useState(blankTaxonomy());
  const selected = products.find((p) => p.id === selectedId) ?? null;
  const inspectedProduct = products.find((p) => p.id === inspectedProductId) ?? null;
  const productVariants = selected?.variants ?? [];
  const availableVariantInventory = Math.max(
    0,
    Number(form.inventoryQuantity) -
      productVariants.reduce(
        (sum, item) =>
          sum + (item.id === editingVariantId ? 0 : item.inventoryQuantity),
        0,
      ),
  );
  const article = form.article.trim();
  const updateArticle = (value: string) => {
    setForm({ ...form, article: value });
    setVariant((current) => ({ ...current, sku: generatedVariantSku(value, current.color, current.size) }));
    setAdditionalVariants((current) => current.map((item) => ({ ...item, sku: generatedVariantSku(value, item.color, item.size) })));
  };
  const updateVariant = (updates: Partial<ReturnType<typeof blankVariant>>) => {
    setVariant((current) => {
      const next = { ...current, ...updates };
      return { ...next, sku: generatedVariantSku(form.article, next.color, next.size) };
    });
  };
  const creationDrafts = [variant, ...additionalVariants];
  const updateCreationDraft = (index: number, updates: Partial<ReturnType<typeof blankVariant>>) => {
    if (index === 0) {
      updateVariant(updates);
      return;
    }
    setAdditionalVariants((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index - 1) return item;
      const next = { ...item, ...updates };
      return { ...next, sku: generatedVariantSku(form.article, next.color, next.size) };
    }));
  };
  const addVariantSize = (index: number) => {
    const source = creationDrafts[index];
    setAdditionalVariants((current) => [...current, {
      ...blankVariant(),
      characteristicId: source.characteristicId,
      color: source.color,
      sku: generatedVariantSku(form.article, source.color, ""),
    }]);
    setAdditionalVariantFiles((current) => [...current, []]);
  };
  const removeVariantSize = (index: number) => {
    if (index === 0) {
      const [next, ...rest] = additionalVariants;
      setVariant(next ?? blankVariant());
      setAdditionalVariants(rest);
      setAdditionalVariantFiles((current) => current.slice(1));
      return;
    }
    setAdditionalVariants((current) => current.filter((_, itemIndex) => itemIndex !== index - 1));
    setAdditionalVariantFiles((current) => current.filter((_, itemIndex) => itemIndex !== index - 1));
  };
  const addVariantImage = (index: number, url: string, file: File | null) => {
    const appendUrl = (item: ReturnType<typeof blankVariant>) => {
      const imageUrl = url.trim();
      if (!imageUrl) return item;
      return item.imageUrl ? { ...item, extraImageUrls: [...item.extraImageUrls, imageUrl] } : { ...item, imageUrl };
    };
    if (index === 0) {
      setVariant((current) => appendUrl(current));
      if (file) setVariantImageFiles((current) => [...current, file]);
      return;
    }
    setAdditionalVariants((current) => current.map((item, itemIndex) => itemIndex === index - 1 ? appendUrl(item) : item));
    if (file) setAdditionalVariantFiles((current) => current.map((files, itemIndex) => itemIndex === index - 1 ? [...files, file] : files));
  };
  const removeVariantImage = (index: number, image: string) => {
    const source = creationDrafts[index];
    const groupKey = source.characteristicId || source.color.trim().toLocaleLowerCase("uz-UZ");
    const withoutImage = (item: ReturnType<typeof blankVariant>) => {
      const itemKey = item.characteristicId || item.color.trim().toLocaleLowerCase("uz-UZ");
      if (itemKey !== groupKey) return item;
      const remaining = [item.imageUrl, ...item.extraImageUrls].filter((url) => url && url !== image);
      return { ...item, imageUrl: remaining[0] ?? "", extraImageUrls: remaining.slice(1) };
    };
    setVariant((current) => withoutImage(current));
    setAdditionalVariants((current) => current.map(withoutImage));
  };
  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  };
  const openOrderCustomer = async (customerId?: string) => {
    if (!customerId) { setNotice("Bu buyurtmaga mijoz profili biriktirilmagan."); return; }
    setOrderCustomerLoading(true);
    try { setOrderCustomer(await api<CustomerDetail>(`/admin/customers/${customerId}`, token)); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Mijoz ma’lumotini olib bo‘lmadi."); }
    finally { setOrderCustomerLoading(false); }
  };
  const openOrderNotification = async (orderId?: string | null) => {
    if (!orderId) return;
    const known = orders.find((order) => order.id === orderId);
    if (known) { setSelectedOrder(known); return; }
    try {
      const latest = await api<Order[]>("/admin/orders", token);
      setOrders(latest);
      const order = latest.find((item) => item.id === orderId);
      if (order) setSelectedOrder(order); else setNotice("Buyurtma topilmadi.");
    } catch { setNotice("Buyurtma ma’lumotini ochib bo‘lmadi."); }
  };
  const enableOrderNotifications = async () => {
    prepareOrderAlertSound();
    if (!("Notification" in window)) { setNotice("Bu brauzer push bildirishnomalarini qo‘llamaydi."); return; }
    const permission = await Notification.requestPermission();
    setBrowserNotificationPermission(permission);
    if (permission === "granted") setNotice("Buyurtma bildirishnomalari yoqildi.");
    else setNotice("Chrome sozlamalaridan bildirishnomalarga ruxsat bering.");
  };
  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("order");
    if (!token || !orderId) return;
    void openOrderNotification(orderId);
    window.history.replaceState({}, "", "/admin");
  }, [token]);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const openOrder = (event: MessageEvent<{ type?: string; orderId?: string }>) => {
      if (event.data?.type === "siren-open-order") void openOrderNotification(event.data.orderId);
    };
    navigator.serviceWorker.addEventListener("message", openOrder);
    return () => navigator.serviceWorker.removeEventListener("message", openOrder);
  }, [token]);
  const catalog = useCallback(async () => {
    const [p, c, l, inventoryTransfers] = await Promise.all([
      api<Product[]>("/admin/catalog/products", token),
      api<Taxonomy[]>("/admin/catalog/categories", token),
      api<Taxonomy[]>("/admin/catalog/collections", token),
      api<InventoryTransfer[]>("/admin/catalog/transfers", token),
    ]);
    setProducts(p);
    setCategories(c);
    setCollections(l);
    setTransfers(inventoryTransfers);
  }, [token]);
  const refresh = useCallback(
    async (t = tab) => {
      if (t === "dashboard") {
        const query = new URLSearchParams({ currency: dashboardCurrency, period: dashboardPeriod, metric: dashboardMetric, granularity: dashboardGranularity });
        if (dashboardFrom) query.set("from", dashboardFrom);
        if (dashboardTo) query.set("to", dashboardTo);
        setDashboard(
          await api<Record<string, unknown>>(`/admin/dashboard?${query.toString()}`, token),
        );
      }
      if (t === "products" || t === "catalog" || t === "discounts" || t === "partners") await catalog();
      if (t === "orders") setOrders(await api<Order[]>("/admin/orders", token));
      if (t === "customers") setCustomers(await api<CustomerRecord[]>("/admin/customers", token));
      if (t === "pages") setPages(await api<CmsPage[]>("/admin/content/pages", token));
      if (t === "content") {
        const [nextBanners, nextLookbook, nextPosts, nextRecords, settings] = await Promise.all([
          api<Banner[]>("/admin/content/banners", token),
          api<LookbookEntry[]>("/admin/content/lookbook", token),
          api<BlogPost[]>("/admin/content/posts", token),
          api<MusicRecord[]>("/admin/content/records", token),
          api<SiteSetting[]>("/admin/content/settings", token),
        ]);
        setBanners(nextBanners);
        setLookbookEntries(nextLookbook);
        setBlogPosts(nextPosts);
        setRecords(nextRecords);
        const pageBannerSetting = settings.find((setting) => setting.key === "page-banners");
        const storedItems = pageBannerSetting?.value?.items;
        setPageBanners(Array.isArray(storedItems) ? (storedItems as PageBannerDraft[]).map((item) => ({ ...blankPageBanner(), ...item, cartItems: Array.isArray(item.cartItems) ? item.cartItems : [] })) : []);
      }
      if (t === "notifications") {
        const settings = await api<SiteSetting[]>("/admin/content/settings", token);
        const storedItems = settings.find((setting) => setting.key === "site-notifications")?.value?.items;
        setStoreNotifications(Array.isArray(storedItems) ? storedItems as StoreNotification[] : []);
      }
      if (t === "team") setUsers(await api("/admin/users", token));
      if (t === "audit") setAudit(await api("/admin/audit-logs", token));
    },
    [catalog, dashboardCurrency, dashboardFrom, dashboardGranularity, dashboardMetric, dashboardPeriod, dashboardTo, tab, token],
  );
  useEffect(() => {
    const v = localStorage.getItem("siren-admin-token");
    if (v) setToken(v);
    const savedTheme = localStorage.getItem("siren-admin-theme");
    if (savedTheme === "midnight" || savedTheme === "violet" || savedTheme === "graphite" || savedTheme === "forest" || savedTheme === "light") setAdminTheme(savedTheme);
    // The TailAdmin product layout starts with the navigation drawer closed.
    setSidebarCompact(true);
    localStorage.removeItem("siren-admin-sidebar-compact");
  }, []);
  useEffect(() => {
    if (!token) { setAdminProfile(null); return; }
    void api<{ firstName?: string; lastName?: string; email?: string; role?: string }>("/auth/me", token).then(setAdminProfile).catch(() => setAdminProfile(null));
  }, [token]);
  useEffect(() => {
    if (adminProfile?.role === "cashier" && !tab.startsWith("offline_")) setTab("offline_cashier");
  }, [adminProfile?.role, tab]);
  useEffect(() => { localStorage.setItem("siren-admin-theme", adminTheme); }, [adminTheme]);
  useEffect(() => { localStorage.setItem("siren-admin-sidebar-compact", String(sidebarCompact)); }, [sidebarCompact]);
  useEffect(() => {
    if ("Notification" in window) setBrowserNotificationPermission(Notification.permission);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/admin-notifications-sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    const signOutExpiredSession = () => setToken("");
    window.addEventListener("siren-admin-unauthorized", signOutExpiredSession);
    return () => window.removeEventListener("siren-admin-unauthorized", signOutExpiredSession);
  }, []);
  useEffect(() => {
    if (token) void run(() => refresh());
  }, [token, refresh]);
  const login = async (e: FormEvent) => {
    e.preventDefault();
    await run(async () => {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.message ?? "Kirish amalga oshmadi");
      localStorage.setItem("siren-admin-token", b.accessToken);
      setToken(b.accessToken);
    });
  };
  const pick = (p: Product) => {
    const translations = p.metadata?.translations;
    const [firstDraft, ...restDrafts] = p.variants.map(variantDraftFrom);
    setSelectedId(p.id);
    setProductView("edit");
    setForm({
      title: p.title,
      titleUz: translations?.titleUz ?? p.title,
      titleRu: translations?.titleRu ?? "",
      titleEn: translations?.titleEn ?? "",
      article: p.metadata?.article ?? "",
      slug: p.slug,
      description: p.description,
      descriptionUz: translations?.descriptionUz ?? p.description,
      descriptionRu: translations?.descriptionRu ?? "",
      descriptionEn: translations?.descriptionEn ?? "",
      status: p.status,
      price: p.price,
      currencyCode: p.currencyCode,
      categoryId: p.categoryId ?? "",
      gender: p.gender ?? "unisex",
      inventoryQuantity: Number(p.metadata?.baseInventoryQuantity ?? p.variants.reduce((sum, item) => sum + item.inventoryQuantity, 0)),
      sizeGuideImageUrl: p.metadata?.sizeGuideImageUrl ?? "",
      ikpuCode: p.metadata?.fiscal?.ikpuCode ?? "",
      packageCode: p.metadata?.fiscal?.packageCode ?? "",
      unitCode: p.metadata?.fiscal?.unitCode ?? "",
      vatPercent: Number(p.metadata?.fiscal?.vatPercent ?? 0),
    });
    setImageUrl(p.media[0]?.url ?? "");
    setSizeGuideFile(null);
    setVariant(firstDraft ?? blankVariant());
    setVariantImageFiles([]);
    setAdditionalVariants(restDrafts);
    setAdditionalVariantFiles(restDrafts.map(() => []));
    setShowVariantForm(true);
    setEditingVariantId(null);
  };
  const startCreate = () => {
    setSelectedId(null);
    setProductView("create");
    setForm(blankProduct());
    setImageUrl("");
    setSizeGuideFile(null);
    setVariant(blankVariant());
    setVariantImageFiles([]);
    setAdditionalVariants([]);
    setAdditionalVariantFiles([]);
    setShowVariantForm(true);
    setEditingVariantId(null);
  };
  const closeEditor = () => {
    setSelectedId(null);
    setProductView("list");
    setForm(blankProduct());
    setImageUrl("");
    setSizeGuideFile(null);
    setVariantImageFiles([]);
    setAdditionalVariants([]);
    setAdditionalVariantFiles([]);
    setShowVariantForm(false);
    setEditingVariantId(null);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) { setNotice("Kategoriya tanlang."); return; }
    if (!form.gender) { setNotice("Gender tanlang."); return; }
    const isCreate = !selectedId;
    const primaryTitle = form.titleUz.trim() || form.title.trim() || form.titleRu.trim() || form.titleEn.trim();
    const primaryDescription = form.descriptionUz.trim() || form.description.trim() || form.descriptionRu.trim() || form.descriptionEn.trim();
    if (!primaryTitle) {
      setError("Mahsulot nomini kamida bitta tilda kiriting.");
      return;
    }
    if (!article) {
      setError("Mahsulot uchun unikal artikul kiriting. Masalan: 11.");
      return;
    }
    if (products.some((product) => product.id !== selectedId && normalizedArticle(product.metadata?.article ?? "") === article)) {
      setError(`“${article}” artikuli boshqa mahsulotga tegishli. Har mahsulotda unikal artikul bo‘lishi kerak.`);
      return;
    }
    const allocated = selected?.variants.reduce(
      (sum, item) => sum + item.inventoryQuantity,
      0,
    ) ?? 0;
    if (Number(form.inventoryQuantity) < allocated) {
      setError(
        `Umumiy ombor soni variantlarga ajratilgan ${allocated} donadan kam bo‘la olmaydi.`,
      );
      return;
    }
    const variantDrafts = [variant, ...additionalVariants].map((item) => ({
      ...item,
      sku: generatedVariantSku(article, item.color, item.size) || item.sku,
    }));
    const variantsForCreation = isCreate
      ? variantDrafts
      : variantDrafts.filter((item) => Boolean(item.sourceId || item.sku.trim()));
    const variantPrices = variantsForCreation
      .map((item) => Number(item.price))
      .filter((price) => Number.isFinite(price) && price > 0);
    const effectiveProductPrice = form.price || (variantPrices.length ? String(Math.min(...variantPrices)) : "0");
    if (isCreate && variantsForCreation.some((item) => !item.sku.trim())) {
      setError("Har bir variant uchun rang kiriting. Sub-artikul asosiy artikul va rangdan avtomatik yaratiladi.");
      return;
    }
    if (isCreate && new Set(variantsForCreation.map((item) => item.sku.trim())).size !== variantsForCreation.length) {
      setError("Variant SKU lari takrorlanmasligi kerak.");
      return;
    }
    if (isCreate && variantsForCreation.reduce((sum, item) => sum + item.inventoryQuantity, 0) > Number(form.inventoryQuantity)) {
      setError("Variantlar ombori umumiy ombordagi sondan ko‘p bo‘la olmaydi.");
      return;
    }
    await run(async () => {
      const uploadedSizeGuide = sizeGuideFile
        ? await (async () => {
            const data = new FormData();
            data.append("file", sizeGuideFile);
            return api<{ url: string }>("/admin/content/banners/upload", token, {
              method: "POST",
              body: data,
            });
          })()
        : null;
      const payload = {
        title: primaryTitle,
        description: primaryDescription,
        slug: form.slug || primaryTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `product-${Date.now()}`,
        status: form.status,
        price: effectiveProductPrice,
        currencyCode: form.currencyCode,
        categoryId: form.categoryId || null,
        gender: form.gender,
        media: imageUrl
          ? [{ url: imageUrl, alt: primaryTitle, position: 0 }]
          : [],
        metadata: {
          baseInventoryQuantity: Number(form.inventoryQuantity) || 0,
          article,
          sizeGuideImageUrl:
            uploadedSizeGuide?.url || form.sizeGuideImageUrl || undefined,
          fiscal: form.ikpuCode.trim() ? { ikpuCode: form.ikpuCode.trim(), packageCode: form.packageCode.trim() || undefined, unitCode: form.unitCode.trim() || undefined, vatPercent: Number(form.vatPercent) || 0 } : undefined,
          translations: {
            titleUz: form.titleUz.trim() || undefined,
            titleRu: form.titleRu.trim() || undefined,
            titleEn: form.titleEn.trim() || undefined,
            descriptionUz: form.descriptionUz.trim() || undefined,
            descriptionRu: form.descriptionRu.trim() || undefined,
            descriptionEn: form.descriptionEn.trim() || undefined,
          },
        },
      };
      const p = selectedId
        ? await api<Product>(`/admin/catalog/products/${selectedId}`, token, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api<Product>("/admin/catalog/products", token, {
            method: "POST",
            body: JSON.stringify(payload),
      });
      if (isCreate || variantsForCreation.length) {
        // Images belong to a colour, not to one accidental size row.  This
        // keeps BLACK / S and BLACK / M on the same colour gallery while
        // never leaking those images into RED or BLUE.
        const colorImages = new Map<string, string[]>();
        const colorFiles = new Map<string, File[]>();
        variantsForCreation.forEach((draft, index) => {
          const key = draft.characteristicId || `color-${draft.color.trim().toLocaleLowerCase("uz-UZ")}`;
          const sources = [draft.imageUrl, ...draft.extraImageUrls].map((url) => url.trim()).filter(Boolean);
          colorImages.set(key, [...new Set([...(colorImages.get(key) ?? []), ...sources])]);
          const files = index === 0 ? variantImageFiles : additionalVariantFiles[index - 1] ?? [];
          colorFiles.set(key, [...(colorFiles.get(key) ?? []), ...files]);
        });
        const uploadedColorImages = new Map<string, string[]>();
        await Promise.all([...colorFiles.entries()].map(async ([key, files]) => {
          const uploads = await Promise.all(files.map(async (file) => {
            const data = new FormData();
            data.append("file", file);
            return api<{ url: string }>("/admin/content/banners/upload", token, { method: "POST", body: data });
          }));
          uploadedColorImages.set(key, uploads.map((item) => item.url));
        }));
        const savedVariants = await Promise.all(
          variantsForCreation.map(async (variantDraft, index) => {
            const { sourceId, imageUrl: variantImageUrl, extraImageUrls, costPrice, expensePrice, characteristicId: _characteristicId, ...variantPayload } = variantDraft;
            const key = variantDraft.characteristicId || `color-${variantDraft.color.trim().toLocaleLowerCase("uz-UZ")}`;
            const images = [...new Set([...(colorImages.get(key) ?? []), ...(uploadedColorImages.get(key) ?? [])])];
            await api(sourceId ? `/admin/catalog/variants/${sourceId}` : `/admin/catalog/products/${p.id}/variants`, token, {
              method: sourceId ? "PATCH" : "POST",
              body: JSON.stringify({
                ...variantPayload,
                name: variantDraft.sku,
                color: variantDraft.color || null,
                size: variantDraft.size || null,
                price: variantDraft.price || null,
                attributes: { images, costPrice: costPrice || "0", expensePrice: expensePrice || "0" },
              }),
            });
            return images;
          }),
        );
        const allVariantImages = savedVariants.flat().filter(Boolean);
        if (allVariantImages.length) {
          await api(`/admin/catalog/products/${p.id}`, token, {
            method: "PATCH",
            body: JSON.stringify({
              media: allVariantImages.map((url, index) => ({ url, alt: primaryTitle, position: index })),
            }),
          });
        }
      }
      await catalog();
      setSelectedId(null);
      setProductView("list");
      setForm(blankProduct());
      setVariant(blankVariant());
      setVariantImageFiles([]);
      setAdditionalVariants([]);
      setAdditionalVariantFiles([]);
      setShowVariantForm(false);
      setNotice(isCreate ? "Mahsulot va birinchi variant saqlandi." : "Mahsulot yangilandi.");
    });
  };
  const addVariant = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) return setError("Avval mahsulotni saqlang.");
    if (!generatedVariantSku(article, variant.color, variant.size)) {
      setError("Variant uchun rang kiriting. Sub-artikul avtomatik yaratiladi.");
      return;
    }
    const allocated = selected?.variants.reduce(
      (sum, item) => sum + (item.id === editingVariantId ? 0 : item.inventoryQuantity),
      0,
    ) ?? 0;
    const available = Number(form.inventoryQuantity) - allocated;
    if (variant.inventoryQuantity < 0) {
      setError("Variantning ombordagi soni manfiy bo‘lishi mumkin emas.");
      return;
    }
    if (variant.inventoryQuantity > available) {
      setError(`Variant uchun omborda yetarli mahsulot yo‘q. Qolgan: ${Math.max(0, available)} dona.`);
      return;
    }
    await run(async () => {
      const preparedVariant = { ...variant, sku: generatedVariantSku(article, variant.color, variant.size) };
      const { imageUrl: variantImageUrl, extraImageUrls, costPrice, expensePrice, characteristicId: _characteristicId, ...variantPayload } = preparedVariant;
      const uploadedImages = await Promise.all(variantImageFiles.map(async (file) => {
        const data = new FormData();
        data.append("file", file);
        return api<{ url: string }>("/admin/content/banners/upload", token, { method: "POST", body: data });
      }));
      const images = [variantImageUrl, ...extraImageUrls, ...uploadedImages.map((item) => item.url)].map((url) => url.trim()).filter(Boolean);
      await api(
        editingVariantId
          ? `/admin/catalog/variants/${editingVariantId}`
          : `/admin/catalog/products/${selectedId}/variants`,
        token,
        {
        method: editingVariantId ? "PATCH" : "POST",
        body: JSON.stringify({
          ...variantPayload,
          name: preparedVariant.sku,
          color: variant.color || null,
          size: variant.size || null,
          price: variant.price || null,
          attributes: { images, costPrice: costPrice || "0", expensePrice: expensePrice || "0" },
        }),
      });
      // Variant rasmi mahsulotning birinchi rasmi ham bo‘ladi. Shuning uchun
      // alohida "asosiy rasm" inputi kerak emas va kartalar darhol rasm bilan chiqadi.
      if (images[0] && !selected?.media.length) {
        await api(`/admin/catalog/products/${selectedId}`, token, {
          method: "PATCH",
          body: JSON.stringify({
            media: [{ url: images[0], alt: form.title, position: 0 }],
          }),
        });
        setImageUrl(images[0]);
      }
      setVariant(blankVariant());
      setVariantImageFiles([]);
      setShowVariantForm(false);
      setEditingVariantId(null);
      await catalog();
      setNotice(editingVariantId ? "Variant yangilandi." : "Variant qo‘shildi.");
    });
  };
  const deleteProduct = async () => {
    if (!selectedId || !confirm("Mahsulot o‘chirilsinmi?")) return;
    await run(async () => {
      await api(`/admin/catalog/products/${selectedId}`, token, {
        method: "DELETE",
      });
      closeEditor();
      await catalog();
      setNotice("Mahsulot o‘chirildi.");
    });
  };
  const openVariantEditor = (source: Variant, duplicate = false) => {
    const images = Array.isArray(source.attributes?.images)
      ? source.attributes.images.filter((image): image is string => typeof image === "string")
      : [];
    const nextSize = duplicate ? "" : source.size ?? "";
    setVariant({
      sourceId: duplicate ? "" : source.id,
      characteristicId: `existing-${source.id}`,
      sku: generatedVariantSku(form.article, source.color ?? "", nextSize),
      name: source.name,
      color: source.color ?? "",
      size: nextSize,
      price: source.price ?? "",
      costPrice: String(source.attributes?.costPrice ?? ""),
      expensePrice: String(source.attributes?.expensePrice ?? ""),
      inventoryQuantity: duplicate ? 0 : source.inventoryQuantity,
      isActive: source.isActive,
      imageUrl: images[0] ?? "",
      extraImageUrls: images.slice(1),
    });
    setVariantImageFiles([]);
    setEditingVariantId(duplicate ? null : source.id);
    setShowVariantForm(true);
    if (duplicate) setNotice("Dublikat tayyor. Rang yoki razmerni o‘zgartiring — sub-artikul avtomatik yangilanadi.");
  };
  const taxonomy = async (kind: "categories" | "collections", e: FormEvent) => {
    e.preventDefault();
    const f = kind === "categories" ? category : collection;
    await run(async () => {
      await api(`/admin/catalog/${kind}`, token, {
        method: "POST",
        body: JSON.stringify(f),
      });
      kind === "categories"
        ? setCategory(blankTaxonomy())
        : setCollection(blankTaxonomy());
      await catalog();
      setNotice("Saqlandi.");
    });
  };
  const dashboardActivities = (dashboard as DashboardData | null)?.activity ?? [];
  const unreadActivities = dashboardActivities.filter((item) => !readActivityIds.includes(item.id));
  const systemActivities = dashboardActivities.filter((item) => item.entityType !== "order");
  const orderActivities = dashboardActivities.filter((item) => item.entityType === "order");
  const visibleActivities = notificationSection === "orders" ? orderActivities : systemActivities;
  const markActivitiesRead = (ids: string[]) => setReadActivityIds((current) => [...new Set([...current, ...ids])]);
  useEffect(() => {
    if (!token) return;
    const poll = window.setInterval(() => { void refresh("dashboard").catch(() => undefined); }, 20_000);
    return () => window.clearInterval(poll);
  }, [token, refresh]);
  useEffect(() => {
    if (!dashboard) return;
    const nextOrders = orderActivities.filter((item) => !orderNotificationIds.current.has(item.id));
    if (!orderNotificationsReady.current) {
      orderActivities.forEach((item) => orderNotificationIds.current.add(item.id));
      orderNotificationsReady.current = true;
      return;
    }
    if (!nextOrders.length) return;
    nextOrders.forEach((item) => orderNotificationIds.current.add(item.id));
    if (browserNotificationPermission !== "granted") return;
    playOrderAlertSound();
    nextOrders.forEach((item) => {
      const options = { body: "Yangi buyurtma qabul qilindi. Batafsil ko‘rish uchun bosing.", tag: `siren-order-${item.entityId ?? item.id}`, data: { orderId: item.entityId ?? "" } };
      if ("serviceWorker" in navigator) void navigator.serviceWorker.ready.then((registration) => registration.showNotification("SIREN · Yangi buyurtma", options));
      else new Notification("SIREN · Yangi buyurtma", options);
    });
  }, [browserNotificationPermission, orderActivities]);
  if (!token)
    return (
      <main className="tailadmin-auth-page">
        <Card className="tailadmin-auth-card">
          <CardHeader>
            <div className="admin-logo-mark">S</div>
            <p className="ui-overline">SIREN COMMERCE</p>
            <CardTitle>
              Control
              <br />
              center
            </CardTitle>
            <CardDescription>
              Xavfsiz boshqaruv paneliga kiring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="ui-form" onSubmit={login}>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Parol">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Button disabled={loading}>
                Kirish <ChevronRight size={16} />
              </Button>
            </form>
            <AdminToast message={error} tone="error" />
          </CardContent>
        </Card>
      </main>
    );
  const nav: Array<[Tab, string, ElementType]> = [
    ["dashboard", "Overview", TailAdminGridIcon],
    ["products", "Mahsulotlar", Package],
    ["catalog", "Kategoriyalar", Tags],
    ["orders", "Buyurtmalar", ShoppingBag],
    ["delivery", "Yetkazib berish", ClipboardList],
    ["customers", "Mijozlar", Users],
    ["discounts", "Chegirmalar", Tags],
    ["partners", "Hamkorlar", Crown],
    ["finance", "Moliya", BarChart3],
    ["currencies", "Valyutalar", RefreshCw],
    ["analytics", "Analitika", Monitor],
    ["offline_cashier", "Kassa", ClipboardList],
    ["offline_inventory", "Offline mahsulotlar", Package],
    ["offline_sales", "Sotilgan tovarlar", ShoppingBag],
    ["offline_reports", "Offline hisobot", BarChart3],
    ["content", "Kontent", FileText],
    ["pages", "Sahifalar", FileText],
    ["notifications", "Xabarlar", Bell],
    ["team", "Jamoa", Users],
    ["audit", "Audit", ShieldCheck],
    ["settings", "Sozlamalar", Settings2],
  ];
  const contentNavigation: Array<[
    ContentSubsection,
    string,
    string,
  ]> = [
    ["main-banner", "Main banner", "Bosh sahifadagi asosiy banner"],
    ["custom-pages", "Custom sections", "Custom section va bannerlar"],
    ["lookbook", "Lookbook", "Lookbook sahifalari va ko‘rinishlari"],
    ["blog", "Blog", "Maqolalar va yangiliklar"],
    ["records", "Records", "Musiqa va audio treklar"],
    ["collections", "Kolleksiyalar", "Mahsulot kolleksiyalari"],
  ];
  const standardNavGroups: Array<[string, Array<[Tab, string, ElementType]>]> = [
    ["Asosiy", nav.slice(0, 4)],
    ["Savdo", nav.slice(4, 11)],
    ["Offline do‘kon", nav.slice(11, 15)],
    ["Kontent", nav.slice(15, 18)],
    ["Tizim", nav.slice(18)],
  ];
  const offlineNav = nav.slice(11, 15);
  const navGroups: Array<[string, Array<[Tab, string, ElementType]>]> = adminProfile?.role === "cashier" ? [["Offline do‘kon", offlineNav]] : standardNavGroups;
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        setTab(v as Tab);
        void run(() => refresh(v as Tab));
      }}
      className={`admin-theme--${adminTheme}`}
    >
      <AdminShell activeId={tab} groups={navGroups.map(([label, items]) => ({ label, items: items.map(([id, itemLabel, icon]) => ({ id, label: itemLabel, icon })) }))} onNavigate={(id) => { setTab(id as Tab); void run(() => refresh(id as Tab)); }} compact={sidebarCompact} onCompactChange={setSidebarCompact} title={nav.find((item) => item[0] === tab)?.[1] ?? "Admin"} theme={adminTheme} onThemeChange={(value) => setAdminTheme(value as "light" | "midnight" | "violet" | "graphite" | "forest")} profile={adminProfile} busy={loading} onRefresh={() => void run(async () => { await refresh(); await refresh("dashboard"); })} notificationCount={unreadActivities.length} notificationContent={<section className="admin-activity-notifications"><header><div><p>YANGI FAOLLIK</p><b>Bildirishnomalar</b></div>{unreadActivities.length > 0 && <button type="button" onClick={() => markActivitiesRead(unreadActivities.map((item) => item.id))}><CheckCheck size={15} /> Barchasini o‘qish</button>}</header><div className="admin-notification-tabs"><button type="button" className={notificationSection === "system" ? "is-active" : ""} onClick={() => setNotificationSection("system")}>Tizim <i>{systemActivities.filter((item) => !readActivityIds.includes(item.id)).length}</i></button><button type="button" className={notificationSection === "orders" ? "is-active" : ""} onClick={() => setNotificationSection("orders")}>Buyurtmalar <i>{orderActivities.filter((item) => !readActivityIds.includes(item.id)).length}</i></button></div>{notificationSection === "orders" && <div className="admin-order-notification-permission"><span>{browserNotificationPermission === "granted" ? "Chrome bildirishnomasi yoqilgan" : "Ovozli Chrome bildirishnomalarini yoqing"}</span>{browserNotificationPermission !== "granted" && <button type="button" onClick={() => void enableOrderNotifications()}>Yoqish</button>}</div>}{visibleActivities.length ? <div className="admin-activity-notification-list">{visibleActivities.slice(0, 12).map((item) => { const isRead = readActivityIds.includes(item.id); const isOrder = item.entityType === "order"; return <button type="button" key={item.id} className={`admin-activity-notification${isRead ? " is-read" : ""}${isOrder ? " is-order" : ""}`} onClick={() => { markActivitiesRead([item.id]); if (isOrder) void openOrderNotification(item.entityId); }}><i aria-hidden="true" /><span><b>{dashboardActivityTitle(item.action, item.entityType)}</b><small>{item.user} · {dashboardTime(item.createdAt)}{isOrder ? " · Chekni ochish" : ""}</small></span></button>; })}</div> : <p className="admin-activity-empty">Bu bo‘limda bildirishnoma yo‘q.</p>}</section>} onSignOut={() => { localStorage.removeItem("siren-admin-token"); setToken(""); }}>
        <AdminToast message={notice} />
        <AdminToast message={error} tone="error" />
        <TabsContent value="dashboard">
          <DashboardOverview dashboard={dashboard as DashboardData | null} currency={dashboardCurrency} period={dashboardPeriod} metric={dashboardMetric} granularity={dashboardGranularity} customFrom={dashboardFrom} customTo={dashboardTo} onCurrency={setDashboardCurrency} onPeriod={setDashboardPeriod} onMetric={setDashboardMetric} onGranularity={setDashboardGranularity} onCustomFrom={setDashboardFrom} onCustomTo={setDashboardTo} />
        </TabsContent>
        <TabsContent value="offline_cashier"><OfflineCashier token={token} onChanged={() => { void refresh("products"); }} /></TabsContent>
        <TabsContent value="offline_inventory"><OfflineInventory token={token} role={adminProfile?.role ?? ""} onChanged={() => { void refresh("products"); }} /></TabsContent>
        <TabsContent value="offline_sales"><OfflineSales token={token} role={adminProfile?.role ?? ""} onChanged={() => { void refresh("products"); }} /></TabsContent>
        <TabsContent value="offline_reports"><OfflineReports token={token} role={adminProfile?.role ?? ""} /></TabsContent>
        <TabsContent value="products">
          {productView === "list" ? (
            <section className="tailadmin-products-page reference-products-page">
              <header className="tailadmin-page-heading reference-products-heading">
                <div>
                  <h2>Mahsulotlar</h2>
                </div>
                <nav aria-label="Breadcrumb" className="reference-breadcrumb"><span>Bosh sahifa</span><ChevronRight size={15} /><b>Mahsulotlar</b></nav>
              </header>
              <div className="reference-products-card">
                <header className="reference-products-card-head">
                  <div><h3>Mahsulotlar ro‘yxati</h3><p>Do‘kon mahsulotlari va ombor holatini boshqaring.</p></div>
                  <div className="reference-card-actions"><Button type="button" variant="outline" onClick={() => setNotice("Eksport funksiyasi tayyorlanmoqda.")}><Download size={18} /> Eksport</Button><Button onClick={startCreate}><Plus size={18} /> Mahsulot qo‘shish</Button></div>
                </header>
                <div className="reference-products-tabs" role="tablist" aria-label="Mahsulotlar bo‘limlari">
                  <button type="button" className={productSubsection === "all" ? "is-active" : ""} onClick={() => setProductSubsection("all")}>Barcha mahsulotlar</button>
                  <button type="button" className={productSubsection === "transfer" ? "is-active" : ""} onClick={() => setProductSubsection("transfer")}>Transfer</button>
                </div>
                {productSubsection === "all" ? <ProductInventoryWorkspace products={products} categories={categories} transfers={transfers} token={token} onEdit={pick} onInspect={(product) => setInspectedProductId(product.id)} onRefresh={() => refresh("products")} onNotice={setNotice} /> : <OfflineTransferWorkspace products={products} transfers={transfers} token={token} onRefresh={() => refresh("products")} onNotice={setNotice} />}
              </div>
              {inspectedProduct && <ProductInspector product={inspectedProduct} onClose={() => setInspectedProductId(null)} />}
            </section>
          ) : (
            <section className="admin-editor-page">
              <button
                type="button"
                className="admin-back-button"
                onClick={closeEditor}
              >
                ← Mahsulotlarga qaytish
              </button>
              <Card>
                <CardHeader>
                  <div>
                    <p className="ui-overline">
                      {productView === "create"
                        ? "NEW PRODUCT"
                        : "PRODUCT EDITOR"}
                    </p>
                    <CardTitle>
                      {selected ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
                    </CardTitle>
                    <CardDescription>
                      Mahsulot ma’lumotlarini to‘ldiring, so‘ng variantlarni qo‘shing.
                    </CardDescription>
                  </div>
                  <div className="product-editor-actions-top">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setForm({ ...form, status: "draft" });
                        setNotice("Draft holati tanlandi. Saqlashni bosing.");
                      }}
                    >
                      Draft
                    </Button>
                    {selected && (
                      <Badge variant={flavor(selected.status)}>
                        {selected.status}
                      </Badge>
                    )}
                    <Button form="product-editor-form">
                      <Settings2 size={16} />
                      Saqlash
                    </Button>
                    {selected && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={deleteProduct}
                      >
                        <Archive size={15} />
                        O‘chirish
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <form id="product-editor-form" className="ui-form product-main-form" onSubmit={save}>
                    <section className="product-form-block product-form-block--category">
                      <Field label="Tovar kategoriyasi *">
                        <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                          <option value="">Kategoriya tanlang</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Gender *"><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as typeof form.gender })} required><option value="male">Male</option><option value="female">Female</option><option value="unisex">Unisex</option></select></Field>
                    </section>
                    <section className="product-form-block">
                      <div>
                        <p className="ui-overline">ASOSIY MA’LUMOT</p>
                        <h3>Mahsulot nomi</h3>
                      </div>
                      <div className="ui-form-grid product-language-grid">
                        <Field label="O‘zbekcha nomi">
                          <input value={form.titleUz} onChange={(e) => setForm({ ...form, titleUz: e.target.value })} placeholder="Masalan: Qora futbolka" required />
                        </Field>
                        <Field label="Ruscha nomi">
                          <input value={form.titleRu} onChange={(e) => setForm({ ...form, titleRu: e.target.value })} placeholder="Например: Чёрная футболка" />
                        </Field>
                        <Field label="Inglizcha nomi">
                          <input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} placeholder="Example: Black T-shirt" />
                        </Field>
                      </div>
                    </section>
                    <section className="product-form-block">
                      <div>
                        <p className="ui-overline">TAVSIF</p>
                        <h3>Mahsulot haqida</h3>
                      </div>
                      <div className="ui-form-grid product-language-grid">
                        <Field label="O‘zbekcha tavsif"><textarea rows={5} value={form.descriptionUz} onChange={(e) => setForm({ ...form, descriptionUz: e.target.value })} /></Field>
                        <Field label="Ruscha tavsif"><textarea rows={5} value={form.descriptionRu} onChange={(e) => setForm({ ...form, descriptionRu: e.target.value })} /></Field>
                        <Field label="Inglizcha tavsif"><textarea rows={5} value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} /></Field>
                      </div>
                    </section>
                    <section className="product-form-block product-form-block--size-guide">
                      <div>
                        <p className="ui-overline">RAZMERLAR HAQIDA</p>
                        <h3>Razmerlar setkasi</h3>
                      </div>
                      <div className="ui-form-grid">
                        <Field label="JPG URL (ixtiyoriy)">
                          <input value={form.sizeGuideImageUrl} onChange={(e) => setForm({ ...form, sizeGuideImageUrl: e.target.value })} placeholder="https://.../size-guide.jpg" />
                        </Field>
                        <Field label="JPG yuklash (ixtiyoriy)">
                          <input type="file" accept="image/jpeg,image/jpg" onChange={(e) => setSizeGuideFile(e.target.files?.[0] ?? null)} />
                        </Field>
                      </div>
                    </section>
                    <section className="product-form-block">
                      <div>
                        <p className="ui-overline">OMBOR VA ARTIKUL</p>
                        <h3>Asosiy sozlamalar</h3>
                      </div>
                      <div className="ui-form-grid">
                      <Field label="Ombordagi umumiy son">
                        <input
                          type="number"
                          min="0"
                          value={form.inventoryQuantity || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              inventoryQuantity: Math.max(0, Number(e.target.value)),
                            })
                          }
                          required
                        />
                      </Field>
                      <Field label="Asosiy artikul (erkin kiritiladi)">
                        <input
                          value={form.article}
                          onChange={(e) => updateArticle(e.target.value)}
                          placeholder="Masalan: 11, KURTKA-2026 yoki MODEL A"
                          required
                        />
                      </Field>
                      <Field label="Status">
                        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Product["status"] })}>
                          <option value="draft">Draft</option>
                          <option value="active">Active — saytda ko‘rinadi</option>
                          <option value="archived">Archived</option>
                        </select>
                      </Field>
                    </div>
                    </section>
                    <section className="product-form-block product-form-block--fiscal">
                      <div><p className="ui-overline">PAYME / FISKAL CHEK</p><h3>IKPU va qadoqlash ma’lumotlari</h3><span>Payme fiskal chekida mahsulot bo‘yicha yuboriladi. Kodni rasmiy katalogdan tasdiqlang.</span></div>
                      <FiscalCatalogPicker token={token} categoryName={categories.find((category) => category.id === form.categoryId)?.name ?? ''} productTitle={form.titleUz || form.title} value={{ ikpuCode: form.ikpuCode, packageCode: form.packageCode, unitCode: form.unitCode, vatPercent: form.vatPercent }} onChange={(next) => setForm({ ...form, ...next })} />
                    </section>
                  </form>
                  {(selected || productView === "create") && (
                    <section className="admin-variants">
                      <div className="admin-section-title">
                        <div>
                          <p className="ui-overline">INVENTORY</p>
                          <h3>
                            <Palette size={18} />
                            Variantlar va ombor qoldig‘i
                          </h3>
                        </div>
                        <div className="variant-section-actions">
                          {selected ? <><span>{creationDrafts.length} ta variant</span><Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setAdditionalVariants((current) => [...current, blankVariant()]);
                                setAdditionalVariantFiles((current) => [...current, []]);
                                setEditingVariantId(null);
                                setShowVariantForm(true);
                              }}
                            >
                              <Plus size={15} />
                              Variant
                            </Button></> : <><span>{1 + additionalVariants.length} ta variant</span><Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setAdditionalVariants((current) => [...current, blankVariant()]);
                                setAdditionalVariantFiles((current) => [...current, []]);
                              }}
                            >
                              <Plus size={15} />
                              Variant
                            </Button></>}
                        </div>
                      </div>
                      {false && productVariants.map((v) => (
                        <div key={v.id} className="variant-row-group">
                        <div className="variant-row">
                          <Box size={18} />
                          <div>
                            <b>{v.name || v.sku}</b>
                            <small>
                              {v.sku} · {v.color || "rang yo‘q"} ·{" "}
                              {v.size || "razmer yo‘q"}
                            </small>
                          </div>
                          <strong>{v.inventoryQuantity} dona</strong>
                          <Badge variant={v.isActive ? "success" : "warning"}>
                            {v.isActive ? "active" : "off"}
                          </Badge>
                          <div className="variant-row-actions"><Button type="button" size="sm" variant="outline" onClick={() => openVariantEditor(v)}>Tahrirlash</Button><Button type="button" size="sm" onClick={() => openVariantEditor(v, true)}>Dublikat</Button></div>
                        </div>
                        {showVariantForm && editingVariantId === v.id && <form onSubmit={addVariant} className="variant-create variant-create--expanded variant-inline-editor"><div className="variant-create-head"><div><p className="ui-overline">VARIANTNI TAHRIRLASH</p><h4>{v.sku} variantini yangilang</h4></div><span>Qolgan: {availableVariantInventory} dona</span></div><div className="ui-form-grid ui-form-grid--three variant-characteristics-grid"><Field label="Sub-artikul (avtomatik)"><input className="generated-sku" value={variant.sku} readOnly placeholder="Artikul, rang va razmerdan yaratiladi" /></Field><ColorField value={variant.color} onChange={(color) => updateVariant({ color })} /><Field label="Razmer"><input value={variant.size} onChange={(event) => updateVariant({ size: event.target.value })} placeholder="M" /></Field><Field label="Ombordagi son"><input type="number" min="0" max={availableVariantInventory} value={variant.inventoryQuantity} onChange={(event) => updateVariant({ inventoryQuantity: Math.max(0, Number(event.target.value)) })} /></Field><Field label="Sotuv narxi"><input value={variant.price} onChange={(event) => updateVariant({ price: event.target.value })} placeholder="350000" inputMode="numeric" /></Field><Field label="Tannarx"><input value={variant.costPrice} onChange={(event) => updateVariant({ costPrice: event.target.value })} placeholder="120000" inputMode="numeric" /></Field><Field label="Xarajat"><input value={variant.expensePrice} onChange={(event) => updateVariant({ expensePrice: event.target.value })} placeholder="10000" inputMode="numeric" /></Field><Field label="Rasm URL"><input value={variant.imageUrl} onChange={(event) => updateVariant({ imageUrl: event.target.value })} placeholder="https://.../variant.jpg" /></Field><Field label="Rasm yuklash"><input type="file" accept="image/jpeg,image/jpg,.jpg,.jpeg,image/png,.png,image/webp,.webp,image/gif,.gif" multiple onChange={(event) => setVariantImageFiles(Array.from(event.target.files ?? []))} /></Field></div><div className="variant-create-actions"><Button type="button" variant="outline" onClick={() => { setEditingVariantId(null); setShowVariantForm(false); }}>Bekor qilish</Button><Button><Settings2 size={15} /> Variantni yangilash</Button></div></form>}
                        </div>
                      ))}
                      {showVariantForm && !editingVariantId && (
                        <form onSubmit={(event) => event.preventDefault()} className="variant-characteristics-create">
                          <VariantCharacteristics
                            drafts={creationDrafts}
                            onUpdate={updateCreationDraft}
                            onAddColor={() => {
                              setAdditionalVariants((current) => [...current, blankVariant()]);
                              setAdditionalVariantFiles((current) => [...current, []]);
                            }}
                            onAddSize={addVariantSize}
                            onRemoveSize={removeVariantSize}
                          />
                        </form>
                      )}
                      {!selected && showVariantForm && !editingVariantId && (
                        <form onSubmit={selected ? addVariant : (event) => event.preventDefault()} className={`variant-create variant-create--expanded ${!selected ? "legacy-creation-form" : ""}`}>
                          <div className="variant-create-head">
                            <div>
                              <p className="ui-overline">{editingVariantId ? "VARIANTNI TAHRIRLASH" : "YANGI VARIANT"}</p>
                              <h4>{editingVariantId ? "Variant ma’lumotlarini yangilang" : "Variant ma’lumotlari"}</h4>
                            </div>
                            <span>Qolgan: {Math.max(0, availableVariantInventory - (selected ? 0 : additionalVariants.reduce((sum, item) => sum + item.inventoryQuantity, 0)))} dona</span>
                          </div>
                          <div className="ui-form-grid ui-form-grid--three variant-characteristics-grid">
                            <Field label="Sub-artikul (avtomatik)">
                              <input className="generated-sku" value={variant.sku} readOnly placeholder="Artikul, rang va razmerdan yaratiladi" />
                            </Field>
                            <ColorField value={variant.color} onChange={(color) => updateVariant({ color })} />
                            <Field label="Razmer">
                              <input
                                value={variant.size}
                                onChange={(e) => updateVariant({ size: e.target.value })}
                                placeholder="M"
                              />
                            </Field>
                            <Field label="Ombordagi son">
                              <input
                                type="number"
                                min="0"
                                max={Math.max(0, availableVariantInventory - (selected ? 0 : additionalVariants.reduce((sum, item) => sum + item.inventoryQuantity, 0)))}
                                value={variant.inventoryQuantity}
                                onChange={(e) => setVariant({ ...variant, inventoryQuantity: Math.max(0, Number(e.target.value)) })}
                                required
                              />
                            </Field>
                            <Field label="Sotuv narxi (ixtiyoriy)">
                              <input value={variant.price} onChange={(e) => updateVariant({ price: e.target.value })} placeholder="Masalan: 350000" inputMode="numeric" />
                            </Field>
                            <Field label="Tannarx">
                              <input value={variant.costPrice} onChange={(e) => updateVariant({ costPrice: e.target.value })} placeholder="Masalan: 120000" inputMode="numeric" />
                            </Field>
                            <Field label="Xarajat">
                              <input value={variant.expensePrice} onChange={(e) => updateVariant({ expensePrice: e.target.value })} placeholder="Masalan: 10000" inputMode="numeric" />
                            </Field>
                            <Field label="Rasm URL">
                              <input
                                value={variant.imageUrl}
                                onChange={(e) => setVariant({ ...variant, imageUrl: e.target.value })}
                                placeholder="https://.../variant.jpg"
                              />
                            </Field>
                            <Field label="Rasm yuklash">
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,.jpg,.jpeg,image/png,.png,image/webp,.webp,image/gif,.gif"
                                multiple
                                onChange={(e) => setVariantImageFiles(Array.from(e.target.files ?? []))}
                              />
                            </Field>
                            {variant.extraImageUrls.map((url, index) => (
                              <Field key={index} label={`Qo‘shimcha rasm URL ${index + 2}`}>
                                <input
                                  value={url}
                                  onChange={(e) => {
                                    const next = [...variant.extraImageUrls];
                                    next[index] = e.target.value;
                                    setVariant({ ...variant, extraImageUrls: next });
                                  }}
                                  placeholder="https://.../variant.jpg"
                                />
                              </Field>
                            ))}
                          </div>
                          <div className="variant-create-actions">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setVariant({ ...variant, extraImageUrls: [...variant.extraImageUrls, ""] })}
                            >
                              <Plus size={15} />
                              Rasm URL qo‘shish
                            </Button>
                            {selected && <Button>
                                <Settings2 size={15} />
                                {editingVariantId ? "Variantni yangilash" : "Variantni saqlash"}
                              </Button>}
                          </div>
                        </form>
                      )}
                      {!selected && additionalVariants.map((draft, variantIndex) => {
                        const remaining = Math.max(
                          0,
                          Number(form.inventoryQuantity) -
                            variant.inventoryQuantity -
                            additionalVariants.reduce(
                              (sum, item, index) => index === variantIndex ? sum : sum + item.inventoryQuantity,
                              0,
                            ),
                        );
                        const updateDraft = (updates: Partial<typeof draft>) => {
                          setAdditionalVariants((current) =>
                            current.map((item, index) => {
                              if (index !== variantIndex) return item;
                              const next = { ...item, ...updates };
                              return { ...next, sku: generatedVariantSku(form.article, next.color, next.size) };
                            }),
                          );
                        };
                        return (
                          <div key={variantIndex} className="variant-create variant-create--expanded legacy-creation-extra">
                            <div className="variant-create-head">
                              <div>
                                <p className="ui-overline">YANGI VARIANT {variantIndex + 2}</p>
                                <h4>Variant ma’lumotlari</h4>
                              </div>
                              <div className="variant-create-actions">
                                <span>Qolgan: {remaining} dona</span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setAdditionalVariants((current) => current.filter((_, index) => index !== variantIndex));
                                    setAdditionalVariantFiles((current) => current.filter((_, index) => index !== variantIndex));
                                  }}
                                >
                                  Olib tashlash
                                </Button>
                              </div>
                            </div>
                            <div className="ui-form-grid ui-form-grid--three variant-characteristics-grid">
                              <Field label="Sub-artikul (avtomatik)">
                                <input className="generated-sku" value={draft.sku} readOnly placeholder="Artikul, rang va razmerdan yaratiladi" />
                              </Field>
                              <ColorField value={draft.color} onChange={(color) => updateDraft({ color })} />
                              <Field label="Razmer">
                                <input value={draft.size} onChange={(e) => updateDraft({ size: e.target.value })} placeholder="M" />
                              </Field>
                              <Field label="Ombordagi son">
                                <input
                                  type="number"
                                  min="0"
                                  max={remaining}
                                  value={draft.inventoryQuantity}
                                  onChange={(e) => updateDraft({ inventoryQuantity: Math.max(0, Number(e.target.value)) })}
                                  required
                                />
                              </Field>
                              <Field label="Sotuv narxi (ixtiyoriy)">
                                <input value={draft.price} onChange={(e) => updateDraft({ price: e.target.value })} placeholder="Masalan: 350000" inputMode="numeric" />
                              </Field>
                              <Field label="Tannarx">
                                <input value={draft.costPrice} onChange={(e) => updateDraft({ costPrice: e.target.value })} placeholder="Masalan: 120000" inputMode="numeric" />
                              </Field>
                              <Field label="Xarajat">
                                <input value={draft.expensePrice} onChange={(e) => updateDraft({ expensePrice: e.target.value })} placeholder="Masalan: 10000" inputMode="numeric" />
                              </Field>
                              <Field label="Rasm URL">
                                <input value={draft.imageUrl} onChange={(e) => updateDraft({ imageUrl: e.target.value })} placeholder="https://.../variant.jpg" />
                              </Field>
                              <Field label="Rasm yuklash">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,.jpg,.jpeg,image/png,.png,image/webp,.webp,image/gif,.gif"
                                  multiple
                                  onChange={(e) => setAdditionalVariantFiles((current) => current.map((files, index) => index === variantIndex ? Array.from(e.target.files ?? []) : files))}
                                />
                              </Field>
                              {draft.extraImageUrls.map((url, imageIndex) => (
                                <Field key={imageIndex} label={`Qo‘shimcha rasm URL ${imageIndex + 2}`}>
                                  <input
                                    value={url}
                                    onChange={(e) => updateDraft({ extraImageUrls: draft.extraImageUrls.map((item, index) => index === imageIndex ? e.target.value : item) })}
                                    placeholder="https://.../variant.jpg"
                                  />
                                </Field>
                              ))}
                            </div>
                            <div className="variant-create-actions">
                              <Button type="button" variant="outline" onClick={() => updateDraft({ extraImageUrls: [...draft.extraImageUrls, ""] })}>
                                <Plus size={15} />
                                Rasm URL qo‘shish
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {showVariantForm && <VariantImages drafts={creationDrafts} onAddImage={addVariantImage} onRemoveImage={removeVariantImage} />}
                      <FinanceTable
                        currency={form.currencyCode}
                        rows={creationDrafts}
                        onChange={(indices, field, value) => indices.forEach((index) => updateCreationDraft(index, { [field]: value }))}
                      />
                    </section>
                  )}
                </CardContent>
              </Card>
            </section>
          )}
        </TabsContent>
        <TabsContent value="catalog">
          <div className="admin-card-grid">
            <CategoryManager categories={categories} products={products} token={token} onChanged={() => refresh("catalog")} />
          </div>
        </TabsContent>
        <TabsContent value="orders">
          <section className="tailadmin-products-page reference-products-page">
            <header className="tailadmin-page-heading reference-products-heading"><div><h2>Buyurtmalar</h2></div><nav aria-label="Breadcrumb" className="reference-breadcrumb"><span>Bosh sahifa</span><ChevronRight size={15} /><b>Buyurtmalar</b></nav></header>
            <div className="reference-products-card reference-orders-card"><header className="reference-products-card-head"><div><h3>Buyurtmalar ro‘yxati</h3><p>Mijoz buyurtmalari, to‘lovlari va yetkazib berish ma’lumotlari.</p></div><Button type="button" variant="outline" onClick={() => void run(() => refresh("orders"))}><RefreshCw size={17} /> Yangilash</Button></header>
              <div className="reference-products-toolbar">
                <label><Search size={19} /><input value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="Buyurtma, mijoz yoki telefon qidirish..." /></label>
                <div className="reference-filter-control"><Button type="button" variant="outline" className="reference-filter-trigger" onClick={() => setOrderFilterOpen((open) => !open)}><SlidersHorizontal size={18} /> Filter</Button>{orderFilterOpen && <div className="reference-filter-panel"><label>Buyurtma holati<select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)}><option value="all">Barcha holatlar</option>{[...new Set(orders.map((order) => order.status).filter(Boolean))].map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label>To‘lov holati<select value={orderPaymentFilter} onChange={(event) => setOrderPaymentFilter(event.target.value)}><option value="all">Barcha to‘lovlar</option>{[...new Set(orders.map((order) => order.paymentStatus).filter(Boolean))].map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label>Yetkazib berish<select value={orderDeliveryFilter} onChange={(event) => setOrderDeliveryFilter(event.target.value)}><option value="all">Barcha yetkazib berishlar</option><option value="arranged">Rasmiylashtirilgan</option><option value="unarranged">Rasmiylashtirilmagan</option></select></label><div className="reference-filter-actions"><Button type="button" size="sm" variant="outline" onClick={() => { setOrderStatusFilter("all"); setOrderPaymentFilter("all"); setOrderDeliveryFilter("all"); }}>Tozalash</Button><Button type="button" size="sm" onClick={() => setOrderFilterOpen(false)}>Qo‘llash</Button></div></div>}</div>
              </div>
              {orders.length ? <div className="inventory-table-wrap reference-table-50"><table className="inventory-table"><thead><tr><th>Buyurtma</th><th>Mijoz</th><th>Telefon</th><th>Mahsulotlar</th><th>To‘lov</th><th>Jami</th><th>Holat</th><th>Sana</th><th>Yetkazib berish</th></tr></thead><tbody>{orders.filter((o) => `${o.orderNumber} ${o.customer?.email || ""} ${o.customer?.firstName || ""} ${o.customer?.lastName || ""} ${o.customer?.phone || ""}`.toLowerCase().includes(orderQuery.toLowerCase()) && (orderStatusFilter === "all" || o.status === orderStatusFilter) && (orderPaymentFilter === "all" || o.paymentStatus === orderPaymentFilter) && (orderDeliveryFilter === "all" || (orderDeliveryFilter === "unarranged" ? !o.fulfillmentStatus || o.fulfillmentStatus === "unfulfilled" : Boolean(o.fulfillmentStatus && o.fulfillmentStatus !== "unfulfilled")))).map((o) => { const deliveryEnabled = o.paymentStatus === "paid"; const customerLabel = `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.trim() || o.customer?.email || "Guest"; return <tr key={o.id} className="reference-order-row"><td><button type="button" className="reference-order-open" onClick={() => setSelectedOrder(o)}>#{o.orderNumber}</button></td><td><button type="button" className="reference-customer-open" disabled={!o.customer?.id} title={o.customer?.id ? "Mijoz profilini ochish" : "Mijoz profili biriktirilmagan"} onClick={() => void openOrderCustomer(o.customer?.id)}>{customerLabel}</button></td><td>{o.customer?.phone || "—"}</td><td>{o.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} ta</td><td>{o.paymentMethod || "—"}<small>{o.paymentStatus || "—"}</small></td><td><b>{money(Number(o.totalAmount), "UZS")}</b></td><td><OrderStageBadge order={o} /></td><td>{readableDate(o.createdAt)}</td><td><button type="button" disabled={!deliveryEnabled} className="reference-delivery-open" aria-label={`Buyurtma #${o.orderNumber} yetkazib berish ma’lumotlari`} title={deliveryEnabled ? "Yetkazib berish ma’lumotlari" : "Avval to‘lov tasdiqlanishi kerak"} onClick={() => setDeliveryOrder(o)}><Truck size={18} /></button></td></tr>; })}</tbody></table></div> : <Empty><ShoppingBag />Hali buyurtmalar yo‘q.</Empty>}
            </div>
            {selectedOrder && <div className="inventory-confirm-backdrop" onMouseDown={() => setSelectedOrder(null)}><section className="inventory-confirm reference-order-modal" onMouseDown={(event) => event.stopPropagation()}><button className="reference-modal-close" onClick={() => setSelectedOrder(null)}>×</button><p className="ui-overline">BUYURTMA #{selectedOrder.orderNumber}</p><h3>{`${selectedOrder.customer?.firstName || ""} ${selectedOrder.customer?.lastName || ""}`.trim() || selectedOrder.customer?.email || "Guest"}</h3><p><b>Email:</b> {selectedOrder.customer?.email || "—"}<br /><b>Telefon:</b> {selectedOrder.customer?.phone || "—"}<br /><b>Yetkazish:</b> {selectedOrder.shippingAddress?.country || "—"}, {selectedOrder.shippingAddress?.city || "—"}, {selectedOrder.shippingAddress?.address || "—"}<br /><b>To‘lov:</b> {selectedOrder.paymentMethod || "—"} · {selectedOrder.paymentStatus || "—"}</p><div className="reference-modal-items">{selectedOrder.items?.map((item, index) => <p key={`${item.skuSnapshot}-${index}`}>{item.imageUrl && <img src={item.imageUrl.startsWith("/uploads/") ? `${API.replace(/\/api$/, "")}${item.imageUrl}` : item.imageUrl} alt="" />}<b>{item.titleSnapshot}</b><span>{item.skuSnapshot || "SKU kiritilmagan"} × {item.quantity}</span><strong>{money(Number(item.unitPrice), "UZS")}</strong></p>)}</div><dl className="reference-order-totals"><div><dt>Mahsulotlar jami</dt><dd>{money(Number(selectedOrder.subtotalAmount ?? selectedOrder.items?.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0) ?? 0), "UZS")}</dd></div><div><dt>Chegirma</dt><dd className="is-discount">−{money(Number(selectedOrder.discountAmount ?? 0), "UZS")}</dd></div><div><dt>Yetkazib berish</dt><dd>{money(Number(selectedOrder.shippingAmount ?? 0), "UZS")}</dd></div><div className="is-total"><dt>To‘langan</dt><dd>{money(Number(selectedOrder.totalAmount), "UZS")}</dd></div></dl></section></div>}
            {deliveryOrder && <div className="inventory-confirm-backdrop" onMouseDown={() => setDeliveryOrder(null)}><section className="inventory-confirm reference-delivery-modal" onMouseDown={(event) => event.stopPropagation()}><button className="reference-modal-close" onClick={() => setDeliveryOrder(null)}>×</button><p className="ui-overline">YETKAZIB BERISH · #{deliveryOrder.orderNumber}</p><h3>Jo‘natmaga tayyorlash</h3><p><b>Qabul qiluvchi:</b> {`${deliveryOrder.customer?.firstName || ""} ${deliveryOrder.customer?.lastName || ""}`.trim() || deliveryOrder.customer?.email || "—"}<br /><b>Telefon:</b> {deliveryOrder.customer?.phone || "—"}<br /><b>Manzil:</b> {deliveryOrder.shippingAddress?.country || "—"}, {deliveryOrder.shippingAddress?.city || "—"}, {deliveryOrder.shippingAddress?.address || "—"}<br /><b>Holat:</b> {deliveryOrder.fulfillmentStatus || "unfulfilled"}</p><div className="reference-delivery-note"><Truck size={19} /><span>UzPost integratsiyasi ulanganda bu yerda jo‘natma kodi va pochta yuborish amali chiqadi.</span></div></section></div>}
          </section>
        </TabsContent>
        <TabsContent value="delivery"><AdminModulePage config={adminModules.delivery} loading={loading} error={error} onNotify={setNotice} /></TabsContent>
        <TabsContent value="customers"><CustomerManager customers={customers} loading={loading} error={error} token={token} /></TabsContent>
        <TabsContent value="discounts"><DiscountManager token={token} products={products} onNotice={setNotice} /></TabsContent>
        <TabsContent value="partners"><PartnerManager token={token} products={products} onNotice={setNotice} /></TabsContent>
        <TabsContent value="finance"><AdminModulePage config={adminModules.finance} loading={loading} error={error} onNotify={setNotice} /></TabsContent>
        <TabsContent value="currencies"><CurrencyManager token={token} onNotice={setNotice} /></TabsContent>
        <TabsContent value="analytics"><AdminModulePage config={adminModules.analytics} loading={loading} error={error} onNotify={setNotice} /></TabsContent>
        <TabsContent value="settings"><AdminModulePage config={adminModules.settings} loading={loading} error={error} onNotify={setNotice} /></TabsContent>
        <TabsContent value="content">
          <section className="tailadmin-module-page admin-content-workspace">
            <aside className="tailadmin-module-tabs admin-content-subnav" aria-label="Kontent bo‘limlari">
              <p className="ui-overline">KONTENT</p>
              {contentNavigation.map(([id, label, description]) => (
                <button
                  type="button"
                  className={contentSubsection === id ? "is-active" : ""}
                  onClick={() => setContentSubsection(id)}
                  key={id}
                >
                  <span>{label}</span>
                  <small>{description}</small>
                </button>
              ))}
            </aside>
            <div className="tailadmin-module-content admin-content-panel">
              {contentSubsection === "main-banner" && (
                <BannerManager
                  banners={banners}
                  token={token}
                  onChanged={() => refresh("content")}
                />
              )}
              {contentSubsection === "custom-pages" && (
                <PageBannerEditor
                  banners={pageBanners}
                  token={token}
                  onChanged={setPageBanners}
                />
              )}
              {contentSubsection === "lookbook" && (
                <LookbookManager entries={lookbookEntries} token={token} onChanged={() => void refresh("content")} />
              )}
              {contentSubsection === "blog" && (
                <BlogManager posts={blogPosts} token={token} onChanged={() => void refresh("content")} />
              )}
              {contentSubsection === "records" && (
                <RecordsManager
                  records={records}
                  token={token}
                  onChanged={() => refresh("content")}
                />
              )}
              {contentSubsection === "collections" && (
                <List
                  title="Kolleksiyalar"
                  rows={collections.map((item) => `${item.name} · ${item.slug}`)}
                />
              )}
            </div>
          </section>
        </TabsContent>
        <TabsContent value="pages">
          <PagesManager
            pages={pages}
            token={token}
            onChanged={() => void run(() => refresh("pages"))}
          />
        </TabsContent>
        <TabsContent value="notifications"><NotificationManager items={storeNotifications} token={token} onChanged={(items) => setStoreNotifications(items)} /></TabsContent>
        <TabsContent value="team"><section className="tailadmin-products-page"><header className="tailadmin-page-heading"><div><p className="ui-overline">Tizim</p><h2>Jamoa</h2><span>Admin foydalanuvchilari va ularning rollari.</span></div></header><List title="Jamoa" rows={users.map((u) => `${u.email} · ${u.role}`)} /></section></TabsContent>
        <TabsContent value="audit"><section className="tailadmin-products-page"><header className="tailadmin-page-heading"><div><p className="ui-overline">Tizim</p><h2>Audit log</h2><span>Tizimdagi oxirgi hodisalar va amallar.</span></div></header><Card><CardContent><pre className="admin-json">{JSON.stringify(audit, null, 2)}</pre></CardContent></Card></section></TabsContent>
      </AdminShell>
      {orderCustomerLoading && <div className="inventory-confirm-backdrop customer-detail-backdrop"><p className="customer-detail-loading customer-detail-loading--overlay">Mijoz profili yuklanmoqda…</p></div>}
      {orderCustomer && <div className="inventory-confirm-backdrop customer-detail-backdrop" onMouseDown={() => setOrderCustomer(null)}><section className="customer-detail-dialog" role="dialog" aria-modal="true" aria-label="Mijoz profili" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="ui-overline">MIJOZ PROFILI</p><h3>{`${orderCustomer.firstName} ${orderCustomer.lastName}`.trim() || "Mijoz"}</h3><span>{orderCustomer.email || "Email kiritilmagan"}</span></div><button type="button" onClick={() => setOrderCustomer(null)} aria-label="Yopish">×</button></header><div className="customer-detail-metrics"><div><span>Buyurtmalar</span><b>{orderCustomer.totalOrders} ta</b></div><div><span>To‘langan</span><b>{orderCustomer.paidOrders} ta</b></div><div><span>Jami savdo</span><b>{money(orderCustomer.totalSpent, "UZS")}</b></div><div><span>O‘rtacha chek</span><b>{money(orderCustomer.averageOrder, "UZS")}</b></div></div><div className="customer-detail-columns"><section><h4>Aloqa va joylashuv</h4><dl><div><dt>Telefon</dt><dd>{orderCustomer.phone || "—"}</dd></div><div><dt>Hudud</dt><dd>{orderCustomer.region || "—"}</dd></div><div><dt>Ro‘yxatdan o‘tgan</dt><dd>{readableDate(orderCustomer.createdAt)}</dd></div><div><dt>Oxirgi kirish</dt><dd>{orderCustomer.lastLoginAt ? readableDate(orderCustomer.lastLoginAt) : "—"}</dd></div></dl>{orderCustomer.addresses.length ? <div className="customer-addresses">{orderCustomer.addresses.map((address) => <p key={address.id}><b>{address.isDefault ? "Asosiy manzil" : "Manzil"}</b><span>{[address.country, address.city, address.line1, address.line2, address.postalCode].filter(Boolean).join(", ")}</span></p>)}</div> : <p className="customer-detail-empty">Saqlangan manzil yo‘q.</p>}</section><section><h4>Buyurtmalar tarixi</h4><div className="customer-detail-orders">{orderCustomer.orders.map((order) => <article key={order.id}><div><b>#{order.orderNumber}</b><span>{readableDate(order.createdAt)} · {order.paymentStatus}</span><small>{order.items.map((item) => `${item.title} × ${item.quantity}`).join(", ") || "Mahsulot yo‘q"}</small></div><strong>{money(Number(order.totalAmount), order.currencyCode || "UZS")}</strong></article>)}{!orderCustomer.orders.length && <p className="customer-detail-empty">Bu mijozda buyurtma yo‘q.</p>}</div></section></div></section></div>}
    </Tabs>
  );
}
function Taxonomy({
  title,
  data,
  setData,
  rows,
  submit,
}: {
  title: string;
  data: ReturnType<typeof blankTaxonomy>;
  setData: React.Dispatch<
    React.SetStateAction<ReturnType<typeof blankTaxonomy>>
  >;
  rows: Taxonomy[];
  submit: (e: FormEvent) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yangi {title.toLowerCase()}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="ui-form" onSubmit={submit}>
          <Field label="Nomi">
            <input
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Slug">
            <input
              value={data.slug}
              onChange={(e) => setData({ ...data, slug: e.target.value })}
              required
            />
          </Field>
          <Button>
            <Plus size={15} />
            Qo‘shish
          </Button>
        </form>
        <div className="admin-mini-list">
          {rows.map((x) => (
            <p key={x.id}>
              {x.name}
              <Badge variant={x.isVisible ? "success" : "warning"}>
                {x.isVisible ? "visible" : "hidden"}
              </Badge>
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
function CategoryManager({ categories, products, token, onChanged }: { categories: Taxonomy[]; products: Product[]; token: string; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<Taxonomy | null>(null); const [query, setQuery] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [view, setView] = useState<"list" | "editor">("list");
  const visible = products.filter((product) => `${product.title} ${product.slug}`.toLocaleLowerCase("uz-UZ").includes(query.toLocaleLowerCase("uz-UZ")));
  const open = (category?: Taxonomy, productsOnly = false) => { setEditing(category ? { ...category } : { id: "", name: "", slug: "", isVisible: true }); setQuery(""); setMessage(productsOnly ? "Mahsulotlarni boshqaring." : ""); setView("editor"); };
  const saveCategory = async () => { if (!editing || !editing.name.trim() || !editing.slug.trim()) return setMessage("Nomi va slug majburiy."); setBusy(true); try { await api(editing.id ? `/admin/catalog/categories/${editing.id}` : "/admin/catalog/categories", token, { method: editing.id ? "PATCH" : "POST", body: JSON.stringify({ name: editing.name.trim(), slug: editing.slug.trim(), isVisible: editing.isVisible }) }); await onChanged(); setView("list"); setEditing(null); } catch (error) { setMessage(error instanceof Error ? error.message : "Kategoriya saqlanmadi."); } finally { setBusy(false); } };
  const move = async (product: Product) => { if (!editing) return; if (product.categoryId && product.categoryId !== editing.id && !confirm(`“${product.title}” boshqa kategoriyada. Shu kategoriyaga ko‘chirilsinmi?`)) return; setBusy(true); try { await api(`/admin/catalog/products/${product.id}`, token, { method: "PATCH", body: JSON.stringify({ categoryId: editing.id }) }); await onChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : "Mahsulot ko‘chirilmadi."); } finally { setBusy(false); } };
  const detach = async (product: Product) => { if (!editing || !confirm(`“${product.title}” ushbu kategoriyadan olib tashlansinmi?`)) return; setBusy(true); try { await api(`/admin/catalog/products/${product.id}`, token, { method: "PATCH", body: JSON.stringify({ categoryId: null }) }); await onChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : "Mahsulot olib tashlanmadi."); } finally { setBusy(false); } };
  const productColors = (product: Product) => [...new Set(product.variants.map((variant) => variant.color?.trim()).filter((color): color is string => Boolean(color)))];
  if (view === "list") return <section className="tailadmin-module-page"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-sm text-gray-500 dark:text-gray-400">Katalog sozlamalari</p><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Kategoriyalar</h2></div><Button onClick={() => open()}><Plus size={16} />Yangi kategoriya</Button></div><Card className="category-manager category-manager--list"><CardHeader><div><CardTitle>Kategoriyalar ro‘yxati</CardTitle><CardDescription>Mahsulotlar kategoriyalarini tartiblang va saytda ko‘rinishini boshqaring.</CardDescription></div></CardHeader><CardContent><div className="category-row-list">{categories.map((category) => <article key={category.id}><div><b>{category.name}</b><span>{category.productCount ?? products.filter((product) => product.categoryId === category.id).length} mahsulot</span></div><div className="category-row-actions"><Button size="sm" onClick={() => open(category)}>Tahrirlash</Button><Button size="sm" variant="outline" onClick={() => open(category, true)}>Mahsulotlar</Button></div></article>)}{!categories.length && <Empty>Kategoriya yo‘q.</Empty>}</div></CardContent></Card></section>;
  if (!editing) return null;
  const updateName = (name: string) => {
    const generatedSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setEditing({ ...editing, name, slug: editing.id ? editing.slug : generatedSlug });
  };
  return <section className="tailadmin-module-page"><Card className="category-manager category-manager--editor">
    <CardHeader><div><p className="ui-overline">KATEGORIYALAR / {editing.id ? "EDIT" : "YANGI"}</p><CardTitle>{editing.id ? editing.name || "Kategoriyani tahrirlash" : "Yangi kategoriya"}</CardTitle><CardDescription>Saqlangach kategoriya ro‘yxatiga qaytasiz.</CardDescription></div><Button variant="outline" onClick={() => { setView("list"); setEditing(null); }}>← Ro‘yxat</Button></CardHeader>
    <CardContent><section className="category-editor">
      <header><Button size="sm" onClick={() => void saveCategory()} disabled={busy}>{busy ? "Saqlanmoqda…" : "Saqlash"}</Button></header>
      <div className="category-editor-form">
        <Field label="Nomi"><input value={editing.name} onChange={(event) => updateName(event.target.value)} placeholder="Kategoriya nomi" required /></Field>
        <div className="category-search-field"><label htmlFor="category-product-search">Qidirish</label><input id="category-product-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SKU yoki mahsulot nomi" disabled={!editing.id} /></div>
      </div>
      <div className="category-slug-field"><Field label="Slug"><input value={editing.slug} onChange={(event) => setEditing({ ...editing, slug: event.target.value })} required /></Field></div>
      <label className="admin-record-active"><input type="checkbox" checked={editing.isVisible} onChange={(event) => setEditing({ ...editing, isVisible: event.target.checked })} /> Saytda ko‘rsatish</label>
      {editing.id ? <div className="category-product-list" aria-label="Kategoriya mahsulotlari">{visible.map((product) => { const assigned = product.categoryId === editing.id; const owner = categories.find((category) => category.id === product.categoryId); const colors = productColors(product); return <article key={product.id} className={assigned ? "is-assigned" : ""}><button type="button" className="category-product-select" aria-label={`${product.title} ${assigned ? "tanlangan" : "tanlanmagan"}`} disabled={busy} onClick={() => void (assigned ? detach(product) : move(product))}>{assigned ? "✓" : ""}</button><img src={contentImageUrl(product.media[0]?.url)} alt="" /><div><b>{product.title}</b><small>{product.metadata?.article || product.slug}</small><span className="category-product-colors">{colors.length ? colors.map((color) => <i key={color} title={color} style={{ backgroundColor: colorHex(color) }} />) : "Rang kiritilmagan"}</span></div><div className="category-product-status"><small>{assigned ? "Shu kategoriya" : owner ? `Hozir: ${owner.name}` : "Kategoriya biriktirilmagan"}</small><Button type="button" size="sm" variant={assigned ? "outline" : "default"} disabled={busy} onClick={() => void (assigned ? detach(product) : move(product))}>{assigned ? "Olib tashlash" : "Biriktirish"}</Button></div></article>; })}{!visible.length && <Empty>Mahsulot topilmadi.</Empty>}</div> : <p className="category-save-note">Mahsulotlarni tanlash uchun avval kategoriyani saqlang.</p>}
      <AdminToast message={message} />
    </section></CardContent>
  </Card></section>;
}
function List({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Card className="admin-list-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <ul>
            {rows.map((x, i) => (
              <li key={i}>
                {x}
                <ChevronRight size={15} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            <FileText />
            Ma’lumot yo‘q.
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
function PagesManager({
  pages,
  token,
  onChanged,
}: {
  pages: CmsPage[];
  token: string;
  onChanged: () => void;
}) {
  const [links, setLinks] = useState<NavigationItem[]>(defaultNavigation);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const loadNavigation = useCallback(async () => {
    const settings = await api<SiteSetting[]>("/admin/content/settings", token);
    const saved = settings.find((setting) => setting.key === "navigation")?.value?.items;
    if (Array.isArray(saved)) {
      setLinks(saved.filter((item): item is NavigationItem => Boolean(item && typeof item === "object")));
    }
  }, [token]);

  useEffect(() => { void loadNavigation().catch(() => undefined); }, [loadNavigation]);

  const toggle = async (item: NavigationItem) => {
    const next = links.map((link) => link.id === item.id ? { ...link, isActive: !link.isActive } : link);
    setBusy(true);
    setMessage("");
    try {
      if (item.pageId) {
        await api(`/admin/content/pages/${item.pageId}`, token, {
          method: "PATCH",
          body: JSON.stringify({ isPublished: !item.isActive }),
        });
      }
      await api("/admin/content/settings/navigation", token, {
        method: "PUT",
        body: JSON.stringify({ value: { items: next } }),
      });
      setLinks(next);
      setMessage(item.isActive ? "Navbar linki vaqtincha o‘chirildi." : "Navbar linki faollashtirildi.");
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Holat saqlanmadi.");
    } finally {
      setBusy(false);
    }
  };

  const renameLink = async (item: NavigationItem) => {
    const label = editingLabel.trim();
    if (!label) return setMessage("Navbar nomini kiriting.");
    const next = links.map((link) => link.id === item.id ? { ...link, label, translationKey: undefined } : link);
    setBusy(true);
    setMessage("");
    try {
      await api("/admin/content/settings/navigation", token, {
        method: "PUT",
        body: JSON.stringify({ value: { items: next } }),
      });
      setLinks(next);
      setEditingLinkId(null);
      setMessage("Navbar nomi saqlandi.");
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Navbar nomi saqlanmadi.");
    } finally {
      setBusy(false);
    }
  };

  const createPage = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!title.trim() || !normalizedSlug) {
      setMessage("Sahifa nomi va lotincha slug kiriting.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const page = await api<CmsPage>("/admin/content/pages", token, {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), slug: normalizedSlug, isPublished: true }),
      });
      const next = [...links, {
        id: `page-${page.id}`,
        pageId: page.id,
        href: `/pages/${page.slug}`,
        label: page.title,
        isActive: true,
      }];
      await api("/admin/content/settings/navigation", token, {
        method: "PUT",
        body: JSON.stringify({ value: { items: next } }),
      });
      setLinks(next);
      setTitle("");
      setSlug("");
      setMessage("Yangi sahifa yaratildi va navbar’ga qo‘shildi.");
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sahifa yaratilmagan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pages-manager tailadmin-module-page">
      <Card>
        <CardHeader>
          <div>
            <p className="ui-overline">NAVIGATION</p>
            <CardTitle>Navbar sahifalari</CardTitle>
            <CardDescription>Nomni tahrirlang va har bir link sayt tepasida ko‘rinishi yoki yashirilishini boshqaring.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="pages-manager-list">
            {links.map((item, index) => {
              const defaultLabel = defaultNavigation.find((link) => link.id === item.id)?.label ?? item.label;
              const isEditing = editingLinkId === item.id;
              return (
              <div className="pages-manager-row" key={item.id}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <div>{isEditing ? <div className="pages-manager-edit"><input autoFocus value={editingLabel} onChange={(event) => setEditingLabel(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void renameLink(item); if (event.key === "Escape") setEditingLinkId(null); }} /><Button type="button" size="sm" disabled={busy} onClick={() => void renameLink(item)}>SAQLASH</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditingLinkId(null)}>BEKOR</Button></div> : <><strong>{item.label.toUpperCase()}</strong><span>{item.href} · DEFAULT: {defaultLabel.toUpperCase()}</span></>}</div>
                <Badge variant={item.isActive ? "success" : "warning"}>{item.isActive ? "KO‘RINADI" : "KO‘RINMAYDI"}</Badge>
                {!isEditing && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setEditingLinkId(item.id); setEditingLabel(item.label); }}>NOMINI EDIT</Button>}
                <Button type="button" variant={item.isActive ? "outline" : "default"} size="sm" disabled={busy} onClick={() => void toggle(item)}>
                  {item.isActive ? "YASHIRISH" : "KO‘RSATISH"}
                </Button>
              </div>
            ); })}
          </div>
          <AdminToast message={message} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div><p className="ui-overline">NEW PAGE</p><CardTitle>Yangi sahifa qo‘shish</CardTitle></div>
        </CardHeader>
        <CardContent>
          <form className="ui-form ui-form-grid" onSubmit={createPage}>
            <Field label="Sahifa nomi"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Masalan: Yetkazib berish" required /></Field>
            <Field label="Slug (URL)"><input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="yetkazib-berish" /></Field>
            <Button disabled={busy}><Plus size={15} /> Sahifa qo‘shish</Button>
          </form>
          {pages.length > 0 && <p className="pages-manager-note">Yaratilgan sahifalar: {pages.map((page) => page.title).join(", ")}</p>}
        </CardContent>
      </Card>
    </section>
  );
}
function ContentIntro({
  title,
  description,
  empty,
}: {
  title: string;
  description: string;
  empty: string;
}) {
  return (
    <Card className="admin-list-card">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Empty>
          <FileText />
          {empty}
        </Empty>
      </CardContent>
    </Card>
  );
}
const contentImageUrl = (url?: string | null) => !url ? "" : (url.startsWith("http") ? url : `${API.replace(/\/api$/, "")}${url}`);
const readableDate = (value?: string | null) => value ? new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

function LookbookManager({ entries, token, onChanged }: { entries: LookbookEntry[]; token: string; onChanged: () => void }) {
  const [editing, setEditing] = useState<LookbookEntry | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const upload = async (image: File) => {
    const data = new FormData(); data.append("file", image);
    return api<{ url: string }>("/admin/content/lookbook/upload", token, { method: "POST", body: data });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!file && !imageUrl.trim()) { setMessage("JPG/PNG/WEBP rasm yoki rasm URL kiriting."); return; }
    setBusy(true); setMessage("");
    try {
      const image = file ? await upload(file) : { url: imageUrl.trim() };
      const generatedTitle = (file?.name ?? imageUrl.split("/").pop() ?? "Lookbook image").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Lookbook image";
      const payload = editing
        ? { imageUrl: image.url }
        : { title: generatedTitle, imageUrl: image.url, position: entries.length, isPublished: true };
      await api(editing ? `/admin/content/lookbook/${editing.id}` : "/admin/content/lookbook", token, { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setEditing(null); setFile(null); setImageUrl(""); setShowComposer(false); setMessage(editing ? "Rasm almashtirildi." : "Lookbook rasmi qo‘shildi."); onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Lookbook saqlanmadi."); } finally { setBusy(false); }
  };
  const edit = (entry: LookbookEntry) => { setEditing(entry); setFile(null); setImageUrl(entry.imageUrl); setShowComposer(true); setMessage(""); };
  const remove = async (entry: LookbookEntry) => {
    if (!confirm(`“${entry.title}” o‘chirilsinmi?`)) return;
    setBusy(true); setMessage("");
    try { await api(`/admin/content/lookbook/${entry.id}`, token, { method: "DELETE" }); if (editing?.id === entry.id) { setEditing(null); setShowComposer(false); } setMessage("Lookbook rasmi o‘chirildi."); onChanged(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Lookbook o‘chirilmadi."); } finally { setBusy(false); }
  };
  const toggle = async (entry: LookbookEntry) => {
    setBusy(true); setMessage("");
    try {
      await api(`/admin/content/lookbook/${entry.id}`, token, { method: "PATCH", body: JSON.stringify({ isPublished: !entry.isPublished }) });
      setMessage(entry.isPublished ? "Lookbook rasmi vaqtincha o‘chirildi." : "Lookbook rasmi faollashtirildi.");
      onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Holat saqlanmadi."); } finally { setBusy(false); }
  };
  return <section className="content-manager tailadmin-module-page">
    {showComposer && <Card><CardHeader className="lookbook-composer-head"><div><p className="ui-overline">LOOKBOOK</p><CardTitle>{editing ? "Lookbook rasmini almashtirish" : "Lookbook rasmi qo‘shish"}</CardTitle><CardDescription>Rasm faylini yuklang yoki URL kiriting. JPG, PNG yoki WEBP · maksimal 10 MB · tavsiya etilgan o‘lcham: 1600 × 1600 px.</CardDescription></div><Button type="button" size="sm" variant="outline" onClick={() => { setEditing(null); setFile(null); setImageUrl(""); setShowComposer(false); }}>YOPISH</Button></CardHeader><CardContent>
      <form className="ui-form" onSubmit={save}>
        <Field label="RASM URL"><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></Field>
        <Field label="YOKI JPG RASM YUKLASH"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Field>
        <div className="content-manager-actions"><Button disabled={busy}>{editing ? "RASMNI ALMASHTIRISH" : "RASMNI QO‘SHISH"}</Button>{editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setFile(null); setImageUrl(""); setShowComposer(false); }}>BEKOR QILISH</Button>}</div>
      </form>
    </CardContent></Card>}
    <Card><CardHeader className="lookbook-list-head"><div><CardTitle>Lookbook ro‘yxati</CardTitle><CardDescription>Qachon yuklangani, faollik, rasmni almashtirish va o‘chirish shu yerda.</CardDescription></div><Button type="button" size="sm" onClick={() => { setEditing(null); setFile(null); setImageUrl(""); setShowComposer(true); setMessage(""); }}>+ QO‘SHISH</Button></CardHeader><CardContent><div className="lookbook-library">{entries.map((entry, index) => <article className="lookbook-library-card" key={entry.id}><img src={contentImageUrl(entry.imageUrl)} alt={`Lookbook rasm ${index + 1}`} /><div className="lookbook-card-meta"><Badge variant={entry.isPublished ? "success" : "warning"}>{entry.isPublished ? "FAOL" : "VAQTINCHA O‘CHIRILGAN"}</Badge><small>{readableDate(entry.createdAt)}</small></div><footer><Button type="button" variant={entry.isPublished ? "outline" : "default"} onClick={() => void toggle(entry)} disabled={busy}>{entry.isPublished ? "VAQTINCHA O‘CHIRISH" : "FAOLLASHTIRISH"}</Button><Button type="button" variant="outline" onClick={() => edit(entry)}>ALMASHTIRISH</Button><Button type="button" variant="outline" onClick={() => void remove(entry)} disabled={busy}>O‘CHIRISH</Button></footer></article>)}{!entries.length && <Empty><Palette /> Hali lookbook rasmi yo‘q.</Empty>}</div><AdminToast message={message} /></CardContent></Card>
  </section>;
}

function BlogManager({ posts, token, onChanged }: { posts: BlogPost[]; token: string; onChanged: () => void }) {
  const empty = { title: "", slug: "", excerpt: "", body: "", coverImageUrl: "", isPublished: true, publishedAt: new Date().toISOString().slice(0, 10), textLinkUrl: "", textLinkLabel: "", gallery: [] as string[] };
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryUrl, setGalleryUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const upload = async (image: File) => { const data = new FormData(); data.append("file", image); return api<{ url: string }>("/admin/content/posts/upload", token, { method: "POST", body: data }); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const slug = (draft.slug || draft.title).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!draft.title.trim() || !slug || (!draft.coverImageUrl.trim() && !coverFile)) { setMessage("Sarlavha, slug va asosiy rasm majburiy."); return; }
    setBusy(true); setMessage("");
    try {
      const cover = coverFile ? await upload(coverFile) : { url: draft.coverImageUrl.trim() };
      const uploadedGallery = await Promise.all(galleryFiles.map(upload));
      const seo = { ...(editing?.seo ?? {}), galleryImageUrls: [...draft.gallery, ...uploadedGallery.map((item) => item.url)], textLinkUrl: draft.textLinkUrl.trim(), textLinkLabel: draft.textLinkLabel.trim() };
      const payload = { title: draft.title.trim(), slug, excerpt: draft.excerpt.trim(), body: draft.body.trim(), coverImageUrl: cover.url, isPublished: draft.isPublished, publishedAt: new Date(draft.publishedAt).toISOString(), seo };
      await api(editing ? `/admin/content/posts/${editing.id}` : "/admin/content/posts", token, { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setEditing(null); setDraft(empty); setCoverFile(null); setGalleryFiles([]); setGalleryUrl(""); setMessage(editing ? "Blog tahrirlandi." : "Blog qo‘shildi."); onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Blog saqlanmadi."); } finally { setBusy(false); }
  };
  const edit = (post: BlogPost) => { const seo = post.seo ?? {}; setEditing(post); setCoverFile(null); setGalleryFiles([]); setGalleryUrl(""); setDraft({ title: post.title, slug: post.slug, excerpt: post.excerpt, body: post.body, coverImageUrl: post.coverImageUrl ?? "", isPublished: post.isPublished, publishedAt: (post.publishedAt ?? post.createdAt).slice(0, 10), textLinkUrl: typeof seo.textLinkUrl === "string" ? seo.textLinkUrl : "", textLinkLabel: typeof seo.textLinkLabel === "string" ? seo.textLinkLabel : "", gallery: Array.isArray(seo.galleryImageUrls) ? seo.galleryImageUrls.filter((item): item is string => typeof item === "string") : [] }); setMessage(""); };
  const remove = async (post: BlogPost) => { if (!confirm(`“${post.title}” o‘chirilsinmi?`)) return; setBusy(true); setMessage(""); try { await api(`/admin/content/posts/${post.id}`, token, { method: "DELETE" }); if (editing?.id === post.id) { setEditing(null); setDraft(empty); } setMessage("Blog o‘chirildi."); onChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : "Blog o‘chirilmadi."); } finally { setBusy(false); } };
  return <section className="content-manager tailadmin-module-page">
    <Card><CardHeader><div><p className="ui-overline">BLOG</p><CardTitle>{editing ? "Blogni tahrirlash" : "Blog maqolasi qo‘shish"}</CardTitle><CardDescription>Asosiy rasm: 1600 × 900 px; qo‘shimcha rasmlar: 1200 × 1200 px. JPG/PNG/WEBP, har biri 10 MB gacha.</CardDescription></div></CardHeader><CardContent>
      <form className="ui-form ui-form-grid" onSubmit={save}>
        <Field label="SARLAVHA"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></Field><Field label="SLUG (URL)"><input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} placeholder="yangi-maqola" /></Field>
        <Field label="SANA"><input type="date" value={draft.publishedAt} onChange={(event) => setDraft({ ...draft, publishedAt: event.target.value })} required /></Field><Field label="ASOSIY RASM URL"><input value={draft.coverImageUrl} onChange={(event) => setDraft({ ...draft, coverImageUrl: event.target.value })} placeholder="https://..." /></Field>
        <Field label="YOKI ASOSIY RASM YUKLASH"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} /></Field><Field label="QO‘SHIMCHA RASMLARNI YUKLASH"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => setGalleryFiles(Array.from(event.target.files ?? []))} /></Field>
        <Field label="QISQA ASOSIY TEXT"><textarea value={draft.excerpt} onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })} /></Field><Field label="ASOSIY MATN"><textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></Field>
        <Field label="TEXT UCHUN LINK"><input value={draft.textLinkUrl} onChange={(event) => setDraft({ ...draft, textLinkUrl: event.target.value })} placeholder="/shop yoki https://..." /></Field><Field label="LINK NOMI"><input value={draft.textLinkLabel} onChange={(event) => setDraft({ ...draft, textLinkLabel: event.target.value })} placeholder="BATAFSIL O‘QISH" /></Field>
        <div className="blog-gallery-add"><input value={galleryUrl} onChange={(event) => setGalleryUrl(event.target.value)} placeholder="Qo‘shimcha rasm URL" /><Button type="button" variant="outline" size="sm" onClick={() => { if (galleryUrl.trim()) { setDraft({ ...draft, gallery: [...draft.gallery, galleryUrl.trim()] }); setGalleryUrl(""); } }}>+ RASM URL</Button></div>
        {draft.gallery.length > 0 && <div className="blog-gallery-chip-list">{draft.gallery.map((url, index) => <button type="button" key={`${url}-${index}`} onClick={() => setDraft({ ...draft, gallery: draft.gallery.filter((_, itemIndex) => itemIndex !== index) })}>× Rasm {index + 1}</button>)}</div>}
        <label className="ui-checkbox"><input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })} /> Saytda chop etish</label><div className="content-manager-actions"><Button disabled={busy}>{editing ? "TAHRIRLASHNI SAQLASH" : "BLOG QO‘SHISH"}</Button>{editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setDraft(empty); setCoverFile(null); setGalleryFiles([]); }}>BEKOR QILISH</Button>}</div>
      </form>
    </CardContent></Card>
    <Card><CardHeader><div><CardTitle>Blog ro‘yxati</CardTitle><CardDescription>Asosiy rasm, sana, yuklangan vaqt, tahrirlash va o‘chirish.</CardDescription></div></CardHeader><CardContent><div className="content-entry-list">{posts.map((post) => <div className="content-entry-row" key={post.id}><img src={contentImageUrl(post.coverImageUrl)} alt="" /><div><strong>{post.title}</strong><span>{readableDate(post.createdAt)} · {readableDate(post.publishedAt)}</span><Badge variant={post.isPublished ? "success" : "warning"}>{post.isPublished ? "SAYTDA FAOL" : "DRAFT"}</Badge></div><Button type="button" size="sm" variant="outline" onClick={() => edit(post)}>EDIT</Button><Button type="button" size="sm" variant="outline" onClick={() => void remove(post)} disabled={busy}>O‘CHIRISH</Button></div>)}{!posts.length && <Empty><FileText /> Hali blog maqolasi yo‘q.</Empty>}</div><AdminToast message={message} /></CardContent></Card>
  </section>;
}
function recordAssetUrl(url: string) {
  return url.startsWith("http") ? url : `${API.replace(/\/api$/, "")}${url}`;
}
function PageBannerEditor({
  banners,
  token,
  onChanged,
}: {
  banners: PageBannerDraft[];
  token: string;
  onChanged: (items: PageBannerDraft[]) => void;
}) {
  const [draft, setDraft] = useState<PageBannerDraft>(blankPageBanner);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopSlotFiles, setDesktopSlotFiles] = useState<Record<string, File>>({});
  const [mobileSlotFiles, setMobileSlotFiles] = useState<Record<string, File>>({});
  const [skuProducts, setSkuProducts] = useState<Product[]>([]);
  const [cartEntry, setCartEntry] = useState("");
  const [cartSelected, setCartSelected] = useState(false);
  const [editorMode, setEditorMode] = useState<"desktop" | "mobile" | null>(null);
  const [view, setView] = useState<"list" | "editor">("list");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingDuplicateDelete, setPendingDuplicateDelete] = useState<PageBannerDraft | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [showCreateChoice, setShowCreateChoice] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [desktopTemplate, setDesktopTemplate] = useState<DesktopSectionTemplate | null>(null);
  const [mobileTemplate, setMobileTemplate] = useState<MobileSectionTemplate | null>(null);
  const [showBannerTemplatePicker, setShowBannerTemplatePicker] = useState(false);
  const [desktopBannerTemplate, setDesktopBannerTemplate] = useState<BannerOnlyDesktopTemplate | null>(null);
  const [mobileBannerTemplate, setMobileBannerTemplate] = useState<BannerOnlyMobileTemplate | null>(null);
  const placements = [
    ["Main banner", true],
    ["Swipe mahsulot kartalari", true],
    ["Mahsulot kartalaridan keyin", false],
    ["Records", true],
    ["Recordsdan keyin", false],
    ["Blog", true],
    ["Blogdan keyin", false],
  ] as const;
  const movablePlacements = [2, 4, 6];
  const sectionSource = banners.some((item) => item.layoutType)
    ? banners.filter((item) => item.layoutType)
    : defaultHomepageSections();
  const orderedBanners = [...sectionSource].sort(
    (left, right) => (left.sortOrder ?? sectionSource.indexOf(left)) - (right.sortOrder ?? sectionSource.indexOf(right)),
  );
  // Duplicates created before the `isDuplicate` field existed still have the
  // conventional “— copy” suffix. They retain the same delete behaviour.
  const isDuplicateSection = (section: PageBannerDraft) =>
    section.isDuplicate === true || /(?:\s[-—]\s)?copy$/i.test(section.name.trim());
  const normalizeOrder = (items: PageBannerDraft[]) =>
    items.map((item, index) => ({ ...item, sortOrder: index }));
  useEffect(() => {
    if (!token) return;
    void api<Product[]>("/admin/catalog/products", token).then(setSkuProducts).catch(() => setSkuProducts([]));
  }, [token]);
  const update = <K extends keyof PageBannerDraft>(key: K, value: PageBannerDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const uploadImage = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return api<{ url: string }>("/admin/content/banners/upload", token, { method: "POST", body: data });
  };
  const save = async () => {
    const knownSkus = new Set(skuProducts.flatMap((product) => product.variants.map((variant) => variant.sku)));
    const desktopCartItems = (draft.desktopCartItems ?? []).map((item) => item.trim()).filter(Boolean);
    const mobileCartItems = (draft.mobileCartItems ?? []).map((item) => item.trim()).filter(Boolean);
    const desktopBannerCount = draft.sectionKind === "banner" ? (draft.desktopBannerTemplate === "one-max" ? 1 : 2) : 1;
    const mobileBannerCount = draft.sectionKind === "banner" ? (draft.mobileBannerTemplate === "one-full" ? 1 : 2) : 1;
    const bannerSlotCount = Math.max(desktopBannerCount, mobileBannerCount);
    const bannerSlots = Array.from({ length: bannerSlotCount }, (_, index) => draft.bannerItems?.[index] ?? bannerSlotAt("desktop", index));
    if (!draft.desktopImageUrl && !desktopFile) {
      setMessage("Desktop rasm yuklang yoki URL kiriting.");
      return;
    }
    if (draft.sectionKind === "banner" && bannerSlots.some((slot, index) => (!slot.desktopImageUrl && !(index === 0 ? desktopFile : desktopSlotFiles[slot.id])) || (!slot.mobileImageUrl && !(index === 0 ? mobileFile : mobileSlotFiles[slot.id])))) {
      setMessage("Tanlangan shablondagi har bir banner uchun Desktop va Mobile rasm kiriting.");
      return;
    }
    if (draft.sectionKind === "banner-cart") {
      // Product cards are optional.  A newly created section can be saved
      // before products are entered; the storefront then uses available
      // catalog products as its fallback cards.  Only validate values that
      // the administrator actually selected.
      const selectedSkus = [...desktopCartItems, ...mobileCartItems];
      if (selectedSkus.some((sku) => !knownSkus.has(sku))) {
        setMessage("Cartga faqat mavjud mahsulot SKU sini tanlang.");
        return;
      }
      if (new Set(desktopCartItems).size !== desktopCartItems.length || new Set(mobileCartItems).size !== mobileCartItems.length) {
        setMessage("Bir xil SKU ni bitta section ichida qayta tanlab bo‘lmaydi.");
        return;
      }
    }
    setBusy(true);
    setMessage("");
    try {
      const desktop = desktopFile ? await uploadImage(desktopFile) : { url: draft.desktopImageUrl };
      const mobile = mobileFile ? await uploadImage(mobileFile) : { url: draft.mobileImageUrl || desktop.url };
      const savedBannerItems = await Promise.all(bannerSlots.map(async (slot, index) => {
        const desktopSlot = index === 0 ? desktop : desktopSlotFiles[slot.id] ? await uploadImage(desktopSlotFiles[slot.id]) : { url: slot.desktopImageUrl };
        const mobileSlot = index === 0 ? mobile : mobileSlotFiles[slot.id] ? await uploadImage(mobileSlotFiles[slot.id]) : { url: slot.mobileImageUrl };
        return { ...slot, desktopImageUrl: desktopSlot.url, mobileImageUrl: mobileSlot.url };
      }));
      const item = {
        ...draft,
        name: draft.desktopName || draft.name,
        targetUrl: draft.desktopLink || draft.targetUrl,
        linkLabel: draft.desktopLinkLabel || draft.linkLabel,
        shadow: draft.desktopShadow ?? draft.shadow,
        cartItems: desktopCartItems,
        desktopCartItems,
        mobileCartItems,
        desktopImageUrl: desktop.url,
        mobileImageUrl: mobile.url,
        bannerItems: savedBannerItems,
      };
      const exists = orderedBanners.some((banner) => banner.id === item.id);
      const next = normalizeOrder(exists ? orderedBanners.map((banner) => banner.id === item.id ? item : banner) : [...orderedBanners, { ...item, sortOrder: orderedBanners.length }]);
      await api("/admin/content/settings/page-banners", token, {
        method: "PUT",
        body: JSON.stringify({ value: { items: next } }),
      });
      onChanged(next);
      setDesktopFile(null);
      setMobileFile(null);
      setDesktopSlotFiles({});
      setMobileSlotFiles({});
      setMessage("Custom section saqlandi.");
      setView("list");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Page banner saqlanmadi.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Bu custom section o‘chirilsinmi?")) return;
    const next = normalizeOrder(orderedBanners.filter((banner) => banner.id !== id));
    setBusy(true);
    try {
      await api("/admin/content/settings/page-banners", token, {
        method: "PUT",
        body: JSON.stringify({ value: { items: next } }),
      });
      onChanged(next);
      if (draft.id === id) setDraft(blankPageBanner());
      setMessage("Custom section o‘chirildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chervonik o‘chirilmadi.");
    } finally {
      setBusy(false);
    }
  };
  const saveDefaultSections = async (next: PageBannerDraft[], successMessage: string) => {
    setBusy(true);
    setMessage("");
    try {
      const normalized = normalizeOrder(next);
      await api("/admin/content/settings/page-banners", token, {
        method: "PUT",
        body: JSON.stringify({ value: { items: normalized } }),
      });
      onChanged(normalized);
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Section holati saqlanmadi.");
    } finally {
      setBusy(false);
    }
  };
  const toggleDefaultSection = (id: string) => {
    const current = orderedBanners.find((item) => item.id === id);
    if (!current) return;
    return saveDefaultSections(
      orderedBanners.map((item) => item.id === id ? { ...item, isActive: item.isActive === false } : item),
      current.isActive === false ? "Section aktivlashtirildi." : "Section vaqtincha o‘chirildi.",
    );
  };
  const duplicateDefaultSection = (source: PageBannerDraft) => {
    const copy: PageBannerDraft = {
      ...source,
      id: `section-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${source.name} — copy`,
      // A duplicate never changes the storefront until the admin explicitly
      // enables it. This keeps the default desktop/mobile structure stable.
      isActive: false,
      isDuplicate: true,
      sortOrder: orderedBanners.length,
    };
    return saveDefaultSections([...orderedBanners, copy], "Section dublikat qilindi. Uni kerak bo‘lsa aktivlashtiring.");
  };
  const deleteDuplicate = async () => {
    if (!pendingDuplicateDelete || !isDuplicateSection(pendingDuplicateDelete)) return;
    const name = pendingDuplicateDelete.name;
    const next = orderedBanners.filter((item) => item.id !== pendingDuplicateDelete.id);
    setPendingDuplicateDelete(null);
    await saveDefaultSections(next, `“${name}” dublikati o‘chirildi.`);
  };
  const desktopImage = draft.desktopImageUrl ? recordAssetUrl(draft.desktopImageUrl) : "";
  const mobileImage = draft.mobileImageUrl ? recordAssetUrl(draft.mobileImageUrl) : desktopImage;
  const desktopDefaultHeight = draft.cartEnabled ? (draft.desktopCartPosition === "below" ? 360 : 420) : 460;
  const addCartItem = () => {
    const value = cartEntry.trim();
    if (!value || draft.cartItems.includes(value)) return;
    update("cartItems", [...draft.cartItems, value]);
    setCartEntry("");
    setCartSelected(true);
  };
  const removeCartItem = (value: string) => update("cartItems", draft.cartItems.filter((item) => item !== value));
  const movePlacement = (direction: -1 | 1) => {
    const current = Math.max(0, movablePlacements.indexOf(draft.placement));
    update("placement", movablePlacements[Math.min(movablePlacements.length - 1, Math.max(0, current + direction))]);
  };
  const saveOrder = async (next: PageBannerDraft[]) => {
    const normalized = normalizeOrder(next);
    setBusy(true);
    setMessage("");
    try {
      await api("/admin/content/settings/page-banners", token, {
        method: "PUT",
        body: JSON.stringify({ value: { items: normalized } }),
      });
      onChanged(normalized);
      setMessage("Section tartibi saqlandi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Section tartibi saqlanmadi.");
    } finally {
      setBusy(false);
    }
  };
  const moveSection = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const next = [...orderedBanners];
    const sourceIndex = next.findIndex((banner) => banner.id === sourceId);
    const targetIndex = next.findIndex((banner) => banner.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    void saveOrder(next);
  };
  const openNew = (withCart = false, selectedDesktopTemplate?: DesktopSectionTemplate, selectedMobileTemplate?: MobileSectionTemplate) => {
    const templateDraft = { ...blankPageBanner(), cartEnabled: withCart, sectionKind: withCart ? "banner-cart" as const : "banner" as const };
    if (selectedDesktopTemplate === "carts-left") {
      templateDraft.desktopCartPosition = "left";
      templateDraft.desktopTextPosition = "bottom-right";
    } else if (selectedDesktopTemplate === "carts-below") {
      templateDraft.desktopCartPosition = "below";
      templateDraft.desktopTextPosition = "center-left";
    } else {
      templateDraft.desktopCartPosition = "right";
      templateDraft.desktopTextPosition = "bottom-left";
    }
    if (selectedMobileTemplate === "stack-middle") {
      templateDraft.mobileTextPosition = "center";
    } else if (selectedMobileTemplate === "swipe-below") {
      templateDraft.mobileTextPosition = "bottom-left";
      templateDraft.cartSwipe = true;
      templateDraft.cartItems = ["Mahsulot 1", "Mahsulot 2", "Mahsulot 3", "Mahsulot 4", "Mahsulot 5", "Mahsulot 6"];
    } else {
      templateDraft.mobileTextPosition = "top-left";
    }
    templateDraft.desktopTemplate = selectedDesktopTemplate ?? templateDraft.desktopTemplate;
    templateDraft.mobileTemplate = selectedMobileTemplate ?? templateDraft.mobileTemplate;
    setDraft(templateDraft);
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopSlotFiles({});
    setMobileSlotFiles({});
    setCartEntry("");
    setCartSelected(withCart);
    setMessage("");
    setShowCreateChoice(false);
    setShowTemplatePicker(false);
    setShowBannerTemplatePicker(false);
    setView("editor");
  };
  const openBannerFromTemplate = (desktop: BannerOnlyDesktopTemplate, mobile: BannerOnlyMobileTemplate) => {
    const desktopCount = desktop === "one-max" ? 1 : 2;
    const mobileCount = mobile === "one-full" ? 1 : 2;
    const bannerCount = Math.max(desktopCount, mobileCount);
    setDraft({
      ...blankPageBanner(),
      sectionKind: "banner",
      cartEnabled: false,
      desktopBannerTemplate: desktop,
      mobileBannerTemplate: mobile,
      bannerItems: Array.from({ length: bannerCount }, (_, index) => ({ id: `banner-slot-${index + 1}`, desktopImageUrl: "", mobileImageUrl: "", targetUrl: "", linkLabel: "ПЕРЕЙТИ" })),
    });
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopSlotFiles({});
    setMobileSlotFiles({});
    setCartEntry("");
    setCartSelected(false);
    setMessage("");
    setShowCreateChoice(false);
    setShowBannerTemplatePicker(false);
    setView("editor");
  };
  const openExisting = (banner: PageBannerDraft) => {
    setDraft({ ...blankPageBanner(), ...banner, sectionKind: banner.sectionKind ?? (banner.cartEnabled ? "banner-cart" : "banner"), cartItems: banner.cartItems ?? [], desktopCartItems: banner.desktopCartItems ?? banner.cartItems ?? [], mobileCartItems: banner.mobileCartItems ?? banner.cartItems ?? [], mobileBannerAlign: banner.mobileBannerAlign === "center" ? "center" : "full" });
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopSlotFiles({});
    setMobileSlotFiles({});
    setCartSelected(false);
    setMessage("");
    setView("editor");
  };
  const updateCartSlot = (key: "desktopCartItems" | "mobileCartItems", index: number, value: string) => {
    const source = [...(draft[key] ?? [])];
    source[index] = value;
    update(key, source);
  };
  const addCartSlot = (key: "desktopCartItems" | "mobileCartItems") =>
    update(key, [...(draft[key] ?? []), ""]);
  const bannerSlotsFor = (mode: "desktop" | "mobile") => {
    if (draft.sectionKind !== "banner") return 1;
    const template = mode === "desktop" ? draft.desktopBannerTemplate : draft.mobileBannerTemplate;
    return template === "one-max" || template === "one-full" ? 1 : 2;
  };
  const bannerSlotAt = (mode: "desktop" | "mobile", index: number) => {
    const item = draft.bannerItems?.[index];
    return item ?? {
      id: `banner-slot-${index + 1}`,
      desktopImageUrl: index === 0 ? draft.desktopImageUrl : "",
      mobileImageUrl: index === 0 ? draft.mobileImageUrl : "",
      targetUrl: index === 0 ? (mode === "desktop" ? draft.desktopLink ?? draft.targetUrl : draft.mobileLink ?? draft.targetUrl) : "",
      linkLabel: index === 0 ? (mode === "desktop" ? draft.desktopLinkLabel ?? draft.linkLabel : draft.mobileLinkLabel ?? draft.linkLabel) : "",
      desktopLink: index === 0 ? draft.desktopLink ?? draft.targetUrl : "",
      mobileLink: index === 0 ? draft.mobileLink ?? draft.targetUrl : "",
      desktopLinkLabel: index === 0 ? draft.desktopLinkLabel ?? draft.linkLabel : "",
      mobileLinkLabel: index === 0 ? draft.mobileLinkLabel ?? draft.linkLabel : "",
      desktopName: index === 0 ? draft.desktopName ?? draft.name : "",
      mobileName: index === 0 ? draft.mobileName ?? draft.name : "",
      desktopShadow: index === 0 ? draft.desktopShadow ?? draft.shadow : true,
      mobileShadow: index === 0 ? draft.mobileShadow ?? draft.shadow : true,
    };
  };
  const updateBannerSlot = (mode: "desktop" | "mobile", index: number, key: "name" | "link" | "linkLabel" | "image" | "shadow", value: string | boolean) => {
    const slots = Array.from({ length: Math.max(bannerSlotsFor(mode), draft.bannerItems?.length ?? 0) }, (_, slotIndex) => ({ ...bannerSlotAt(mode, slotIndex) }));
    const slot = slots[index];
    if (key === "name") slot[mode === "desktop" ? "desktopName" : "mobileName"] = String(value);
    if (key === "link") { slot[mode === "desktop" ? "desktopLink" : "mobileLink"] = String(value); if (mode === "desktop") slot.targetUrl = String(value); }
    if (key === "linkLabel") { slot[mode === "desktop" ? "desktopLinkLabel" : "mobileLinkLabel"] = String(value); if (mode === "desktop") slot.linkLabel = String(value); }
    if (key === "image") slot[mode === "desktop" ? "desktopImageUrl" : "mobileImageUrl"] = String(value);
    if (key === "shadow") slot[mode === "desktop" ? "desktopShadow" : "mobileShadow"] = Boolean(value);
    update("bannerItems", slots);
    if (index === 0) {
      if (mode === "desktop") {
        if (key === "name") update("desktopName", String(value));
        if (key === "link") update("desktopLink", String(value));
        if (key === "linkLabel") update("desktopLinkLabel", String(value));
        if (key === "image") update("desktopImageUrl", String(value));
        if (key === "shadow") update("desktopShadow", Boolean(value));
      } else {
        if (key === "name") update("mobileName", String(value));
        if (key === "link") update("mobileLink", String(value));
        if (key === "linkLabel") update("mobileLinkLabel", String(value));
        if (key === "image") update("mobileImageUrl", String(value));
        if (key === "shadow") update("mobileShadow", Boolean(value));
      }
    }
  };
  const backToTemplateSelection = () => {
    setView("list");
    if (draft.sectionKind === "banner-cart") {
      setDesktopTemplate(draft.desktopTemplate ?? null);
      setMobileTemplate(draft.mobileTemplate ?? null);
      setShowTemplatePicker(true);
      return;
    }
    setDesktopBannerTemplate(draft.desktopBannerTemplate ?? null);
    setMobileBannerTemplate(draft.mobileBannerTemplate ?? null);
    setShowBannerTemplatePicker(true);
  };
  if (view === "list") {
    return (
      <section className="custom-page-index">
        <header className="custom-page-index-head"><div><p className="ui-overline">DEFAULT SECTIONS</p><h2>Sectionlar tartibi</h2><span>Etalon dizayn Gitdagi eski sahifa oqimiga qaytarildi. Sectionlarni drag orqali joyini o‘zgartiring yoki tahrirlang.</span></div></header>
        <div className="custom-section-manager">
          <Card className="custom-section-order-card">
            <CardHeader><CardTitle>Saytdagi tartib</CardTitle><CardDescription>Chapdagi handle bilan faqat mavjud sectionlarni suring.</CardDescription></CardHeader>
            <CardContent>
              <div className="custom-section-order-list">
                <SectionOrderItem locked label="Main banner" />
                <SectionOrderItem locked label="Swipe mahsulotlar" />
                {orderedBanners.map((banner) => <SectionOrderItem key={banner.id} label={banner.name} dragging={draggedSectionId === banner.id} onDragStart={() => setDraggedSectionId(banner.id)} onDragEnd={() => setDraggedSectionId(null)} onDrop={() => { if (draggedSectionId) moveSection(draggedSectionId, banner.id); setDraggedSectionId(null); }} />)}
                <SectionOrderItem locked label="Records" />
                <SectionOrderItem locked label="Blog" />
              </div>
              {!orderedBanners.length && <Empty><FileText /> Tahrirlanadigan section yo‘q.</Empty>}
            </CardContent>
          </Card>
          <Card className="custom-section-registry">
            <CardHeader><CardTitle>Mavjud sectionlar</CardTitle><CardDescription>Yangi section qo‘shilmaydi. Tahrirlash, holatini boshqarish yoki dublikat qilish mumkin.</CardDescription></CardHeader>
            <CardContent>
              {orderedBanners.length ? <div className="custom-section-registry-list">{orderedBanners.map((banner, index) => { const active = banner.isActive !== false; const duplicate = isDuplicateSection(banner); return <article className="custom-section-registry-row custom-section-registry-row--default" key={banner.id}><span className="custom-section-number">{String(index + 1).padStart(2, "0")}</span><div><strong><ScrollingName>{banner.name}</ScrollingName></strong><small>{banner.cartEnabled ? "Banner + Cart · Desktop/Mobil" : "Banner · Desktop/Mobil"}</small></div><span className={active ? "custom-section-status" : "custom-section-status is-paused"}>{active ? "Faol" : "Vaqtincha o‘chirilgan"}</span><Button type="button" size="sm" onClick={() => openExisting(banner)}>Edit</Button><Button type="button" size="sm" variant={active ? "outline" : "default"} disabled={busy} onClick={() => void toggleDefaultSection(banner.id)}>{active ? "Vaqtincha o‘chirish" : "Aktivlashtirish"}</Button><Button type="button" size="sm" disabled={busy} onClick={() => void duplicateDefaultSection(banner)}><Plus size={14} /> Dublikat</Button>{duplicate && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setPendingDuplicateDelete(banner)}>Delete</Button>}</article>; })}</div> : <Empty><FileText /> Default sectionlar hali yuklanmadi.</Empty>}
              <AdminToast message={message} />
            </CardContent>
          </Card>
        </div>
        {pendingDuplicateDelete && <div className="custom-section-create-backdrop" role="presentation" onMouseDown={() => setPendingDuplicateDelete(null)}><section className="custom-section-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-duplicate-title" onMouseDown={(event) => event.stopPropagation()}><p className="ui-overline">DUBLIKATNI O‘CHIRISH</p><h3 id="delete-duplicate-title">Section o‘chirilsinmi?</h3><p>“{pendingDuplicateDelete.name}” faqat dublikat section. Bu amalni ortga qaytarib bo‘lmaydi.</p><div><Button type="button" variant="outline" onClick={() => setPendingDuplicateDelete(null)}>Bekor qilish</Button><Button type="button" disabled={busy} onClick={() => void deleteDuplicate()}>Delete</Button></div></section></div>}
      </section>
    );
  }

  const desktopCartSlots = Math.max(draft.desktopTemplate === "carts-below" ? 4 : 2, draft.desktopCartItems?.length ?? 0);
  const mobileCartSlots = Math.max(draft.mobileTemplate === "swipe-below" ? 4 : 2, draft.mobileCartItems?.length ?? 0);
  if (view === "editor") {
    return <section className="simple-section-editor">
      <header className="simple-section-editor-head"><div><p className="ui-overline">{draft.sectionKind === "banner-cart" ? "BANNER + CART" : "BANNER"}</p><h2>{draft.sectionKind === "banner-cart" ? "Banner + Cart" : "Banner"}</h2><span>Section nomi faqat admin panel uchun.</span></div><div className="simple-section-editor-actions"><Button type="button" variant="outline" disabled={busy} onClick={backToTemplateSelection}>Orqaga</Button><Button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saqlanmoqda..." : "Saqlash"}</Button></div></header>
      <Field label="Section nomi (admin uchun)"><input value={draft.name} onChange={(event) => update("name", event.target.value)} /></Field>
      <div className="simple-section-columns">
        <section><h3>Desktop</h3><div className="simple-section-form">{Array.from({ length: bannerSlotsFor("desktop") }, (_, index) => <ResponsiveBannerSlotForm key={index} title={bannerSlotsFor("desktop") > 1 ? `Banner ${index + 1}` : undefined} slot={bannerSlotAt("desktop", index)} mode="desktop" onChange={(key, value) => updateBannerSlot("desktop", index, key, value)} onFile={(file) => { if (index === 0) setDesktopFile(file); else { const id = bannerSlotAt("desktop", index).id; setDesktopSlotFiles((current) => { const next = { ...current }; if (file) next[id] = file; else delete next[id]; return next; }); } }} />)}{draft.sectionKind === "banner-cart" && <div className="simple-section-carts">{Array.from({ length: desktopCartSlots }, (_, index) => <Field label={`Mahsulot SKU — Cart ${index + 1}`} key={index}><select value={draft.desktopCartItems?.[index] ?? ""} onChange={(event) => updateCartSlot("desktopCartItems", index, event.target.value)}><option value="">Mavjud SKU ni tanlang</option>{skuProducts.flatMap((product) => product.variants.map((variant) => <option key={variant.id} value={variant.sku}>{variant.sku} — {product.title}{variant.color ? ` / ${variant.color}` : ""}{variant.size ? ` / ${variant.size}` : ""}</option>))}</select></Field>)}</div>}</div></section>
        <section><h3>Mobile</h3><div className="simple-section-form">{Array.from({ length: bannerSlotsFor("mobile") }, (_, index) => <ResponsiveBannerSlotForm key={index} title={bannerSlotsFor("mobile") > 1 ? `Banner ${index + 1}` : undefined} slot={bannerSlotAt("mobile", index)} mode="mobile" onChange={(key, value) => updateBannerSlot("mobile", index, key, value)} onFile={(file) => { if (index === 0) setMobileFile(file); else { const id = bannerSlotAt("mobile", index).id; setMobileSlotFiles((current) => { const next = { ...current }; if (file) next[id] = file; else delete next[id]; return next; }); } }} />)}{draft.sectionKind === "banner-cart" && <div className="simple-section-carts">{Array.from({ length: mobileCartSlots }, (_, index) => <Field label={`Mahsulot SKU — Cart ${index + 1}`} key={index}><select value={draft.mobileCartItems?.[index] ?? ""} onChange={(event) => updateCartSlot("mobileCartItems", index, event.target.value)}><option value="">Mavjud SKU ni tanlang</option>{skuProducts.flatMap((product) => product.variants.map((variant) => <option key={variant.id} value={variant.sku}>{variant.sku} — {product.title}{variant.color ? ` / ${variant.color}` : ""}{variant.size ? ` / ${variant.size}` : ""}</option>))}</select></Field>)}</div>}{draft.sectionKind === "banner-cart" && <Button type="button" variant="outline" size="sm" onClick={() => addCartSlot("mobileCartItems")}>+ Cart</Button>}</div></section>
      </div>
      <AdminToast message={message} />
    </section>;
  }

  return (
    <section className="page-banner-editor">
      <aside className="page-banner-inspector">
        <div className="page-banner-editor-head">
          <div><p className="ui-overline">CUSTOM SECTION BUILDER</p><h2>Custom section editor</h2></div>
          <Button type="button" variant="outline" size="sm" onClick={() => setView("list")}>Ro‘yxat</Button>
        </div>
        <p className="page-banner-tab">Banner</p>
        <div className="ui-form">
          <Field label="Section nomi"><input value={draft.name} onChange={(event) => update("name", event.target.value)} /></Field>
          <Field label="Link"><input value={draft.targetUrl} onChange={(event) => update("targetUrl", event.target.value)} placeholder="/shop yoki https://..." /></Field>
          <Field label="Link nomi"><input value={draft.linkLabel} onChange={(event) => update("linkLabel", event.target.value)} /></Field>
          <Field label="Desktop rasm URL"><input value={draft.desktopImageUrl} onChange={(event) => update("desktopImageUrl", event.target.value)} placeholder="https://..." /></Field>
          <Field label="Desktop rasm yuklash"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" onChange={(event) => setDesktopFile(event.target.files?.[0] ?? null)} /></Field>
          <Field label="Mobile rasm URL"><input value={draft.mobileImageUrl} onChange={(event) => update("mobileImageUrl", event.target.value)} placeholder="https://..." /></Field>
          <Field label="Mobile rasm yuklash"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" onChange={(event) => setMobileFile(event.target.files?.[0] ?? null)} /></Field>
          <label className="admin-record-active"><input checked={draft.shadow} type="checkbox" onChange={(event) => update("shadow", event.target.checked)} /> Pastki qora soya</label>
        </div>
      </aside>

      <section className="page-banner-canvas">
        <div className="page-banner-previews">
          <SitePreview mode="desktop" draft={draft} image={desktopImage} cartSelected={cartSelected} onCartSelect={() => setCartSelected(true)} />
          <SitePreview mode="mobile" draft={draft} image={mobileImage} cartSelected={cartSelected} onCartSelect={() => setCartSelected(true)} />
        </div>
        {draft.cartEnabled ? <div className="section-template-summary"><strong>Tayyor shablon tanlandi</strong><span>Desktop: {draft.desktopTemplate === "carts-left" ? "2 cart — chapda" : draft.desktopTemplate === "carts-below" ? "4 cart — pastda" : "2 cart — o‘ngda"}</span><span>Mobile: {draft.mobileTemplate === "swipe-below" ? "4 cart — swipe" : "2 cart"}</span></div> : <><div className="page-banner-editor-launchers"><Button type="button" variant="outline" onClick={() => setEditorMode("desktop")}><Monitor size={15} /> Desktop editor</Button><Button type="button" variant="outline" onClick={() => setEditorMode("mobile")}><Smartphone size={15} /> Mobile editor</Button></div><div className="page-banner-measurements"><Field label="Border, px"><input type="number" min="0" value={draft.borderRadius} onChange={(event) => update("borderRadius", Number(event.target.value))} /></Field><Field label="Desktop default bo‘yi"><input readOnly value={`${desktopDefaultHeight} px — Cartga mos`} /></Field><Field label="Mobile bo‘yi, px"><input type="number" min="140" value={draft.mobileHeight} onChange={(event) => update("mobileHeight", Number(event.target.value))} /></Field></div></>}
        <AdminToast message={message} />
      </section>

      <aside className="page-banner-components">
        <p className="ui-overline">KOMPONENTLAR</p>
        {draft.cartEnabled ? <div className="section-template-cart-lock"><ShoppingBag size={18} /><div><strong>Cart</strong><small>Shablon bilan birga qo‘shilgan. Dizayni o‘zgarmaydi.</small></div></div> : <div className="section-template-cart-lock"><FileText size={18} /><div><strong>Banner</strong><small>Bu sectionda cart komponenti yo‘q.</small></div></div>}
        {draft.cartEnabled && <div className="page-banner-cart-editor">
          <p className="ui-overline">CART SOZLAMALARI</p>
          <Field label="Mahsulot SKU yoki link"><input value={cartEntry} onChange={(event) => setCartEntry(event.target.value)} placeholder="SKU-001 yoki /products/..." onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCartItem(); } }} /></Field>
          <Button type="button" variant="outline" size="sm" onClick={addCartItem}>+ Cart qo‘shish</Button>
          <div className="page-banner-cart-items">{draft.cartItems.length ? draft.cartItems.map((item) => <span key={item}>{item}<button type="button" onClick={() => removeCartItem(item)}>×</button></span>) : <small>SKU yoki link qo‘shing.</small>}</div>
          <small className="page-banner-swipe-note">Cartning joylashuvi va ko‘rinishi tanlangan shablon bilan belgilanadi.</small>
        </div>}
        <p className="ui-overline page-banner-placement-title">JOYLAŞUV</p>
        <div className="page-banner-placement">
          {placements.map(([label, locked], index) => (
            <button type="button" key={label} className={draft.placement === index ? "is-selected" : ""} disabled={locked} onClick={() => update("placement", index)}>
              {locked ? <LockKeyhole size={13} /> : <span className="page-banner-placement-line" />} {label}
            </button>
          ))}
        </div>
        <div className="page-banner-move"><Button type="button" variant="outline" size="sm" disabled={draft.placement === movablePlacements[0]} onClick={() => movePlacement(-1)}><ArrowUp size={14} /> Yuqoriga</Button><Button type="button" variant="outline" size="sm" disabled={draft.placement === movablePlacements[movablePlacements.length - 1]} onClick={() => movePlacement(1)}><ArrowDown size={14} /> Pastga</Button></div>
        <Button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saqlanmoqda..." : "Custom sectionni saqlash"}</Button>
      </aside>
      {editorMode && <ResponsiveEditorModal mode={editorMode} draft={draft} update={update} onClose={() => setEditorMode(null)} />}
    </section>
  );
}
function ResponsiveBannerSlotForm({
  title,
  slot,
  mode,
  onChange,
  onFile,
}: {
  title?: string;
  slot: SectionBannerSlot;
  mode: "desktop" | "mobile";
  onChange: (key: "name" | "link" | "linkLabel" | "image" | "shadow", value: string | boolean) => void;
  onFile: (file: File | null) => void;
}) {
  const name = mode === "desktop" ? slot.desktopName ?? "" : slot.mobileName ?? "";
  const image = mode === "desktop" ? slot.desktopImageUrl : slot.mobileImageUrl;
  const shadow = mode === "desktop" ? slot.desktopShadow ?? true : slot.mobileShadow ?? true;
  const link = mode === "desktop" ? slot.desktopLink ?? slot.targetUrl : slot.mobileLink ?? slot.targetUrl;
  const linkLabel = mode === "desktop" ? slot.desktopLinkLabel ?? slot.linkLabel : slot.mobileLinkLabel ?? slot.linkLabel;
  return <fieldset className="simple-banner-slot"><legend>{title}</legend><Field label="Name"><input value={name} onChange={(event) => onChange("name", event.target.value)} /></Field><Field label="Link"><input value={link} onChange={(event) => onChange("link", event.target.value)} placeholder="/shop yoki https://..." /></Field><Field label="Link Name"><input value={linkLabel} onChange={(event) => onChange("linkLabel", event.target.value)} /></Field><Field label="URL Image"><input value={image} onChange={(event) => onChange("image", event.target.value)} placeholder="https://..." /></Field><Field label="Upload Image"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" onChange={(event) => onFile(event.target.files?.[0] ?? null)} /></Field><label className="simple-section-shadow"><input checked={shadow} type="checkbox" onChange={(event) => onChange("shadow", event.target.checked)} /> Shadow</label></fieldset>;
}
function ScrollingName({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setDistance(Math.max(0, node.scrollWidth - node.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  return (
    <span
      ref={ref}
      className={`section-name-marquee${distance ? " is-overflowing" : ""}`}
      title={children}
      style={{ "--section-name-scroll": `-${distance}px` } as CSSProperties}
    >
      <span>{children}</span>
    </span>
  );
}

function SectionOrderItem({
  label,
  locked = false,
  dragging = false,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  label: string;
  locked?: boolean;
  dragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDrop?: () => void;
}) {
  return (
    <div
      className={`custom-section-order-item${locked ? " is-locked" : ""}${dragging ? " is-dragging" : ""}`}
      draggable={!locked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => { if (!locked) event.preventDefault(); }}
      onDrop={onDrop}
    >
      {locked ? <LockKeyhole size={14} aria-label="Qulflangan" /> : <GripVertical size={17} aria-hidden="true" />}
      <ScrollingName>{label}</ScrollingName>
      {!locked && <small>Surish</small>}
    </div>
  );
}
function CreateSectionChoiceModal({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: (withCart: boolean) => void;
}) {
  return (
    <div className="custom-section-create-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="custom-section-create-modal" role="dialog" aria-modal="true" aria-labelledby="custom-section-create-title" onMouseDown={(event) => event.stopPropagation()}>
        <p className="ui-overline">YANGI CUSTOM SECTION</p>
        <h3 id="custom-section-create-title">Section turini tanlang</h3>
        <p>Keyingi sahifada banner, rasm va qolgan sozlamalarni kiritasiz.</p>
        <div className="custom-section-create-options">
          <button type="button" onClick={() => onChoose(true)}><ShoppingBag size={24} /><strong>Banner + Cart</strong><span>Banner yonida yoki ostida mahsulot kartalari bilan.</span></button>
          <button type="button" onClick={() => onChoose(false)}><FileText size={24} /><strong>Banner</strong><span>Faqat rasm, matn va linkdan iborat section.</span></button>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>Bekor qilish</Button>
      </section>
    </div>
  );
}
function SectionTemplatePickerModal({
  desktopTemplate,
  mobileTemplate,
  onDesktopTemplate,
  onMobileTemplate,
  onClose,
  onContinue,
}: {
  desktopTemplate: DesktopSectionTemplate | null;
  mobileTemplate: MobileSectionTemplate | null;
  onDesktopTemplate: (value: DesktopSectionTemplate) => void;
  onMobileTemplate: (value: MobileSectionTemplate) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const [error, setError] = useState("");
  const continueToEditor = () => {
    if (!desktopTemplate) { setError("Desktop shablonni tanlang."); return; }
    if (!mobileTemplate) { setError("Mobile shablonni tanlang."); return; }
    onContinue();
  };
  return (
    <div className="custom-section-create-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="section-template-modal" role="dialog" aria-modal="true" aria-labelledby="section-template-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="ui-overline">BANNER + CART</p><h3 id="section-template-title">Shablonni tanlang</h3><p>Qizil to‘rtburchak banner matni joylashadigan qismni ko‘rsatadi. Cart dizayni o‘zgarmaydi.</p></div><Button type="button" variant="outline" size="sm" onClick={onClose}>Orqaga</Button></header>
        <section className="section-template-group"><h4>Desktop</h4><div className="section-template-grid section-template-grid--desktop">
          <TemplateChoice active={desktopTemplate === "carts-right"} label="2 cart" layout="desktop-right" onClick={() => { onDesktopTemplate("carts-right"); setError(""); }} />
          <TemplateChoice active={desktopTemplate === "carts-left"} label="2 cart" layout="desktop-left" onClick={() => { onDesktopTemplate("carts-left"); setError(""); }} />
          <TemplateChoice active={desktopTemplate === "carts-below"} label="4 cart" layout="desktop-below" onClick={() => { onDesktopTemplate("carts-below"); setError(""); }} />
        </div></section>
        <section className="section-template-group"><h4>Mobile</h4><div className="section-template-grid section-template-grid--mobile">
          <TemplateChoice active={mobileTemplate === "stack-top"} label="2 cart · max" layout="mobile-top" onClick={() => { onMobileTemplate("stack-top"); setError(""); }} />
          <TemplateChoice active={mobileTemplate === "stack-middle"} label="2 cart · max" layout="mobile-middle" onClick={() => { onMobileTemplate("stack-middle"); setError(""); }} />
          <TemplateChoice active={mobileTemplate === "swipe-below"} label="4 cart (swipe)" layout="mobile-swipe" onClick={() => { onMobileTemplate("swipe-below"); setError(""); }} />
        </div></section>
        <AdminToast message={error} tone="warning" />
        <Button type="button" onClick={continueToEditor}>Tanlash</Button>
      </section>
    </div>
  );
}
function TemplateChoice({
  active,
  label,
  layout,
  onClick,
}: {
  active: boolean;
  label: string;
  layout: string;
  onClick: () => void;
}) {
  const assets: Record<string, string> = {
    "desktop-right": "/images/section-template-73.svg",
    "desktop-left": "/images/section-template-74.svg",
    "desktop-below": "/images/section-template-75.svg",
    "mobile-top": "/images/section-template-76.svg",
    "mobile-middle": "/images/section-template-77.svg",
    "mobile-swipe": "/images/section-template-78.svg",
  };
  return <button type="button" className={`section-template-choice section-template-choice--${layout}${active ? " is-selected" : ""}`} onClick={onClick}><span className="section-template-sketch"><img src={assets[layout]} alt="" /></span><strong>{label}</strong></button>;
}
function BannerOnlyTemplatePickerModal({
  desktopTemplate,
  mobileTemplate,
  onDesktopTemplate,
  onMobileTemplate,
  onClose,
  onContinue,
}: {
  desktopTemplate: BannerOnlyDesktopTemplate | null;
  mobileTemplate: BannerOnlyMobileTemplate | null;
  onDesktopTemplate: (value: BannerOnlyDesktopTemplate) => void;
  onMobileTemplate: (value: BannerOnlyMobileTemplate) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const [error, setError] = useState("");
  const continueToEditor = () => {
    if (!desktopTemplate) { setError("Desktop shablonni tanlang."); return; }
    if (!mobileTemplate) { setError("Mobile shablonni tanlang."); return; }
    onContinue();
  };
  return <div className="custom-section-create-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="banner-only-template-modal" role="dialog" aria-modal="true" aria-labelledby="banner-only-template-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="ui-overline">BANNER</p><h3 id="banner-only-template-title">Banner shablonini tanlang</h3><p>Shablon strukturasi saqlanadi: 1 yoki 2 ta banner, hamda <b>full width</b> yoki <b>max width</b> o‘lchami. SVG previewlar keyingi qadamda shu slotlarga qo‘yiladi.</p></div><Button type="button" variant="outline" size="sm" onClick={onClose}>Orqaga</Button></header>
      <section className="banner-only-template-group"><h4>Desktop</h4><div className="banner-only-template-grid banner-only-template-grid--desktop">
        <BannerOnlyChoice active={desktopTemplate === "two-main-small"} layout="desktop-main-small" label="2 banner · max width" onClick={() => { onDesktopTemplate("two-main-small"); setError(""); }} />
        <BannerOnlyChoice active={desktopTemplate === "two-small-main"} layout="desktop-small-main" label="2 banner · max width" onClick={() => { onDesktopTemplate("two-small-main"); setError(""); }} />
        <BannerOnlyChoice active={desktopTemplate === "two-equal"} layout="desktop-equal" label="2 banner · max width" onClick={() => { onDesktopTemplate("two-equal"); setError(""); }} />
        <BannerOnlyChoice active={desktopTemplate === "one-max"} layout="desktop-one" label="1 banner · max width" onClick={() => { onDesktopTemplate("one-max"); setError(""); }} />
      </div></section>
      <section className="banner-only-template-group"><h4>Mobile</h4><div className="banner-only-template-grid banner-only-template-grid--mobile">
        <BannerOnlyChoice active={mobileTemplate === "one-full-one-max"} layout="mobile-full-max" label="1 full width, 1 max width" onClick={() => { onMobileTemplate("one-full-one-max"); setError(""); }} />
        <BannerOnlyChoice active={mobileTemplate === "one-max-one-full"} layout="mobile-max-full" label="1 max width, 1 full width" onClick={() => { onMobileTemplate("one-max-one-full"); setError(""); }} />
        <BannerOnlyChoice active={mobileTemplate === "two-max"} layout="mobile-two-max" label="2 banner · max width" onClick={() => { onMobileTemplate("two-max"); setError(""); }} />
        <BannerOnlyChoice active={mobileTemplate === "one-full"} layout="mobile-one-full" label="1 banner · full width" onClick={() => { onMobileTemplate("one-full"); setError(""); }} />
      </div></section>
      <AdminToast message={error} tone="warning" />
      <Button type="button" onClick={continueToEditor}>Tanlash</Button>
    </section>
  </div>;
}
function BannerOnlyChoice({ active, layout, label, onClick }: { active: boolean; layout: string; label: string; onClick: () => void }) {
  const assets: Record<string, string> = {
    "desktop-main-small": "/images/section-template-66.svg",
    "desktop-small-main": "/images/section-template-67.svg",
    "desktop-equal": "/images/section-template-85.svg",
    "desktop-one": "/images/section-template-86.svg",
    "mobile-full-max": "/images/section-template-82.svg",
    "mobile-max-full": "/images/section-template-87.svg",
    "mobile-two-max": "/images/section-template-80.svg",
    "mobile-one-full": "/images/section-template-79.svg",
  };
  return <button type="button" className={`banner-only-template-choice banner-only-template-choice--${layout}${active ? " is-selected" : ""}`} onClick={onClick}><span className="banner-only-template-sketch"><img src={assets[layout]} alt="" /></span><strong>{label}</strong></button>;
}
function ResponsiveEditorModal({
  mode,
  draft,
  update,
  onClose,
}: {
  mode: "desktop" | "mobile";
  draft: PageBannerDraft;
  update: <K extends keyof PageBannerDraft>(key: K, value: PageBannerDraft[K]) => void;
  onClose: () => void;
}) {
  const textPositions: Array<[BannerTextPosition, string]> = [
    ["top-left", "Tepa chap"], ["top-center", "Tepa o‘rta"], ["top-right", "Tepa o‘ng"],
    ["center-left", "O‘rta chap"], ["center", "Markaz"], ["center-right", "O‘rta o‘ng"],
    ["bottom-left", "Past chap"], ["bottom-center", "Past o‘rta"], ["bottom-right", "Past o‘ng"],
  ];
  const textPosition = mode === "desktop" ? draft.desktopTextPosition : draft.mobileTextPosition;
  const bannerAlign = mode === "desktop" ? draft.desktopBannerAlign : draft.mobileBannerAlign;
  const cartPosition = mode === "desktop" ? draft.desktopCartPosition : draft.mobileCartPosition;
  const updateTextPosition = (value: BannerTextPosition) => update(mode === "desktop" ? "desktopTextPosition" : "mobileTextPosition", value);
  const updateBannerAlign = (value: "left" | "center" | "right" | "full") => {
    if (mode === "desktop") update("desktopBannerAlign", value === "full" ? "center" : value as PageBannerDraft["desktopBannerAlign"]);
    else update("mobileBannerAlign", value === "center" ? "center" : "full");
  };
  const updateCartPosition = (value: "left" | "right" | "below") => update(mode === "desktop" ? "desktopCartPosition" : "mobileCartPosition", value);
  return (
    <div className="page-banner-editor-modal-backdrop" role="presentation">
      <section className="page-banner-editor-modal" role="dialog" aria-modal="true" aria-labelledby="responsive-editor-title">
        <header><div><p className="ui-overline">CUSTOM SECTION</p><h3 id="responsive-editor-title">{mode === "desktop" ? "Desktop" : "Mobile"} editor</h3></div><Button type="button" variant="outline" size="sm" onClick={onClose}>Orqaga</Button></header>
        <div className="responsive-editor-section"><h4>Text position</h4><div className="responsive-position-grid">{textPositions.map(([value, label]) => <button type="button" className={textPosition === value ? "is-selected" : ""} key={value} onClick={() => updateTextPosition(value)}>{label}</button>)}</div></div>
        <div className="responsive-editor-section"><h4>Banner joylashuvi</h4><div className="responsive-three-options">{(mode === "mobile" ? (["full", "center"] as const) : (["left", "center", "right"] as const)).map((value) => <button type="button" className={bannerAlign === value ? "is-selected" : ""} key={value} onClick={() => updateBannerAlign(value)}>{value === "full" ? "Full" : value === "left" ? "Chap" : value === "right" ? "O‘ng" : "O‘rta"}</button>)}</div></div>
        <div className="responsive-editor-section"><h4>Cart joylashuvi</h4>{draft.cartEnabled ? <><div className="responsive-three-options">{(["left", "right", "below"] as const).map((value) => <button type="button" className={cartPosition === value ? "is-selected" : ""} key={value} onClick={() => updateCartPosition(value)}>{value === "left" ? "Banner chapida" : value === "right" ? "Banner o‘ngida" : "Banner pastida"}</button>)}</div><div className="responsive-cart-options"><Button type="button" variant={draft.cartLayout === "vertical" ? "default" : "outline"} size="sm" onClick={() => update("cartLayout", "vertical")}>Vertical cart</Button><Button type="button" variant={draft.cartLayout === "horizontal" ? "default" : "outline"} size="sm" onClick={() => update("cartLayout", "horizontal")}>Horizontal cart</Button><label className="admin-record-active"><input checked={draft.cartSwipe} type="checkbox" onChange={(event) => update("cartSwipe", event.target.checked)} /> Cart swipe ({draft.cartItems.length}/6 min.)</label></div></> : <p>Avval Cart komponentini qo‘shing.</p>}</div>
        <div className="responsive-editor-section"><h4>{mode === "desktop" ? "Desktop o‘lchami" : "Mobile o‘lchami"}</h4>{mode === "desktop" ? <p>Desktop balandligi Cart joylashuviga qarab avtomatik belgilanadi.</p> : <Field label="Banner bo‘yi, px"><input type="number" min="140" value={draft.mobileHeight} onChange={(event) => update("mobileHeight", Number(event.target.value))} /></Field>}</div>
      </section>
    </div>
  );
}
function SitePreview({
  mode,
  draft,
  image,
  cartSelected,
  onCartSelect,
}: {
  mode: "desktop" | "mobile";
  draft: PageBannerDraft;
  image: string;
  cartSelected: boolean;
  onCartSelect: () => void;
}) {
  const isMobile = mode === "mobile";
  const textPosition = isMobile ? draft.mobileTextPosition : draft.desktopTextPosition;
  const bannerAlign = isMobile ? (draft.mobileBannerAlign === "center" ? "center" : "full") : draft.desktopBannerAlign;
  const cartPosition = isMobile ? draft.mobileCartPosition : draft.desktopCartPosition;
  const previewHeight = isMobile ? draft.mobileHeight : draft.cartEnabled ? (cartPosition === "below" ? 360 : 420) : 460;
  const previewStyle = {
    height: previewHeight,
    borderRadius: draft.borderRadius,
    backgroundImage: image ? `url(${image})` : undefined,
  };
  const cart = draft.cartEnabled ? (
    <MockCart
      items={draft.cartItems}
      swipe={draft.cartSwipe}
      layout={draft.cartLayout}
      selected={cartSelected}
      onSelect={onCartSelect}
    />
  ) : null;
  return (
    <div className={`page-banner-device page-banner-device--${mode}`}>
      <div className="page-banner-site-size"><b>{isMobile ? "390 × 844" : "1440 × 900"}</b><span>{isMobile ? "Mobile site preview" : "Desktop site preview"}</span></div>
      <div className={`page-banner-site-content cart-position--${cartPosition} banner-align--${bannerAlign}`}>
        {cartPosition === "left" && cart}
        <div className={`page-banner-preview text-position--${textPosition}`} style={previewStyle}>
          {draft.shadow && <span className="page-banner-preview-shade" />}
          <div className="page-banner-preview-copy"><b>{draft.name}</b><small>{draft.linkLabel}</small></div>
        </div>
        {cartPosition === "right" && cart}
        {cartPosition === "below" && cart}
      </div>
      <p><>{isMobile ? <Smartphone size={15} /> : <Monitor size={15} />}</> {isMobile ? "Mobile" : "Desktop"}</p>
    </div>
  );
}
function MockCart({
  items,
  swipe,
  layout,
  selected,
  onSelect,
}: {
  items: string[];
  swipe: boolean;
  layout: "horizontal" | "vertical";
  selected: boolean;
  onSelect: () => void;
}) {
  const list = items.length ? items : ["SKU yoki link"];
  const shown = swipe ? list.slice(0, 6) : list.slice(0, 1);
  return (
    <button type="button" className={`page-banner-cart-preview${selected ? " is-selected" : ""}${swipe ? " is-swipe" : ""}${layout === "vertical" ? " is-vertical" : ""}`} onClick={onSelect}>
      {shown.map((item, index) => <span key={`${item}-${index}`}><i /><b>{item}</b><small>930.000 СУМ</small></span>)}
      {swipe && <em>↔ swipe</em>}
    </button>
  );
}
function NotificationManager({ items, token, onChanged }: { items: StoreNotification[]; token: string; onChanged: (items: StoreNotification[]) => void }) {
  const blank = () => ({ kind: "general" as const, title: { ru: "", uz: "", en: "" }, text: { ru: "", uz: "", en: "" }, imageUrl: "", href: "", isActive: true });
  const [draft, setDraft] = useState(blank());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "create">("list");
  const saveItems = async (next: StoreNotification[]) => {
    setSaving(true);
    try { await api("/admin/content/settings/site-notifications", token, { method: "PUT", body: JSON.stringify({ value: { items: next } }) }); onChanged(next); } finally { setSaving(false); }
  };
  const uploadImage = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return api<{ url: string }>("/admin/content/banners/upload", token, { method: "POST", body: data });
  };
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.ru.trim() || !draft.text.ru.trim()) return;
    setSaving(true);
    try {
      const uploaded = imageFile ? await uploadImage(imageFile) : null;
      const item: StoreNotification = { id: crypto.randomUUID(), kind: draft.kind, title: draft.title, text: draft.text, imageUrl: uploaded?.url || draft.imageUrl.trim(), href: draft.href.trim() || "/", createdAt: new Date().toISOString(), isActive: draft.isActive, clicks: 0, clickVisitorIds: [] };
      await api("/admin/content/settings/site-notifications", token, { method: "PUT", body: JSON.stringify({ value: { items: [item, ...items] } }) });
      onChanged([item, ...items]); setDraft(blank()); setImageFile(null); setView("list");
    } finally { setSaving(false); }
  };
  if (view === "create") return <section className="notification-manager tailadmin-module-page"><button type="button" className="admin-back-button" onClick={() => setView("list")}>← Xabarlarga qaytish</button><div className="admin-product-index-head"><div><p className="ui-overline">YANGI XABAR</p><h2>Xabar yaratish</h2><span>Tanlangan turdagi xabar faqat shu xabarni yoqqan foydalanuvchilarga chiqadi.</span></div></div><Card><CardContent><form className="ui-form" onSubmit={(event) => void create(event)}><div className="ui-form-grid"><Field label="Xabar turi"><select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as typeof draft.kind })}><option value="general">Asosiy xabar</option><option value="products">Yangi mahsulotlar</option><option value="blog">Blog yangiliklari</option><option value="discounts">Chegirmalar</option></select></Field></div><div className="ui-form-grid--three ui-form-grid"><Field label="Asosiy sarlavha — Ruscha"><input value={draft.title.ru} onChange={(event) => setDraft({ ...draft, title: { ...draft.title, ru: event.target.value } })} required /></Field><Field label="Sarlavha — O‘zbekcha"><input value={draft.title.uz} onChange={(event) => setDraft({ ...draft, title: { ...draft.title, uz: event.target.value } })} /></Field><Field label="Sarlavha — Inglizcha"><input value={draft.title.en} onChange={(event) => setDraft({ ...draft, title: { ...draft.title, en: event.target.value } })} /></Field></div><div className="ui-form-grid--three ui-form-grid"><Field label="Matn — Ruscha"><textarea value={draft.text.ru} onChange={(event) => setDraft({ ...draft, text: { ...draft.text, ru: event.target.value } })} required /></Field><Field label="Matn — O‘zbekcha"><textarea value={draft.text.uz} onChange={(event) => setDraft({ ...draft, text: { ...draft.text, uz: event.target.value } })} /></Field><Field label="Matn — Inglizcha"><textarea value={draft.text.en} onChange={(event) => setDraft({ ...draft, text: { ...draft.text, en: event.target.value } })} /></Field></div><div className="ui-form-grid--three ui-form-grid"><Field label="Rasm uchun ssilka"><input type="url" value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="https://... yoki /uploads/..." /></Field><Field label="Rasm yuklash (JPG, PNG, WEBP)"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /><small>{imageFile ? imageFile.name : "Fayl tanlanmagan"}</small></Field><Field label="Sahifa havolasi"><input value={draft.href} onChange={(event) => setDraft({ ...draft, href: event.target.value })} placeholder="/shop yoki https://..." /></Field></div><label className="notification-active"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> Saytda ko‘rsatish</label><div className="product-editor-actions-top"><Button disabled={saving}>{saving ? "Saqlanmoqda…" : "Xabar yaratish"}</Button></div></form></CardContent></Card></section>;
  return <section className="notification-manager"><div className="admin-product-index-head"><div><p className="ui-overline">XABARLAR</p><h2>Sayt xabarlari</h2><span>Haqiqiy havola bosilishlari har bir foydalanuvchi uchun bir marta hisoblanadi.</span></div><Button onClick={() => setView("create")}><Plus size={16} /> Yangi xabar</Button></div><div className="notification-admin-list">{items.map((item) => <article key={item.id}><img src={item.imageUrl || "/images/p1.jpg"} alt="" /><div><b>{item.title.ru || item.title.uz || item.title.en}</b><p>{item.text.ru || item.text.uz || item.text.en}</p><small>{item.href || "/"} · {new Date(item.createdAt).toLocaleString("ru-RU")} · <strong>{item.clicks ?? 0} ta havola bosilishi</strong></small></div><Button type="button" variant="outline" onClick={() => void saveItems(items.filter((current) => current.id !== item.id))}>Olib tashlash</Button></article>)}{!items.length && <Empty>Hali xabar yaratilmagan.</Empty>}</div></section>;
}

function BannerManager({
  banners,
  token,
  onChanged,
}: {
  banners: Banner[];
  token: string;
  onChanged: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [linkLabel, setLinkLabel] = useState("Перейти");
  const [targetUrl, setTargetUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mobileImageUrl, setMobileImageUrl] = useState("");
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [position, setPosition] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [textShadow, setTextShadow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
  const uploadImage = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return api<{ url: string }>("/admin/content/banners/upload", token, {
      method: "POST",
      body: data,
    });
  };
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!imageUrl && !desktopFile) {
      setMessage("Desktop banner rasmini yuklang yoki URL kiriting.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const desktop = desktopFile ? await uploadImage(desktopFile) : { url: imageUrl.trim() };
      const mobile = mobileFile
        ? await uploadImage(mobileFile)
        : { url: mobileImageUrl.trim() || null };
      await api<Banner>("/admin/content/banners", token, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || "Yangi kolleksiya",
          linkLabel: linkLabel.trim() || "Перейти",
          targetUrl: targetUrl.trim() || null,
          imageUrl: desktop.url,
          mobileImageUrl: mobile.url,
          position: Number(position) || 0,
          isActive,
          textShadow,
        }),
      });
      setTitle("");
      setLinkLabel("Перейти");
      setTargetUrl("");
      setImageUrl("");
      setMobileImageUrl("");
      setDesktopFile(null);
      setMobileFile(null);
      setPosition("0");
      setIsActive(true);
      setTextShadow(true);
      await onChanged();
      setMessage("Main banner saqlandi. U bosh sahifada ko‘rinadi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Banner saqlanmadi.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    setBusy(true);
    setMessage("");
    try {
      await api(`/admin/content/banners/${id}`, token, { method: "DELETE" });
      await onChanged();
      setMessage("Banner o‘chirildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Banner o‘chirilmadi.");
    } finally {
      setBusy(false);
    }
  };
  const toggleActive = async (banner: Banner) => {
    setBusy(true);
    setMessage("");
    try {
      await api(`/admin/content/banners/${banner.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      await onChanged();
      setMessage(`Banner ${banner.isActive ? "archive qilindi" : "active qilindi"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Banner holati saqlanmadi.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="admin-banner-layout">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Main banner qo‘shish</CardTitle>
            <CardDescription>
              Desktop va mobile rasmlarini alohida yuklang. Eng kichik position raqamli aktiv banner bosh sahifada chiqadi.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="ui-form" onSubmit={create}>
            <div className="ui-form-grid">
              <Field label="Banner nomi">
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="НОВАЯ КОЛЛЕКЦИЯ" />
              </Field>
              <Field label="Link nomi">
                <input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="ПЕРЕЙТИ" />
              </Field>
              <Field label="O‘tish linki">
                <input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder="/collections yoki https://..." />
              </Field>
              <Field label="Tartib raqami">
                <input type="number" value={position} onChange={(event) => setPosition(event.target.value)} />
              </Field>
            </div>
            <div className="ui-form-grid">
              <Field label="Desktop rasm URL (ixtiyoriy)">
                <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Desktop rasm yuklash (max. 10 MB)">
                <input accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" type="file" onChange={(event) => setDesktopFile(event.target.files?.[0] ?? null)} />
              </Field>
              <Field label="Mobile rasm URL (ixtiyoriy)">
                <input value={mobileImageUrl} onChange={(event) => setMobileImageUrl(event.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Mobile rasm yuklash (ixtiyoriy)">
                <input accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" type="file" onChange={(event) => setMobileFile(event.target.files?.[0] ?? null)} />
              </Field>
            </div>
            <label className="admin-record-active">
              <input checked={isActive} type="checkbox" onChange={(event) => setIsActive(event.target.checked)} />
              Saytda ko‘rsatish
            </label>
            <label className="admin-record-active">
              <input checked={textShadow} type="checkbox" onChange={(event) => setTextShadow(event.target.checked)} />
              Pastki qora soya (matn o‘qilishi uchun)
            </label>
            <Button disabled={busy}><Upload size={15} /> {busy ? "Saqlanmoqda..." : "Main bannerni saqlash"}</Button>
          </form>
          <AdminToast message={message} />
        </CardContent>
      </Card>
      <Card className="admin-list-card">
        <CardHeader>
          <CardTitle>Saqlangan main bannerlar</CardTitle>
          <Badge variant="neutral">{banners.length} ta</Badge>
        </CardHeader>
        <CardContent>
          {banners.length ? (
            <div className="admin-banner-list">
              {banners.map((banner) => (
                <article key={banner.id}>
                  <img src={recordAssetUrl(banner.imageUrl)} alt="" />
                  <div>
                    <strong>{banner.title}</strong>
                    <span>{banner.linkLabel} · {banner.targetUrl || "link yo‘q"}</span>
                  </div>
                  <div>
                    <Badge variant={banner.isActive ? "success" : "warning"}>{banner.isActive ? "active" : "hidden"}</Badge>
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void toggleActive(banner)}>{banner.isActive ? "Archive" : "Active qilish"}</Button>
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setBannerToDelete(banner)}>O‘chirish</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty><FileText /> Hali main banner yo‘q.</Empty>
          )}
        </CardContent>
      </Card>
      {bannerToDelete && (
        <div className="admin-confirm-backdrop" role="presentation">
          <section className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-banner-title">
            <p className="ui-overline">BANNERNI O‘CHIRISH</p>
            <h3 id="delete-banner-title">“{bannerToDelete.title}” o‘chirilsinmi?</h3>
            <p>Bu amalni qaytarib bo‘lmaydi. Banner bosh sahifa ro‘yxatidan butunlay o‘chadi.</p>
            <div>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setBannerToDelete(null)}>Bekor qilish</Button>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => void remove(bannerToDelete.id).then(() => setBannerToDelete(null))}>{busy ? "O‘chirilmoqda..." : "Ha, o‘chirish"}</Button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
function RecordsManager({
  records,
  token,
  onChanged,
}: {
  records: MusicRecord[];
  token: string;
  onChanged: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [position, setPosition] = useState("0");
  const [file, setFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file && !isSpotifyUrl(spotifyUrl)) {
      setMessage("MP3 fayl yuklang yoki Spotify track/playlist/album URL kiriting.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const uploaded = file ? await (async () => {
        const data = new FormData();
        data.append("file", file);
        return api<{ url: string }>("/admin/content/records/upload", token, { method: "POST", body: data });
      })() : { url: spotifyUrl.trim() };
      await api<MusicRecord>("/admin/content/records", token, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || file?.name.replace(/\.[^.]+$/, "") || "Spotify trek",
          artist: artist.trim(),
          genre: genre.trim(),
          audioUrl: uploaded.url,
          coverImageUrl: coverImageUrl.trim() || null,
          position: Number(position) || 0,
          isActive,
        }),
      });
      setTitle("");
      setArtist("");
      setGenre("");
      setCoverImageUrl("");
      setSpotifyUrl("");
      setPosition("0");
      setFile(null);
      setIsActive(true);
      await onChanged();
      setMessage(file ? "Trek yuklandi va Records ro‘yxatiga qo‘shildi." : "Spotify trek Records ro‘yxatiga qo‘shildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Audio yuklanmadi.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Bu trek o‘chirilsinmi?")) return;
    setBusy(true);
    setMessage("");
    try {
      await api(`/admin/content/records/${id}`, token, { method: "DELETE" });
      await onChanged();
      setMessage("Trek o‘chirildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Trek o‘chirilmadi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-records-layout">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Records — musiqa yuklash</CardTitle>
            <CardDescription>
              Audio faylni yuklang yoki Spotify track, playlist yoxud album URL kiriting.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="ui-form" onSubmit={upload}>
            <div className="ui-form-grid">
              <Field label="Trek nomi">
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Masalan, SIREN Radio 001" />
              </Field>
              <Field label="Ijrochi / artist">
                <input value={artist} onChange={(event) => setArtist(event.target.value)} placeholder="SIREN" />
              </Field>
              <Field label="Janr">
                <input value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Masalan, Hip-hop" />
              </Field>
              <Field label="Cover rasm URL (ixtiyoriy)">
                <input value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Tartib raqami">
                <input type="number" value={position} onChange={(event) => setPosition(event.target.value)} />
              </Field>
            </div>
            <Field label="Spotify URL (ixtiyoriy)">
              <input value={spotifyUrl} onChange={(event) => setSpotifyUrl(event.target.value)} placeholder="https://open.spotify.com/track/..." />
            </Field>
            <Field label="Audio fayl (max. 25 MB)">
              <input accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/aac,.mp3,.m4a,.wav,.ogg,.aac" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </Field>
            <label className="admin-record-active">
              <input checked={isActive} type="checkbox" onChange={(event) => setIsActive(event.target.checked)} />
              Saytda ko‘rsatish
            </label>
            <Button disabled={busy}>
              <Upload size={15} /> {busy ? "Yuklanmoqda..." : file ? "Audio yuklash" : "Spotify trek qo‘shish"}
            </Button>
          </form>
          <AdminToast message={message} />
        </CardContent>
      </Card>
      <Card className="admin-list-card">
        <CardHeader>
          <CardTitle>Yuklangan treklar</CardTitle>
          <Badge variant="neutral">{records.length} ta</Badge>
        </CardHeader>
        <CardContent>
          {records.length ? (
            <div className="admin-record-list">
              {records.map((record) => (
                <article key={record.id}>
                  <div className="admin-record-icon"><Music2 size={18} /></div>
                  <div>
                    <strong>{record.title}</strong>
                    <span>{record.artist || "Artist ko‘rsatilmagan"}{record.genre ? ` · ${record.genre}` : ""}</span>
                    {isSpotifyUrl(record.audioUrl) ? <a className="admin-spotify-link" href={record.audioUrl} target="_blank" rel="noreferrer">Spotify’da ochish</a> : <audio controls preload="none" src={recordAssetUrl(record.audioUrl)} />}
                  </div>
                  <div className="admin-record-actions">
                    <Badge variant={record.isActive ? "success" : "warning"}>{record.isActive ? "active" : "hidden"}</Badge>
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void remove(record.id)}>O‘chirish</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty><Music2 /> Hali trek yuklanmagan.</Empty>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { cartSubtotal } from "@/lib/commerce";
import { trackProductEngagement } from "@/lib/product-engagement";
import { useOverlayHistory } from "./OverlayHistoryProvider";
import { customerApi, useCustomerAuth } from "./CustomerAuthProvider";

export type CartItem = {
  id: string;
  productId?: string;
  title: string;
  price: string;
  originalPrice?: string;
  discountPercent?: number;
  personalDiscount?: boolean;
  image: string;
  color: string;
  size: string;
  isSale?: boolean;
  /** Online ombordagi shu SKU/rang/razmer uchun oxirgi ma'lum qoldiq. */
  inventoryQuantity?: number;
  quantity: number;
};

type AddToCartItem = Omit<CartItem, "quantity">;

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: AddToCartItem) => void;
  removeFromCart: (id: string, color?: string, size?: string) => void;
  increaseQuantity: (id: string, color?: string, size?: string) => void;
  decreaseQuantity: (id: string, color?: string, size?: string) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  dismissCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const { customer, loading: customerLoading } = useCustomerAuth();
  const { isOverlayOpen, openOverlay, closeOverlay, dismissOverlay } = useOverlayHistory();
  const isCartOpen = isOverlayOpen("cart");
  const storageKey = customer ? `siren-cart:customer:${customer.id}` : "siren-cart:guest";
  const loaded = loadedKey === storageKey;
  const priorStorageKey = useRef<string | null>(null);

  // A cart must never be shared between different customer accounts. Guest
  // carts intentionally live only for the current browser session, so an old
  // anonymous basket cannot appear for a new visitor on this device.
  useEffect(() => {
    if (customerLoading) return;
    const storage = customer ? window.localStorage : window.sessionStorage;
    const savedCart = storage.getItem(storageKey);
    let nextCart: CartItem[] = [];
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          nextCart = parsedCart;
        }
      } catch {
        storage.removeItem(storageKey);
      }
    }
    // The former unscoped key could show one visitor's cart to another. It is
    // deliberately discarded rather than migrated.
    if (!priorStorageKey.current) window.localStorage.removeItem("siren-cart");
    priorStorageKey.current = storageKey;
    setCart(nextCart);
    setLoadedKey(storageKey);
  }, [customer?.id, customerLoading, storageKey]);

  // Save only after the matching account/guest basket has been loaded.
  useEffect(() => {
    if (!loaded) return;
    const storage = customer ? window.localStorage : window.sessionStorage;
    storage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, customer?.id, loaded, storageKey]);

  // Keep authenticated customers' intent visible in the admin profile. Local
  // storage remains the fast fallback for anonymous browsing.
  useEffect(() => {
    if (!loaded || !customer) return;
    const token = localStorage.getItem("siren-customer-token");
    if (!token) return;
    const timeout = window.setTimeout(() => { void customerApi("/checkout/customer/commerce-state", { cart: cart.map((item) => ({ variantId: item.id, quantity: item.quantity })) }, token, "PATCH").catch(() => undefined); }, 350);
    return () => window.clearTimeout(timeout);
  }, [cart, customer?.id, loaded]);

  // Carts saved before sale details were added only contain the final price.
  // Restore the original price from the customer's active personal discount so
  // the drawer can render the old price and the summary discount immediately.
  useEffect(() => {
    if (!loaded || !customer) return;
    const token = localStorage.getItem("siren-customer-token");
    if (!token) return;
    void customerApi("/checkout/customer/commerce-state", undefined, token)
      .then((state: { discounts?: Array<{ productId: string; percent: number }> }) => {
        const discounts = new Map((state.discounts ?? []).map((item) => [item.productId, Number(item.percent)]));
        setCart((current) => current.map((item) => {
          const percent = discounts.get(item.productId ?? "") ?? 0;
          if (!(percent > 0 && percent < 100)) return item;
          if (item.originalPrice) return { ...item, personalDiscount: true };
          const finalPrice = Number(item.price);
          const originalPrice = Number.isFinite(finalPrice) && finalPrice > 0 ? Math.round(finalPrice * 100 / (100 - percent)) : 0;
          return originalPrice > 0 ? { ...item, originalPrice: String(originalPrice), discountPercent: percent, personalDiscount: true, isSale: true } : item;
        }));
      })
      .catch(() => undefined);
  }, [loaded, customer?.id]);

  // A persisted cart may outlive an inventory change. Refresh each variant's
  // online quantity from the storefront catalogue and clamp stale quantities.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    void fetch(`${api}/catalog/products`).then((response) => response.ok ? response.json() : []).then((products: Array<{ variants?: Array<{ id: string; inventoryQuantity: number; isActive?: boolean; originalPrice?: string; discountPercent?: number }> }>) => {
      if (cancelled || !Array.isArray(products)) return;
      const variants = new Map(products.flatMap((product) => (product.variants ?? []).map((variant) => [variant.id, { inventoryQuantity: variant.isActive === false ? 0 : Math.max(0, Number(variant.inventoryQuantity) || 0), originalPrice: variant.originalPrice, discountPercent: variant.discountPercent }] as const)));
      setCart((current) => current.flatMap((item) => {
        const variant = variants.get(item.id);
        if (!variant) return [item];
        const quantity = Math.min(item.quantity, variant.inventoryQuantity);
        return quantity > 0 ? [{ ...item, inventoryQuantity: variant.inventoryQuantity, quantity, originalPrice: item.originalPrice ?? variant.originalPrice, discountPercent: item.discountPercent ?? variant.discountPercent, isSale: item.isSale || Boolean(variant.discountPercent) }] : [];
      }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [loaded]);

  const addToCart = (item: AddToCartItem) => {
    trackProductEngagement(item.productId, "cart");
    setCart((prev) => {
      // Bir xil product + rang + razmer bo'lsa,
      // faqat quantity oshadi.
      const existing = prev.find(
        (p) =>
          p.id === item.id &&
          p.color === item.color &&
          p.size === item.size
      );

      if (existing) {
        const limit = Math.max(0, Number(item.inventoryQuantity ?? existing.inventoryQuantity ?? Infinity));
        if (existing.quantity >= limit) return prev;
        return prev.map((p) =>
          p.id === item.id &&
          p.color === item.color &&
          p.size === item.size
            ? {
                ...p,
                quantity: p.quantity + 1,
                isSale: p.isSale || item.isSale,
              }
            : p
        );
      }

      // Boshqa rang yoki razmer bo'lsa,
      // Cart'da alohida item bo'ladi.
      if (Number(item.inventoryQuantity ?? Infinity) < 1) return prev;
      return [
        ...prev,
        {
          ...item,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (id: string, color?: string, size?: string) => {
    setCart((prev) =>
      prev.filter((item) => item.id !== id || (color !== undefined && (item.color !== color || item.size !== size)))
    );
  };

  const increaseQuantity = (id: string, color?: string, size?: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id && (color === undefined || (item.color === color && item.size === size))
          ? {
              ...item,
              quantity: Math.min(item.quantity + 1, Math.max(0, Number(item.inventoryQuantity ?? Infinity))),
            }
          : item
      )
    );
  };

  const decreaseQuantity = (id: string, color?: string, size?: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id && (color === undefined || (item.color === color && item.size === size))
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setCart([]);

  const cartCount = loaded ? cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  ) : 0;
  const subtotal = loaded ? cartSubtotal(cart) : 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        cartCount,
        subtotal,
        isCartOpen,
        openCart: () => openOverlay("cart"),
        closeCart: () => closeOverlay("cart"),
        dismissCart: () => dismissOverlay("cart"),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used within CartProvider"
    );
  }

  return context;
}

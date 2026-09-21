"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { cartSubtotal } from "@/lib/commerce";
import { trackProductEngagement } from "@/lib/product-engagement";
import { useOverlayHistory } from "./OverlayHistoryProvider";

export type CartItem = {
  id: string;
  productId?: string;
  title: string;
  price: string;
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
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { isOverlayOpen, openOverlay, closeOverlay } = useOverlayHistory();
  const isCartOpen = isOverlayOpen("cart");

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("siren-cart");

    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      } catch {
        localStorage.removeItem("siren-cart");
      }
    }

    setLoaded(true);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      "siren-cart",
      JSON.stringify(cart)
    );
  }, [cart, loaded]);

  // A persisted cart may outlive an inventory change. Refresh each variant's
  // online quantity from the storefront catalogue and clamp stale quantities.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    void fetch(`${api}/catalog/products`).then((response) => response.ok ? response.json() : []).then((products: Array<{ variants?: Array<{ id: string; inventoryQuantity: number; isActive?: boolean }> }>) => {
      if (cancelled || !Array.isArray(products)) return;
      const quantities = new Map(products.flatMap((product) => (product.variants ?? []).map((variant) => [variant.id, variant.isActive === false ? 0 : Math.max(0, Number(variant.inventoryQuantity) || 0)] as const)));
      setCart((current) => current.flatMap((item) => {
        const inventoryQuantity = quantities.get(item.id);
        if (inventoryQuantity === undefined) return [item];
        const quantity = Math.min(item.quantity, inventoryQuantity);
        return quantity > 0 ? [{ ...item, inventoryQuantity, quantity }] : [];
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

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const subtotal = cartSubtotal(cart);

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

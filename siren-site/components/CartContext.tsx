"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type CartItem = {
  id: string;
  title: string;
  price: string;
  image: string;
  color: string;
  size: string;
  quantity: number;
};

type AddToCartItem = Omit<CartItem, "quantity">;

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: AddToCartItem) => void;
  removeFromCart: (id: string) => void;
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  clearCart: () => void;
  cartCount: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

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

  const addToCart = (item: AddToCartItem) => {
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
        return prev.map((p) =>
          p.id === item.id &&
          p.color === item.color &&
          p.size === item.size
            ? {
                ...p,
                quantity: p.quantity + 1,
              }
            : p
        );
      }

      // Boshqa rang yoki razmer bo'lsa,
      // Cart'da alohida item bo'ladi.
      return [
        ...prev,
        {
          ...item,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const increaseQuantity = (id: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  const decreaseQuantity = (id: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
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

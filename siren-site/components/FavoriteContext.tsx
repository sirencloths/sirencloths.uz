"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/lib/data";
import { getStorefrontProducts, toStorefrontProduct } from "@/lib/api";

type FavoriteContextValue = {
  favorites: Product[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (product: Product) => void;
  removeFavorite: (id: string) => void;
};

const FavoriteContext = createContext<FavoriteContextValue | null>(null);

export function FavoriteProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("siren-favorites");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setFavorites(parsed);
      } catch {
        localStorage.removeItem("siren-favorites");
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("siren-favorites", JSON.stringify(favorites));
  }, [favorites, loaded]);

  // Favorites only retain the product id locally.  Refresh its title, image
  // and variant-derived price from the storefront so edited admin data is
  // never replaced by an outdated browser snapshot.
  useEffect(() => {
    if (!loaded || !favorites.length) return;
    let active = true;
    void getStorefrontProducts()
      .then((items) => {
        if (!active) return;
        const latest = new Map(items.map((item) => {
          const product = toStorefrontProduct(item);
          return [product.id, product] as const;
        }));
        setFavorites((current) => current.map((item) => latest.get(item.id) ?? item));
      })
      .catch(() => undefined);
    return () => { active = false; };
  // Read once after local favorites are restored; future admin data is read
  // when this page/provider is mounted again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const toggleFavorite = (product: Product) => {
    setFavorites((current) => current.some((item) => item.id === product.id)
      ? current.filter((item) => item.id !== product.id)
      : [...current, product]);
  };

  const removeFavorite = (id: string) => {
    setFavorites((current) => current.filter((item) => item.id !== id));
  };

  return (
    <FavoriteContext.Provider value={{
      favorites,
      isFavorite: (id) => favorites.some((item) => item.id === id),
      toggleFavorite,
      removeFavorite,
    }}>
      {children}
    </FavoriteContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoriteContext);
  if (!context) throw new Error("useFavorites must be used within FavoriteProvider");
  return context;
}

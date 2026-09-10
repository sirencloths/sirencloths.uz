"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/lib/data";
import { getStorefrontProducts, toStorefrontColorCards } from "@/lib/api";

type FavoriteContextValue = {
  favorites: Product[];
  isFavorite: (product: Product) => boolean;
  toggleFavorite: (product: Product) => void;
  removeFavorite: (product: Product) => void;
};

const FavoriteContext = createContext<FavoriteContextValue | null>(null);
const favoriteKey = (product: Product) => `${product.id}:${product.colorSlug || product.color.trim().toLocaleLowerCase("uz-UZ").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "default"}`;

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

  // A favorite represents one product colour card. Refresh its current data
  // without collapsing other colours of the same product into one favorite.
  useEffect(() => {
    if (!loaded || !favorites.length) return;
    let active = true;
    void getStorefrontProducts()
      .then((items) => {
        if (!active) return;
        const latest = new Map(toStorefrontColorCards(items).map((product) => [favoriteKey(product), product] as const));
        setFavorites((current) => current.map((item) => latest.get(favoriteKey(item)) ?? item));
      })
      .catch(() => undefined);
    return () => { active = false; };
  // Read once after local favorites are restored; future admin data is read
  // when this page/provider is mounted again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const toggleFavorite = (product: Product) => {
    setFavorites((current) => current.some((item) => favoriteKey(item) === favoriteKey(product))
      ? current.filter((item) => favoriteKey(item) !== favoriteKey(product))
      : [...current, product]);
  };

  const removeFavorite = (product: Product) => {
    setFavorites((current) => current.filter((item) => favoriteKey(item) !== favoriteKey(product)));
  };

  return (
    <FavoriteContext.Provider value={{
      favorites,
      isFavorite: (product) => favorites.some((item) => favoriteKey(item) === favoriteKey(product)),
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

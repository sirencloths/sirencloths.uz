"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/lib/data";

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

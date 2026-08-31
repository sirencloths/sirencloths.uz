import { heroProducts } from "./data";

export const searchCategories = ["ФУТБОЛКИ", "СВИТЕРЫ", "МАЙКИ"];

const categoryTerms: Record<string, string[]> = {
  "ФУТБОЛКИ": ["tank"],
  "СВИТЕРЫ": ["legacy"],
  "МАЙКИ": ["tank"],
};

export function searchProducts(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const terms = categoryTerms[query.trim().toUpperCase()] ?? [normalizedQuery];

  return heroProducts.filter((product) =>
    terms.some((term) => `${product.title} ${product.color}`.toLowerCase().includes(term))
  );
}

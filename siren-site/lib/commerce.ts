import type { CartItem } from "@/components/CartContext";

// Store-wide delivery values live in one place.  Cart, drawer and checkout
// consume these values instead of each maintaining its own calculation.
export const STANDARD_DELIVERY_FEE = 60_000;
export const FREE_DELIVERY_THRESHOLD = 2_000_000;

export function cartItemPrice(price: string) {
  const numeric = price.replace(/[^0-9.,-]/g, "");
  const lastSeparator = Math.max(numeric.lastIndexOf("."), numeric.lastIndexOf(","));
  const fractionLength = lastSeparator < 0 ? 0 : numeric.length - lastSeparator - 1;
  // Storefront values can arrive as 320.000, 320,000 or 320000.00.
  // A 3-digit suffix is a thousands group; 1–2 digits are decimals.
  const value = lastSeparator < 0 || fractionLength === 3
    ? Number(numeric.replace(/[.,]/g, ""))
    : Number(`${numeric.slice(0, lastSeparator).replace(/[.,]/g, "")}.${numeric.slice(lastSeparator + 1)}`);
  return Number.isFinite(value) ? value : 0;
}

export function cartSubtotal(cart: CartItem[]) {
  return cart.reduce((sum, item) => sum + cartItemPrice(item.price) * item.quantity, 0);
}

export function shippingCost(_subtotal: number, _itemCount: number) {
  // Delivery is currently included in the order total. Keep this single source
  // of truth so the cart, drawer and checkout never calculate different totals.
  return 0;
}

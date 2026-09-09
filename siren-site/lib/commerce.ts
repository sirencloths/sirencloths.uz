import type { CartItem } from "@/components/CartContext";

// Store-wide delivery values live in one place.  Cart, drawer and checkout
// consume these values instead of each maintaining its own calculation.
export const STANDARD_DELIVERY_FEE = 60_000;

export function cartItemPrice(price: string) {
  const value = Number(price.replace(/[^0-9.,-]/g, "").replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

export function cartSubtotal(cart: CartItem[]) {
  return cart.reduce((sum, item) => sum + cartItemPrice(item.price) * item.quantity, 0);
}

export function shippingCost(_subtotal: number, itemCount: number) {
  if (!itemCount) return 0;
  return STANDARD_DELIVERY_FEE;
}

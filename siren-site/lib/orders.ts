import type { CartItem } from "@/components/CartContext";

export type OrderStatus = "delivered" | "in_transit" | "cancelled";

export type Order = {
  id: string;
  paidAt: string | null;
  status: OrderStatus;
  items: CartItem[];
  total: string;
};

export const orderStatusMeta: Record<OrderStatus, { label: string; className: string }> = {
  delivered: { label: "ДОСТАВЛЕН", className: "is-delivered" },
  in_transit: { label: "В ПУТИ", className: "is-in-transit" },
  cancelled: { label: "ОТМЕНЁН", className: "is-cancelled" },
};

"use client";

type EngagementKind = "favorite" | "cart";

function visitorId() {
  const key = "siren-storefront-visitor-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

/** Best-effort analytics: a failed metric must never interrupt shopping. */
export function trackProductEngagement(productId: string | undefined, kind: EngagementKind, active = true) {
  if (!productId || typeof window === "undefined") return;
  const api = process.env.NEXT_PUBLIC_API_URL ?? `${window.location.protocol}//${window.location.hostname}:4000/api`;
  void fetch(`${api}/catalog/products/${encodeURIComponent(productId)}/engagement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, active, visitorId: visitorId() }),
    keepalive: true,
  }).catch(() => undefined);
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const VISITOR_KEY = "siren-storefront-visitor-id";

export default function VisitorTracker() {
  const pathname = usePathname();
  useEffect(() => {
    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, visitorId);
    }
    void fetch(`${API}/content/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, path: pathname }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}

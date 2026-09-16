"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type OverlayName = "cart" | "search" | "auth";
type OverlayHistoryValue = {
  isOverlayOpen: (overlay: OverlayName) => boolean;
  openOverlay: (overlay: OverlayName) => void;
  closeOverlay: (overlay: OverlayName) => void;
};

const HISTORY_KEY = "__sirenOverlays";
const OverlayHistoryContext = createContext<OverlayHistoryValue | null>(null);

const overlaysFromState = (state: unknown): OverlayName[] => {
  if (!state || typeof state !== "object") return [];
  const value = (state as Record<string, unknown>)[HISTORY_KEY];
  return Array.isArray(value)
    ? value.filter((item): item is OverlayName => item === "cart" || item === "search" || item === "auth")
    : [];
};

/**
 * Keeps transient UI layers in browser history without turning them into pages.
 * Next's own history payload remains intact, so routes and deep links continue
 * to be handled by the App Router.
 */
export function OverlayHistoryProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<OverlayName[]>([]);
  const overlaysRef = useRef<OverlayName[]>([]);

  const apply = useCallback((next: OverlayName[]) => {
    overlaysRef.current = next;
    setOverlays(next);
  }, []);

  useEffect(() => {
    apply(overlaysFromState(window.history.state));
    const onPopState = (event: PopStateEvent) => apply(overlaysFromState(event.state));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [apply]);

  const openOverlay = useCallback((overlay: OverlayName) => {
    const current = overlaysRef.current;
    if (current.includes(overlay)) return;
    const next = [...current, overlay];
    window.history.pushState({ ...window.history.state, [HISTORY_KEY]: next }, "", window.location.href);
    apply(next);
  }, [apply]);

  const closeOverlay = useCallback((overlay: OverlayName) => {
    const current = overlaysRef.current;
    if (!current.includes(overlay)) return;
    // The visible top layer owns the current history entry. Going back lets
    // browser Forward restore it naturally and never leaves a duplicate entry.
    if (current[current.length - 1] === overlay && overlaysFromState(window.history.state).at(-1) === overlay) {
      window.history.back();
      return;
    }
    const next = current.filter((item) => item !== overlay);
    window.history.replaceState({ ...window.history.state, [HISTORY_KEY]: next }, "", window.location.href);
    apply(next);
  }, [apply]);

  const value = useMemo<OverlayHistoryValue>(() => ({
    isOverlayOpen: (overlay) => overlays.includes(overlay),
    openOverlay,
    closeOverlay,
  }), [overlays, openOverlay, closeOverlay]);

  return <OverlayHistoryContext.Provider value={value}>{children}</OverlayHistoryContext.Provider>;
}

export function useOverlayHistory() {
  const value = useContext(OverlayHistoryContext);
  if (!value) throw new Error("useOverlayHistory must be used inside OverlayHistoryProvider");
  return value;
}

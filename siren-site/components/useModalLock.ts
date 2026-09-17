"use client";

import { useEffect } from "react";

// Multiple overlays can coexist while closing in a different order (for
// example search → auth).  A ref-counted lock prevents one cleanup from
// accidentally restoring page scroll while another modal is still visible.
let activeLocks = 0;
let previousBodyOverflow = "";
let previousHtmlOverflow = "";

function lockPage() {
  if (activeLocks++ > 0) return;
  previousBodyOverflow = document.body.style.overflow;
  previousHtmlOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.documentElement.dataset.sirenModalOpen = "true";
}

function unlockPage() {
  activeLocks = Math.max(0, activeLocks - 1);
  if (activeLocks > 0) return;
  document.documentElement.style.overflow = previousHtmlOverflow;
  document.body.style.overflow = previousBodyOverflow;
  delete document.documentElement.dataset.sirenModalOpen;
}

export function useModalLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockPage();
    return unlockPage;
  }, [active]);
}

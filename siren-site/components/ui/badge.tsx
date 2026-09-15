import type { ReactNode } from "react";

export function Badge({ children, variant = "neutral" }: { children: ReactNode; variant?: "neutral" | "success" | "warning" | "danger" }) {
  const tone = variant === "success" ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : variant === "warning" ? "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400" : variant === "danger" ? "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400" : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300";
  return <span className={`ui-badge ui-badge--${variant} inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{children}</span>;
}

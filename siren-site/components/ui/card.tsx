import type { HTMLAttributes, ReactNode } from "react";

// TailAdmin's ComponentCard contract, kept under the existing names so no
// feature component needs to change its state, handlers, or API payloads.
export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) { return <section className={`ui-card rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`} {...props} />; }
export function CardHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`ui-card-header px-5 py-5 sm:px-6 ${className}`} {...props} />; }
export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) { return <h2 className={`ui-card-title text-base font-medium text-gray-800 dark:text-white/90 ${className}`}>{children}</h2>; }
export function CardDescription({ children }: { children: ReactNode }) { return <p className="ui-card-description mt-1 text-sm text-gray-500 dark:text-gray-400">{children}</p>; }
export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`ui-card-content border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800 ${className}`} {...props} />; }

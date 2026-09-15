import type { ComponentPropsWithoutRef, ReactNode } from "react";

// Directly adapted from TailAdmin's ui/table primitive. These wrappers preserve
// native table semantics while allowing existing data/callbacks to remain intact.
export function Table({ children, className = "" }: { children: ReactNode; className?: string }) { return <table className={`tailadmin-table ${className}`}>{children}</table>; }
export function TableHeader({ children, className = "" }: { children: ReactNode; className?: string }) { return <thead className={`tailadmin-table-head ${className}`}>{children}</thead>; }
export function TableBody({ children, className = "" }: { children: ReactNode; className?: string }) { return <tbody className={`tailadmin-table-body ${className}`}>{children}</tbody>; }
export function TableRow({ children, className = "" }: { children: ReactNode; className?: string }) { return <tr className={`tailadmin-table-row ${className}`}>{children}</tr>; }
export function TableCell({ children, header = false, className = "", ...props }: { children: ReactNode; header?: boolean } & ComponentPropsWithoutRef<"td">) { const Tag = header ? "th" : "td"; return <Tag className={`tailadmin-table-cell ${className}`} {...props}>{children}</Tag>; }

import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) { return <section className={`ui-card ${className}`} {...props} />; }
export function CardHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`ui-card-header ${className}`} {...props} />; }
export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) { return <h2 className={`ui-card-title ${className}`}>{children}</h2>; }
export function CardDescription({ children }: { children: ReactNode }) { return <p className="ui-card-description">{children}</p>; }
export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`ui-card-content ${className}`} {...props} />; }

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "default" | "sm" | "icon";
};

export function Button({ children, className = "", variant = "default", size = "default", ...props }: ButtonProps) {
  return <button className={`ui-button ui-button--${variant} ui-button--${size} ${className}`} {...props}>{children}</button>;
}

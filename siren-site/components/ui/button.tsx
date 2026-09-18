import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "primary" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "default" | "sm" | "icon";
};

export function Button({ children, className = "", variant = "default", size = "default", ...props }: ButtonProps) {
  const tone = variant === "default" || variant === "primary" ? "!bg-brand-500 !text-white hover:!bg-brand-600" : variant === "destructive" ? "!bg-error-500 !text-white hover:!bg-error-600" : variant === "outline" ? "!border-gray-300 !bg-white !text-gray-700 hover:!bg-gray-50 dark:!border-gray-700 dark:!bg-transparent dark:!text-gray-300" : "!bg-gray-100 !text-gray-700 hover:!bg-gray-200 dark:!bg-white/10 dark:!text-gray-200";
  const scale = size === "sm" ? "min-h-9 px-3 text-xs" : size === "icon" ? "h-10 w-10 p-0" : "min-h-10 px-4 text-sm";
  return <button className={`ui-button ui-button--${variant} ui-button--${size} inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tone} ${scale} ${className}`} {...props}>{children}</button>;
}

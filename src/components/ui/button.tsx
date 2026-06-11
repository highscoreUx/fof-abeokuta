import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/30",
  secondary:
    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover focus-visible:ring-2 focus-visible:ring-secondary/30",
  outline:
    "border border-border bg-card text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/20",
  danger:
    "bg-danger text-white shadow-sm hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-300",
  ghost: "text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/20",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

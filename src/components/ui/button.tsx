import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "hover:bg-muted text-foreground",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2",
  lg: "px-6 py-3 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";

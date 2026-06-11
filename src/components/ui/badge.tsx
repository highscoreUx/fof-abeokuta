import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variants = {
  default: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  muted: "bg-muted text-muted-foreground",
  success: "bg-emerald-50 text-emerald-700",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

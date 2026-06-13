"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { InputHTMLAttributes, forwardRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition hover:text-foreground"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

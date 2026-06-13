"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="light"
      richColors={false}
      closeButton
      icons={{
        success: null,
        error: null,
        warning: null,
        info: null,
        loading: null,
      }}
      toastOptions={{
        classNames: {
          toast:
            "bg-white text-foreground border border-border shadow-lg rounded-lg group-[.toaster]:bg-white",
          title: "text-sm font-semibold text-foreground",
          description: "text-sm text-muted-foreground",
          closeButton:
            "bg-white border-border text-muted-foreground hover:text-foreground hover:bg-muted",
        },
      }}
    />
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const MIN_MENU_WIDTH = 240;

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const minWidth = Math.max(rect.width, MIN_MENU_WIDTH);

    let left = align === "end" ? rect.right - minWidth : rect.left;
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, window.innerWidth - minWidth - VIEWPORT_PADDING),
    );

    setPosition({
      top: rect.bottom + MENU_GAP,
      left,
      minWidth,
    });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => updatePosition();

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  return (
    <>
      <div ref={triggerRef} className={cn("inline-flex", className)}>
        <div onClick={() => setOpen((value) => !value)}>{trigger}</div>
      </div>
      {mounted &&
        open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            className="fixed z-[100] min-w-[15rem] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
            style={{
              top: position.top,
              left: position.left,
              minWidth: position.minWidth,
            }}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DropdownMenuItem({ children, onClick, className }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-muted",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

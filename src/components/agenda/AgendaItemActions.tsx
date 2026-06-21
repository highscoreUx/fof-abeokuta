"use client";

import type { AgendaListItem } from "@/components/agenda/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface AgendaItemActionsProps {
  item: AgendaListItem;
  isPresent?: boolean;
  onEdit?: (item: AgendaListItem) => void;
  onDelete?: (id: string) => void;
  onSetPresent?: (item: AgendaListItem) => void;
  onClearPresent?: (item: AgendaListItem) => void;
  className?: string;
  size?: "sm" | "xs";
  variant?: "desktop" | "mobile";
}

export function AgendaItemActions({
  item,
  isPresent = false,
  onEdit,
  onDelete,
  onSetPresent,
  onClearPresent,
  className,
  size = "sm",
  variant = "desktop",
}: AgendaItemActionsProps) {
  if (!onEdit && !onDelete && !onSetPresent && !onClearPresent) return null;

  const buttonClass = cn(
    variant === "desktop" && "opacity-0 transition group-hover:opacity-100",
    variant === "mobile" && "h-7 px-2 text-[11px]",
    size === "xs" && variant === "desktop" && "h-auto px-2 py-1 text-xs",
    size === "sm" && variant === "desktop" && "shrink-0",
  );

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5",
        variant === "mobile" && "flex-col items-end gap-0.5",
        className,
      )}
    >
      {onSetPresent && !isPresent && (
        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={() => onSetPresent(item)}
        >
          Present
        </Button>
      )}
      {onClearPresent && isPresent && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(buttonClass, "text-primary")}
          onClick={() => onClearPresent(item)}
        >
          Clear
        </Button>
      )}
      {onEdit && (
        <Button variant="ghost" size="sm" className={buttonClass} onClick={() => onEdit(item)}>
          Edit
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(buttonClass, "text-danger")}
          onClick={() => onDelete(item.id)}
        >
          Delete
        </Button>
      )}
    </div>
  );
}

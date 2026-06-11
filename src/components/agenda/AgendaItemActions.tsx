"use client";

import type { AgendaListItem } from "@/components/agenda/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface AgendaItemActionsProps {
  item: AgendaListItem;
  onEdit?: (item: AgendaListItem) => void;
  onDelete?: (id: string) => void;
  className?: string;
  size?: "sm" | "xs";
}

export function AgendaItemActions({
  item,
  onEdit,
  onDelete,
  className,
  size = "sm",
}: AgendaItemActionsProps) {
  if (!onEdit && !onDelete) return null;

  const buttonClass = cn(
    "opacity-0 transition group-hover:opacity-100",
    size === "xs" && "h-auto px-2 py-1 text-xs",
    size === "sm" && "shrink-0",
  );

  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)}>
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

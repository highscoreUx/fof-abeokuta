"use client";

import { agendaColorForItem } from "@/lib/agenda-colors";
import { formatAgendaTimeRange } from "@/lib/agenda-format";
import { AgendaItemActions } from "@/components/agenda/AgendaItemActions";
import { cn } from "@/lib/cn";
import { AgendaEmpty } from "@/components/agenda/AgendaEmpty";
import type { AgendaListProps } from "@/components/agenda/types";

export function AgendaAccentList({
  items,
  className,
  emptyMessage = "No agenda items yet.",
  onEdit,
  onDelete,
}: AgendaListProps) {
  if (items.length === 0) {
    return <AgendaEmpty message={emptyMessage} />;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => {
        const color = agendaColorForItem(item.id, index);
        return (
          <article
            key={item.id}
            className="group flex overflow-hidden rounded-lg border border-border bg-white shadow-sm"
          >
            <div className="w-2 shrink-0 sm:w-3" style={{ backgroundColor: color.main }} />
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold" style={{ color: color.main }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="truncate font-semibold text-foreground">{item.title}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatAgendaTimeRange(item.startTime, item.endTime)}
                </p>
                {item.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
              <AgendaItemActions item={item} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

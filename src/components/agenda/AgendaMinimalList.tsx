"use client";

import { formatAgendaTimeRange } from "@/lib/agenda-format";
import { AgendaItemActions } from "@/components/agenda/AgendaItemActions";
import { cn } from "@/lib/cn";
import { AgendaEmpty } from "@/components/agenda/AgendaEmpty";
import type { AgendaListProps } from "@/components/agenda/types";

export function AgendaMinimalList({
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
    <div className={cn("divide-y divide-border rounded-xl border border-border bg-card", className)}>
      {items.map((item, index) => (
        <article key={item.id} className="group flex gap-4 px-4 py-4 sm:px-5">
          <span className="w-6 shrink-0 pt-0.5 text-sm font-semibold text-muted-foreground">
            {index + 1}.
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatAgendaTimeRange(item.startTime, item.endTime, false)}
              </span>
            </div>
            {item.description && (
              <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
            )}
          </div>
          <AgendaItemActions item={item} onEdit={onEdit} onDelete={onDelete} />
        </article>
      ))}
    </div>
  );
}

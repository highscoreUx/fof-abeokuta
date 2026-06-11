"use client";

import { agendaColorForItem } from "@/lib/agenda-colors";
import { formatAgendaTimeRange } from "@/lib/agenda-format";
import { AgendaItemActions } from "@/components/agenda/AgendaItemActions";
import { cn } from "@/lib/cn";
import { AgendaEmpty } from "@/components/agenda/AgendaEmpty";
import type { AgendaListProps } from "@/components/agenda/types";

export function AgendaTimelineList({
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
    <div className={cn("relative px-2 py-2", className)}>
      <div className="mb-6 flex justify-center">
        <span className="rounded-full border-2 border-primary/30 bg-primary/10 px-8 py-2 text-lg font-bold text-foreground">
          Agenda
        </span>
      </div>

      <div className="relative ml-6 sm:ml-10">
        <div
          className="absolute left-[1.125rem] top-2 bottom-2 w-0.5 bg-slate-300 sm:left-[1.375rem]"
          aria-hidden
        />

        <div className="space-y-8">
          {items.map((item, index) => {
            const color = agendaColorForItem(item.id, index);
            return (
              <article key={item.id} className="group relative flex items-start gap-0">
                <div
                  className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] bg-white text-sm font-black sm:h-11 sm:w-11 sm:text-base"
                  style={{ borderColor: color.main, color: color.main }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="relative mt-4 h-0.5 w-6 shrink-0 bg-slate-300 sm:w-10">
                  <div
                    className="absolute -top-1 right-0 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color.main }}
                  />
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold" style={{ color: color.main }}>
                        {item.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatAgendaTimeRange(item.startTime, item.endTime)}
                      </p>
                      {item.description && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <AgendaItemActions item={item} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

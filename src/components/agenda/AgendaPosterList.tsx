"use client";

import { agendaColorForItem } from "@/lib/agenda-colors";
import {
  eventTimeSpan,
  formatAgendaTime,
  formatEventDateDots,
  formatEventDay,
} from "@/lib/agenda-format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { AgendaEmpty } from "@/components/agenda/AgendaEmpty";
import type { AgendaListProps } from "@/components/agenda/types";

export function AgendaPosterList({
  items,
  className,
  emptyMessage = "No agenda items yet.",
  onDelete,
  event,
}: AgendaListProps) {
  if (items.length === 0) {
    return <AgendaEmpty message={emptyMessage} />;
  }

  const eventTitle = event?.title ?? "Event agenda";
  const eventDate = event?.date ?? items[0].startTime;
  const dayLabel = formatEventDay(eventDate);
  const dateDots = formatEventDateDots(eventDate);
  const span = eventTimeSpan(items);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border shadow-lg", className)}>
      <div className="flex items-center justify-between gap-4 bg-primary px-5 py-4 text-primary-foreground">
        <p className="truncate text-sm font-bold uppercase tracking-wide sm:text-base">{eventTitle}</p>
        <div className="shrink-0 text-right">
          <p className="text-sm font-black uppercase sm:text-base">{dayLabel}</p>
          {span && <p className="text-xs font-medium opacity-90">{span}</p>}
        </div>
      </div>

      <div className="flex min-h-[200px]">
        <div className="relative flex w-14 shrink-0 items-center justify-center bg-[#4A1942] sm:w-16">
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="whitespace-nowrap text-xl font-black uppercase tracking-[0.35em] text-white sm:text-2xl"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Agenda
            </span>
          </div>
          <span
            className="absolute bottom-4 text-[10px] font-semibold tracking-widest text-white/80"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {dateDots}
          </span>
        </div>

        <div className="min-w-0 flex-1 bg-white">
          {items.map((item, index) => {
            const color = agendaColorForItem(item.id, index);
            return (
              <article
                key={item.id}
                className="group flex gap-4 border-b border-slate-200 px-4 py-5 last:border-b-0 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-black" style={{ color: color.main }}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#4A1942] sm:text-base">
                      {item.title}
                    </h3>
                  </div>
                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-sm font-bold" style={{ color: color.main }}>
                    {formatAgendaTime(item.startTime)}
                  </span>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs text-danger opacity-0 transition group-hover:opacity-100"
                      onClick={() => onDelete(item.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

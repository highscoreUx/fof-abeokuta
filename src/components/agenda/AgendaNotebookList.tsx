"use client";

import { agendaColorForItem } from "@/lib/agenda-colors";
import { formatAgendaTime24, formatAgendaTimeRange } from "@/lib/agenda-format";
import { AgendaItemActions } from "@/components/agenda/AgendaItemActions";
import { cn } from "@/lib/cn";
import { AgendaEmpty } from "@/components/agenda/AgendaEmpty";
import type { AgendaListProps } from "@/components/agenda/types";

function SpiralRings() {
  return (
    <div className="flex flex-col items-center gap-2.5 py-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-2.5 w-6 rounded-full border-2 border-slate-400/80 bg-gradient-to-b from-slate-100 to-slate-300 shadow-inner"
        />
      ))}
    </div>
  );
}

function AgendaNotebookCard({
  item,
  index,
  isPresent = false,
  onEdit,
  onDelete,
  onSetPresent,
  onClearPresent,
}: {
  item: AgendaListProps["items"][number];
  index: number;
  isPresent?: boolean;
  onEdit?: AgendaListProps["onEdit"];
  onDelete?: AgendaListProps["onDelete"];
  onSetPresent?: AgendaListProps["onSetPresent"];
  onClearPresent?: AgendaListProps["onClearPresent"];
}) {
  const color = agendaColorForItem(item.id, index);
  const indexLabel = formatAgendaTime24(item.startTime).replace(":", "");

  return (
    <article className="group relative flex min-h-[108px]">
      <div className="w-1.5 shrink-0 rounded-l-md" style={{ backgroundColor: color.main }} />

      <div
        className="relative flex w-12 shrink-0 items-center justify-center border-y border-slate-200/80 bg-slate-100/90"
        style={{ boxShadow: "inset -2px 0 6px rgb(15 23 42 / 0.04)" }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: color.main, opacity: 0.35 }}
        />
        <SpiralRings />
      </div>

      <div
        className="flex w-[4.5rem] shrink-0 flex-col justify-center border-y border-slate-200/80 px-2 py-4 sm:w-20 sm:px-3"
        style={{ backgroundColor: color.light }}
      >
        <span
          className="text-2xl font-black leading-none tracking-tight sm:text-3xl"
          style={{ color: color.main }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] sm:text-[10px]"
          style={{ color: color.main }}
        >
          {indexLabel}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 shadow-[0_8px_20px_rgb(15_23_42_/0.08)]">
        <div className="w-px shrink-0 bg-slate-200" />
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 border-y border-slate-200/80 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold sm:text-lg" style={{ color: color.main }}>
              {item.title}
              {isPresent && (
                <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Now
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              {formatAgendaTimeRange(item.startTime, item.endTime)}
            </p>
            {item.description && (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>
          <AgendaItemActions
            item={item}
            isPresent={isPresent}
            onEdit={onEdit}
            onDelete={onDelete}
            onSetPresent={onSetPresent}
            onClearPresent={onClearPresent}
          />
        </div>
        <div className="w-4 shrink-0 rounded-r-md sm:w-5" style={{ backgroundColor: color.main }} />
      </div>
    </article>
  );
}

export function AgendaNotebookList({
  items,
  className,
  emptyMessage = "No agenda items yet.",
  presentItemId,
  onEdit,
  onDelete,
  onSetPresent,
  onClearPresent,
}: AgendaListProps) {
  if (items.length === 0) {
    return <AgendaEmpty message={emptyMessage} />;
  }

  return (
    <div className={cn("space-y-5", className)}>
      {items.map((item, index) => (
        <AgendaNotebookCard
          key={item.id}
          item={item}
          index={index}
          isPresent={presentItemId === item.id}
          onEdit={onEdit}
          onDelete={onDelete}
          onSetPresent={onSetPresent}
          onClearPresent={onClearPresent}
        />
      ))}
    </div>
  );
}

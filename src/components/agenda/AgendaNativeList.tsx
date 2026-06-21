"use client";

import { Plus } from "@phosphor-icons/react";
import { AgendaItemActions } from "@/components/agenda/AgendaItemActions";
import { MobileTabHeader } from "@/components/layout/MobileTabHeader";
import type { AgendaEventMeta, AgendaListItem, AgendaListProps } from "@/components/agenda/types";
import { formatAgendaTime, formatAgendaTimeRange, formatEventDateDots } from "@/lib/agenda-format";
import { cn } from "@/lib/cn";

export function AgendaMobileHeader({
  event,
  onAdd,
}: {
  event?: AgendaEventMeta;
  onAdd?: () => void;
}) {
  return (
    <MobileTabHeader
      title="Agenda"
      subtitle={
        event ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {event.title}
            {event.date ? ` · ${formatEventDateDots(event.date)}` : ""}
          </p>
        ) : undefined
      }
      actions={
        onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add agenda item"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95"
          >
            <Plus size={22} weight="bold" aria-hidden />
          </button>
        ) : undefined
      }
    />
  );
}

function AgendaNativeRow({
  item,
  isPresent,
  onEdit,
  onDelete,
  onSetPresent,
  onClearPresent,
}: {
  item: AgendaListItem;
  isPresent: boolean;
  onEdit?: AgendaListProps["onEdit"];
  onDelete?: AgendaListProps["onDelete"];
  onSetPresent?: AgendaListProps["onSetPresent"];
  onClearPresent?: AgendaListProps["onClearPresent"];
}) {
  const hasAdminActions = onEdit || onDelete || onSetPresent || onClearPresent;
  const start = formatAgendaTime(item.startTime);

  return (
    <article
      className={cn(
        "group flex gap-3 border-b border-border/50 px-4 py-3.5",
        isPresent && "border-l-[3px] border-l-primary bg-primary/5 pl-[calc(1rem-3px)]",
      )}
    >
      <div className="w-[4.5rem] shrink-0 pt-0.5 text-right">
        <p className="text-sm font-semibold tabular-nums leading-tight text-foreground">{start}</p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug text-foreground">
              {item.title}
              {isPresent && (
                <span className="ml-2 inline-flex rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                  Now
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatAgendaTimeRange(item.startTime, item.endTime)}
            </p>
            {item.description && (
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>
          {hasAdminActions && (
            <AgendaItemActions
              item={item}
              isPresent={isPresent}
              onEdit={onEdit}
              onDelete={onDelete}
              onSetPresent={onSetPresent}
              onClearPresent={onClearPresent}
              variant="mobile"
              size="xs"
            />
          )}
        </div>
      </div>
    </article>
  );
}

export function AgendaNativeList({
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
    return (
      <p className="px-6 py-16 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div className={cn("bg-card", className)}>
      {items.map((item) => (
        <AgendaNativeRow
          key={item.id}
          item={item}
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

export function AgendaNativeSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-card">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 border-b border-border/50 px-4 py-3.5"
        >
          <div className="w-14 shrink-0 space-y-2">
            <div className="ml-auto h-4 w-10 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-2.5 w-6 animate-pulse rounded bg-muted" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

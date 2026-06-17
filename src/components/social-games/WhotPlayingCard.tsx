"use client";

import type { WhotCard, WhotShape } from "@/lib/social-games/game-state-types";
import {
  WHOT_PLAY_SHAPES,
  WHOT_SHAPE_COLORS,
  WHOT_SHAPE_LABELS,
} from "@/lib/social-games/whot-card-styles";

function WhotShapeIcon({
  shape,
  size = "lg",
}: {
  shape: Exclude<WhotShape, "whot">;
  size?: "sm" | "lg";
}) {
  const color = WHOT_SHAPE_COLORS[shape];
  const text = WHOT_SHAPE_LABELS[shape];
  const className = size === "lg" ? "text-4xl leading-none" : "text-lg leading-none";

  return (
    <span className={className} style={{ color }} aria-hidden>
      {text}
    </span>
  );
}

export function WhotPlayingCard({
  card,
  size = "md",
  faceDown = false,
  selected = false,
}: {
  card?: WhotCard;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
  selected?: boolean;
}) {
  const dims =
    size === "lg"
      ? "h-36 w-24"
      : size === "sm"
        ? "h-24 w-16"
        : "h-32 min-w-[5.5rem]";

  if (faceDown || !card) {
    return (
      <div
        className={`${dims} rounded-lg border-2 border-white/30 bg-gradient-to-br from-[#1a4d8f] to-[#0d2f5c] shadow-md`}
      >
        <div className="flex h-full items-center justify-center">
          <div className="h-[70%] w-[78%] rounded border border-white/20 bg-[#163d72]/80" />
        </div>
      </div>
    );
  }

  if (card.shape === "whot") {
    return (
      <div
        className={`${dims} relative overflow-hidden rounded-lg border-2 bg-gradient-to-br from-[#6a1b9a] to-[#4a148c] text-white shadow-lg ${
          selected ? "border-amber-300 ring-2 ring-amber-300" : "border-white/40"
        }`}
      >
        <span className="absolute left-1.5 top-1 text-[10px] font-bold">20</span>
        <span className="absolute bottom-1 right-1 rotate-180 text-[10px] font-bold">20</span>
        <div className="flex h-full flex-col items-center justify-center gap-1 px-1">
          <span className="text-[10px] font-bold tracking-widest">WHOT</span>
          <span className="text-2xl">?</span>
        </div>
      </div>
    );
  }

  const color = WHOT_SHAPE_COLORS[card.shape];
  const isStar = card.shape === "star";

  return (
    <div
      className={`${dims} relative overflow-hidden rounded-lg border-2 bg-[#fffef8] shadow-lg ${
        selected ? "border-amber-400 ring-2 ring-amber-400" : "border-neutral-300"
      }`}
      style={{ borderTopColor: color, borderTopWidth: 4 }}
    >
      <span className="absolute left-1.5 top-1 text-xs font-bold" style={{ color }}>
        {card.number}
      </span>
      <span
        className="absolute bottom-1 right-1 rotate-180 text-xs font-bold"
        style={{ color }}
      >
        {card.number}
      </span>
      <div className="flex h-full flex-col items-center justify-center">
        <WhotShapeIcon shape={card.shape} size={size === "sm" ? "sm" : "lg"} />
        {isStar && card.scorePoints != null && (
          <span
            className="absolute text-[9px] font-bold text-neutral-600"
            style={{ color }}
            aria-hidden
          >
            {card.scorePoints}
          </span>
        )}
      </div>
      <span className="sr-only">
        {card.number} {card.shape}
      </span>
    </div>
  );
}

export function WhotShapePicker({
  onPick,
}: {
  onPick: (shape: Exclude<WhotShape, "whot">) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {WHOT_PLAY_SHAPES.map((shape) => (
        <button
          key={shape}
          type="button"
          onClick={() => onPick(shape)}
          className="rounded-lg border border-white/20 bg-white/95 px-3 py-2 shadow-md transition hover:scale-105"
        >
          <WhotShapeIcon shape={shape} size="sm" />
        </button>
      ))}
    </div>
  );
}

export function WhotCardBackStack({ count, label }: { count: number; label: string }) {
  return (
    <div className="relative">
      <WhotPlayingCard faceDown size="lg" />
      {count > 1 && (
        <div className="absolute -right-1 -top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
          {count}
        </div>
      )}
      <p className="mt-1 text-center text-xs font-medium text-emerald-100/90">{label}</p>
    </div>
  );
}

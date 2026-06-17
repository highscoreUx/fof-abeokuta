import type { WhotShape } from "@/lib/social-games/game-state-types";

export const WHOT_SHAPE_COLORS: Record<Exclude<WhotShape, "whot">, string> = {
  circle: "#2e7d32",
  triangle: "#c62828",
  cross: "#1565c0",
  square: "#f9a825",
  star: "#212121",
};

export const WHOT_SHAPE_LABELS: Record<Exclude<WhotShape, "whot">, string> = {
  circle: "●",
  triangle: "▲",
  cross: "✚",
  square: "■",
  star: "★",
};

export const WHOT_PLAY_SHAPES: Exclude<WhotShape, "whot">[] = [
  "circle",
  "triangle",
  "cross",
  "square",
  "star",
];

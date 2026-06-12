"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const WHEEL_COLORS = ["#e21b3c", "#1368ce", "#d89e00", "#26890c", "#46178f", "#ff6f00"];

interface SpinnerWheelProps {
  options: string[];
  targetIndex?: number | null;
  spinning?: boolean;
  onSpinComplete?: () => void;
  className?: string;
}

export function SpinnerWheel({
  options,
  targetIndex,
  spinning = false,
  onSpinComplete,
  className,
}: SpinnerWheelProps) {
  const [rotation, setRotation] = useState(0);
  const prevTarget = useRef<number | null>(null);

  useEffect(() => {
    if (!spinning || targetIndex == null || options.length === 0) return;
    if (prevTarget.current === targetIndex) return;
    prevTarget.current = targetIndex;

    const segment = 360 / options.length;
    const spins = 4;
    const targetRotation = spins * 360 + (360 - targetIndex * segment - segment / 2);

    setRotation((r) => r - (r % 360) + targetRotation);

    const timer = setTimeout(() => onSpinComplete?.(), 4200);
    return () => clearTimeout(timer);
  }, [spinning, targetIndex, options.length, onSpinComplete]);

  if (options.length === 0) {
    return (
      <div className={cn("flex h-64 items-center justify-center rounded-full bg-muted", className)}>
        <p className="text-sm text-muted-foreground">Add wheel options to spin</p>
      </div>
    );
  }

  const segmentAngle = 360 / options.length;

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-sm", className)}>
      <div
        className="absolute inset-0 rounded-full border-4 border-foreground/10 shadow-lg transition-transform duration-[4000ms] ease-out"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          {options.map((option, index) => {
            const start = (index * segmentAngle * Math.PI) / 180;
            const end = ((index + 1) * segmentAngle * Math.PI) / 180;
            const x1 = 100 + 100 * Math.cos(start);
            const y1 = 100 + 100 * Math.sin(start);
            const x2 = 100 + 100 * Math.cos(end);
            const y2 = 100 + 100 * Math.sin(end);
            const largeArc = segmentAngle > 180 ? 1 : 0;
            const mid = start + (end - start) / 2;
            const tx = 100 + 62 * Math.cos(mid);
            const ty = 100 + 62 * Math.sin(mid);
            const color = WHEEL_COLORS[index % WHEEL_COLORS.length];

            return (
              <g key={index}>
                <path
                  d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={color}
                />
                <text
                  x={tx}
                  y={ty}
                  fill="white"
                  fontSize="7"
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${(index * segmentAngle + segmentAngle / 2)}, ${tx}, ${ty})`}
                >
                  {option.length > 14 ? `${option.slice(0, 12)}…` : option}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
        <div className="h-0 w-0 border-x-[10px] border-x-transparent border-t-[18px] border-t-foreground" />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-foreground shadow" />
    </div>
  );
}

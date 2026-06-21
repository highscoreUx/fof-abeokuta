"use client";

import { useCallback, useRef } from "react";
import type { EightBallSpin } from "@/lib/social-games/eight-ball-types";

const PAD_SIZE = 88;
const KNOB_RADIUS = 10;

function clamp(value: number) {
  return Math.min(1, Math.max(-1, value));
}

export function EightBallSpinPad({
  spin,
  onChange,
  disabled,
}: {
  spin: EightBallSpin;
  onChange: (spin: EightBallSpin) => void;
  disabled?: boolean;
}) {
  const padRef = useRef<HTMLDivElement | null>(null);

  const updateFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad || disabled) return;
      const rect = pad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = rect.width / 2 - KNOB_RADIUS;
      const dx = clientX - cx;
      const dy = clientY - cy;
      onChange({
        side: clamp(dx / radius),
        follow: clamp(dy / radius),
      });
    },
    [disabled, onChange],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClient(event.clientX, event.clientY);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateFromClient(event.clientX, event.clientY);
  };

  const knobX = ((spin.side + 1) / 2) * (PAD_SIZE - KNOB_RADIUS * 2) + KNOB_RADIUS;
  const knobY = ((spin.follow + 1) / 2) * (PAD_SIZE - KNOB_RADIUS * 2) + KNOB_RADIUS;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-100/70">
        Spin
      </span>
      <div
        ref={padRef}
        className={`relative rounded-full border border-amber-900/50 bg-emerald-950/90 shadow-inner ${
          disabled ? "opacity-50" : "cursor-crosshair"
        }`}
        style={{ width: PAD_SIZE, height: PAD_SIZE, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        role="slider"
        aria-label="Cue ball spin"
        aria-valuenow={Math.round(spin.side * 100)}
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuetext={`Side ${spin.side.toFixed(1)}, follow ${spin.follow.toFixed(1)}`}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-px w-3/5 bg-white/15" />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-3/5 w-px bg-white/15" />
        </div>
        <div
          className="pointer-events-none absolute rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow"
          style={{
            width: KNOB_RADIUS * 2,
            height: KNOB_RADIUS * 2,
            left: knobX - KNOB_RADIUS,
            top: knobY - KNOB_RADIUS,
          }}
        />
      </div>
      <span className="text-[9px] text-emerald-100/50">L/R · draw/follow</span>
    </div>
  );
}

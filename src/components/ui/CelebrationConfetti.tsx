"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface CelebrationConfettiProps {
  active?: boolean;
}

export function CelebrationConfetti({ active = true }: CelebrationConfettiProps) {
  useEffect(() => {
    if (!active) return;

    const durationMs = 2200;
    const end = Date.now() + durationMs;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ["#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#a855f7"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ["#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#a855f7"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ["#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#a855f7"],
    });
    frame();
  }, [active]);

  return null;
}

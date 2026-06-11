"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_LOGIN_SLIDE_PATHS } from "@/lib/login-slides";

const INTERVAL_MS = 5000;
const FADE_MS = 800;

interface LoginSlidePanelProps {
  slides: string[];
  className?: string;
}

export function LoginSlidePanel({ slides, className = "" }: LoginSlidePanelProps) {
  const items = slides.length > 0 ? slides : [...DEFAULT_LOGIN_SLIDE_PATHS];
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    items.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, [items.join("|")]);

  const transitionTo = useCallback(
    (next: number) => {
      if (next === indexRef.current || items.length <= 1) return;

      setOutgoing(indexRef.current);
      indexRef.current = next;
      setIndex(next);
      setFadeIn(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeIn(true));
      });

      window.setTimeout(() => setOutgoing(null), FADE_MS);
    },
    [items.length],
  );

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      transitionTo((indexRef.current + 1) % items.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [items.length, transitionTo]);

  const fadeClass = "absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out";

  return (
    <div className={`relative overflow-hidden bg-primary ${className}`}>
      {outgoing !== null && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={items[outgoing]}
          alt=""
          className={fadeClass}
          style={{
            opacity: fadeIn ? 0 : 1,
            zIndex: 1,
            transitionDuration: `${FADE_MS}ms`,
          }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={items[index]}
        alt=""
        className={fadeClass}
        style={{
          opacity: fadeIn ? 1 : 0,
          zIndex: 2,
          transitionDuration: `${FADE_MS}ms`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-10 bg-primary/20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-primary/80 to-transparent p-8">
        <p className="text-lg font-semibold text-primary-foreground">Friends of Figma Abeokuta</p>
        <p className="mt-1 text-sm text-primary-foreground/90">Design. Build. Connect.</p>
      </div>
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => transitionTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-primary-foreground" : "w-2 bg-primary-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

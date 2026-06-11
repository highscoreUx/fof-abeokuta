"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_LOGIN_SLIDE_PATHS } from "@/lib/login-slides";

const INTERVAL_MS = 7000;
const FADE_MS = 2500;

/** Image fades out toward the bottom so primary blue shows through */
const IMAGE_MASK =
  "linear-gradient(to top, transparent 0%, rgba(0,0,0,0.35) 22%, rgba(0,0,0,0.85) 42%, black 52%)";

interface LoginSlidePanelProps {
  slides: string[];
  className?: string;
}

export function LoginSlidePanel({ slides, className = "" }: LoginSlidePanelProps) {
  const items = slides.length > 0 ? slides : [...DEFAULT_LOGIN_SLIDE_PATHS];
  const indexRef = useRef(0);
  const transitioningRef = useRef(false);
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
      if (next === indexRef.current || items.length <= 1 || transitioningRef.current) return;

      transitioningRef.current = true;
      setOutgoing(indexRef.current);
      indexRef.current = next;
      setIndex(next);
      setFadeIn(false);

      const startTimer = window.setTimeout(() => setFadeIn(true), 40);
      const endTimer = window.setTimeout(() => {
        setOutgoing(null);
        transitioningRef.current = false;
      }, FADE_MS + 40);

      return () => {
        window.clearTimeout(startTimer);
        window.clearTimeout(endTimer);
      };
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

  const transition = `opacity ${FADE_MS}ms ease-in-out, clip-path ${FADE_MS}ms ease-in-out`;

  return (
    <div className={`relative overflow-hidden bg-primary ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          WebkitMaskImage: IMAGE_MASK,
          maskImage: IMAGE_MASK,
        }}
      >
        {outgoing !== null && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={items[outgoing]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: fadeIn ? 0 : 1,
              clipPath: "inset(0 0 0 0)",
              zIndex: 1,
              transition,
            }}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={items[index]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: 1,
            clipPath: fadeIn ? "inset(0 0 0 0)" : "inset(100% 0 0 0)",
            zIndex: 2,
            transition,
          }}
        />
      </div>

      <div className="absolute bottom-14 left-6 z-20 sm:bottom-16 sm:left-8">
        <p className="text-base font-semibold text-white drop-shadow-sm sm:text-lg">
          Friends of Figma Abeokuta
        </p>
        <p className="mt-1 text-sm font-medium text-white/90 drop-shadow-sm">Design. Build. Connect.</p>
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-8">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => transitionTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                i === index ? "w-6 bg-white" : "w-2 bg-white/45 hover:bg-white/65"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

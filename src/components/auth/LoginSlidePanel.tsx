"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_LOGIN_SLIDE_PATHS } from "@/lib/login-slides";

const INTERVAL_MS = 7000;
const FADE_MS = 2500;

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

  const opacity = (visible: boolean) => (visible ? (fadeIn ? 1 : 0) : fadeIn ? 0 : 1);

  return (
    <div className={`relative overflow-hidden bg-neutral-900 ${className}`}>
      {outgoing !== null && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={items[outgoing]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: opacity(false),
            zIndex: 1,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={items[index]}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: opacity(true),
          zIndex: 2,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

      {items.length > 1 && (
        <div className="absolute bottom-8 left-8 right-8 z-20">
          <div className="flex gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                onClick={() => transitionTo(i)}
                className="group h-1 flex-1 overflow-hidden rounded-full bg-white/25"
              >
                <span
                  className={`block h-full rounded-full bg-white transition-all duration-500 ${
                    i === index ? "w-full" : "w-0 group-hover:w-1/2"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

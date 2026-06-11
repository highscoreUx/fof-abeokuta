"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useState } from "react";
import { DEFAULT_LOGIN_SLIDES, type LoginSlideSource } from "@/lib/login-slides";

const INTERVAL_MS = 5000;

interface LoginSlidePanelProps {
  slides: LoginSlideSource[];
  className?: string;
}

export function LoginSlidePanel({ slides, className = "" }: LoginSlidePanelProps) {
  const [index, setIndex] = useState(0);
  const items = slides.length > 0 ? slides : DEFAULT_LOGIN_SLIDES;

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [items.length]);

  return (
    <div className={`relative overflow-hidden bg-primary ${className}`}>
      {items.map((src, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image src={src} alt="" fill priority={i === 0} className="object-cover" sizes="50vw" />
        </div>
      ))}
      <div className="absolute inset-0 bg-primary/20" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/80 to-transparent p-8">
        <p className="text-lg font-semibold text-primary-foreground">Friends of Figma Abeokuta</p>
        <p className="mt-1 text-sm text-primary-foreground/90">Design. Build. Connect.</p>
      </div>
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-primary-foreground" : "w-2 bg-primary-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

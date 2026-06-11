import type { StaticImageData } from "next/image";
import fof1 from "@/images/fof1.jpg";
import fof2 from "@/images/fof2.jpg";
import fof3 from "@/images/fof3.jpg";

export const LOGIN_SLIDES_SETTING_KEY = "login_slide_images";

export const DEFAULT_LOGIN_SLIDES: StaticImageData[] = [fof1, fof2, fof3];

export const DEFAULT_LOGIN_SLIDE_PATHS = [
  "/images/fof1.jpg",
  "/images/fof2.jpg",
  "/images/fof3.jpg",
] as const;

export type LoginSlideSource = string | StaticImageData;

export function isDefaultSlidePath(src: string): boolean {
  return (DEFAULT_LOGIN_SLIDE_PATHS as readonly string[]).includes(src);
}

export function resolveLoginSlides(paths: string[]): LoginSlideSource[] {
  if (paths.length === 0) return [...DEFAULT_LOGIN_SLIDES];

  return paths.map((path, index) =>
    isDefaultSlidePath(path) ? DEFAULT_LOGIN_SLIDES[index] ?? path : path,
  );
}

export function parseLoginSlides(value: string | undefined | null): string[] {
  if (!value) return [...DEFAULT_LOGIN_SLIDE_PATHS];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      const slides = parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
      if (slides.length > 0) return slides.slice(0, 3);
    }
  } catch {
    /* use defaults */
  }

  return [...DEFAULT_LOGIN_SLIDE_PATHS];
}

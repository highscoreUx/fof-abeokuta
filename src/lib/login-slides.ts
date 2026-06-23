import { isEphemeralLocalUploadUrl } from "@/lib/event-cover";

export const LOGIN_SLIDES_SETTING_KEY = "login_slide_images";

/** Unoptimized originals served from /public/images */
export const DEFAULT_LOGIN_SLIDE_PATHS = [
  "/images/fof1.jpg",
  "/images/fof2.jpg",
  "/images/fof3.jpg",
] as const;

export function isDefaultSlidePath(src: string): boolean {
  return (DEFAULT_LOGIN_SLIDE_PATHS as readonly string[]).includes(src);
}

export function resolveLoginSlides(paths: string[]): string[] {
  if (paths.length === 0) return [...DEFAULT_LOGIN_SLIDE_PATHS];
  return paths
    .map((path, index) =>
      isEphemeralLocalUploadUrl(path) ? DEFAULT_LOGIN_SLIDE_PATHS[index] ?? DEFAULT_LOGIN_SLIDE_PATHS[0]! : path,
    )
    .slice(0, 3);
}

export function parseLoginSlides(value: string | undefined | null): string[] {
  if (!value) return [...DEFAULT_LOGIN_SLIDE_PATHS];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      const slides = parsed
        .filter((item): item is string => typeof item === "string" && item.length > 0)
        .map((item, index) =>
          isEphemeralLocalUploadUrl(item)
            ? DEFAULT_LOGIN_SLIDE_PATHS[index] ?? DEFAULT_LOGIN_SLIDE_PATHS[0]!
            : item,
        );
      if (slides.length > 0) return slides.slice(0, 3);
    }
  } catch {
    /* use defaults */
  }

  return [...DEFAULT_LOGIN_SLIDE_PATHS];
}

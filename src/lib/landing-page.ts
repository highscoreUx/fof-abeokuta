export const LANDING_PAGE_SETTING_KEY = "landing_page";
export const LEGACY_LANDING_PAGE_SETTING_KEY = "landing_page_craft";

export type LandingPagePayload = {
  version: 2;
  projectData: Record<string, unknown>;
  html: string;
  css: string;
  updatedAt: string;
};

export function parseLandingPagePayload(value: string | null | undefined): LandingPagePayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "version" in parsed &&
      (parsed as LandingPagePayload).version === 2 &&
      "projectData" in parsed &&
      "html" in parsed &&
      "css" in parsed
    ) {
      return parsed as LandingPagePayload;
    }
  } catch {
    return null;
  }
  return null;
}

export function serializeLandingPagePayload(payload: Omit<LandingPagePayload, "version" | "updatedAt">): string {
  const full: LandingPagePayload = {
    version: 2,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(full);
}

export const CHECK_IN_WELCOME_JOB = "check_in_welcome" as const;

export type EmailJobType = typeof CHECK_IN_WELCOME_JOB;

export interface CheckInWelcomeEmailJob {
  type: typeof CHECK_IN_WELCOME_JOB;
  userId: string;
  eventId: string;
}

export type EmailJob = CheckInWelcomeEmailJob;

export function parseEmailJob(raw: Buffer): EmailJob | null {
  try {
    const parsed = JSON.parse(raw.toString("utf8")) as EmailJob;
    if (parsed?.type !== CHECK_IN_WELCOME_JOB) return null;
    if (typeof parsed.userId !== "string" || typeof parsed.eventId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

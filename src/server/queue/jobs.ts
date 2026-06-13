export const CHECK_IN_WELCOME_JOB = "check_in_welcome" as const;
export const ACCOUNT_CREDENTIALS_JOB = "account_credentials" as const;

export type EmailJobType = typeof CHECK_IN_WELCOME_JOB | typeof ACCOUNT_CREDENTIALS_JOB;

export interface CheckInWelcomeEmailJob {
  type: typeof CHECK_IN_WELCOME_JOB;
  userId: string;
  eventId: string;
}

export interface AccountCredentialsEmailJob {
  type: typeof ACCOUNT_CREDENTIALS_JOB;
  accountId: string;
  password: string;
  reason: "welcome" | "reset" | "check_in";
  loginPath?: string;
}

export type EmailJob = CheckInWelcomeEmailJob | AccountCredentialsEmailJob;

export function parseEmailJob(raw: Buffer): EmailJob | null {
  try {
    const parsed = JSON.parse(raw.toString("utf8")) as EmailJob;
    if (parsed?.type === CHECK_IN_WELCOME_JOB) {
      if (typeof parsed.userId !== "string" || typeof parsed.eventId !== "string") return null;
      return parsed;
    }
    if (parsed?.type === ACCOUNT_CREDENTIALS_JOB) {
      if (typeof parsed.accountId !== "string" || typeof parsed.password !== "string") return null;
      if (parsed.reason !== "welcome" && parsed.reason !== "reset" && parsed.reason !== "check_in") {
        return null;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

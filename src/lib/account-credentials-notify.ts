import {
  canEnqueueEmails,
  enqueueAccountCredentialsEmail,
} from "@/server/queue/publish";

export function deliverAccountCredentials(
  accountId: string,
  password: string,
  reason: "welcome" | "reset" | "check_in",
  loginPath?: string,
): { emailQueued: boolean } {
  if (!canEnqueueEmails()) {
    return { emailQueued: false };
  }
  enqueueAccountCredentialsEmail({ accountId, password, reason, loginPath });
  return { emailQueued: true };
}

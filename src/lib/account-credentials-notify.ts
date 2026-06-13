import {
  canSendQueuedEmails,
  enqueueAccountCredentialsEmail,
} from "@/server/queue/publish";
import type { AccountCredentialsEmailJob } from "@/server/queue/jobs";

export function deliverAccountCredentials(
  accountId: string,
  password: string,
  reason: AccountCredentialsEmailJob["reason"],
  loginPath?: string,
): { emailQueued: boolean } {
  if (!canSendQueuedEmails()) {
    return { emailQueued: false };
  }
  enqueueAccountCredentialsEmail({ accountId, password, reason, loginPath });
  return { emailQueued: true };
}

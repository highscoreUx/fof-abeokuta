export type SendEmailKind = "check_in_welcome" | "account_credentials";

export interface SendEmailMeta {
  kind: SendEmailKind;
  reason?: "welcome" | "reset" | "check_in";
}

/** Fully rendered email ready to enqueue — no DB access required downstream. */
export interface PreparedEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  meta?: SendEmailMeta;
}

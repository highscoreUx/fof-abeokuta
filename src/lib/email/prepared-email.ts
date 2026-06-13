/** App-side email payload before enqueue. Worker only sees serialized SendEmailJob. */

export type PreparedEmailKind = "check_in_welcome" | "account_credentials";

export interface PreparedEmailMeta {
  kind: PreparedEmailKind;
  reason?: "welcome" | "reset" | "check_in";
}

export interface PreparedEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  meta?: PreparedEmailMeta;
}

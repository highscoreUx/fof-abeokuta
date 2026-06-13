export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface EmailTransportAdapter {
  readonly name: string;
  send(options: EmailSendOptions): Promise<void>;
}

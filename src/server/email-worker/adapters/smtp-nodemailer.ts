import nodemailer from "nodemailer";
import { getEmailSender, getSmtpConfig } from "@/server/email-worker/config";
import type { EmailSendOptions, EmailTransportAdapter } from "@/server/email-worker/adapters/types";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const smtp = getSmtpConfig();
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.auth,
    });
  }
  return transporter;
}

export function createSmtpNodemailerTransport(): EmailTransportAdapter {
  return {
    name: "smtp",
    async send(options: EmailSendOptions) {
      const sender = getEmailSender();
      const from =
        options.from ?? `"${sender.name}" <${sender.email}>`;

      await getTransporter().sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    },
  };
}

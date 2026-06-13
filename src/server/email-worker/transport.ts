import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { getSmtpConfig, isEmailConfigured } from "@/server/email-worker/config";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!isEmailConfigured()) {
    throw new Error("Email is not configured");
  }
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

export async function sendMail(options: Mail.Options): Promise<void> {
  const smtp = getSmtpConfig();
  const from =
    options.from ??
    `"${smtp.fromName}" <${smtp.from}>`;

  await getTransporter().sendMail({
    ...options,
    from,
  });
}

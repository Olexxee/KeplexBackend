import { Resend } from "resend";
import { env } from "./env.js";

const resend = new Resend(env.email.resendApiKey);

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) return;

  return resend.emails.send({
    from: env.email.from,
    to,
    subject,
    html,
    text,
  });
};

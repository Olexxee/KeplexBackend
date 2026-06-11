import { sendEmail } from "../../../config/mailer.js";

export const sendViaEmail = async (to, { subject, html }) => {
  return sendEmail({ to, subject, html });
};

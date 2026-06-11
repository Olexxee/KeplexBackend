import { prisma } from "../../../lib/prisma.js";
import { sendViaEmail } from "../channels/email.channel.js";
import { promoTemplate } from "./templates/promo.templates.js";

export const sendPromoToAll = async (promo, sentBy) => {
  // fetch all users who opted in
  const optedIn = await prisma.notificationPreference.findMany({
    where: { marketingEmails: true },
    include: { user: true },
  });

  if (!optedIn.length) {
    return { sent: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    optedIn.map(({ user }) =>
      sendViaEmail(user.email, promoTemplate({ user, promo })),
    ),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // log it
  await prisma.auditLog.create({
    data: {
      userId: sentBy,
      action: "PROMO_EMAIL_SENT",
      entity: "Promotion",
      metadata: { subject: promo.subject, sent, failed },
    },
  });

  return { sent, failed };
};

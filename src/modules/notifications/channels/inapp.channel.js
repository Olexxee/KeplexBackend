import { prisma } from "../../../config/prisma.js";

export const sendViaInApp = async (
  userId,
  { title, message, type, data = {} },
) => {
  return prisma.notification.create({
    data: { userId, title, message, type, data },
  });
};

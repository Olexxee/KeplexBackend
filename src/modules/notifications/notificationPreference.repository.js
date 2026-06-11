import { prisma } from "../../config/prisma.js";

export const findOrCreatePreferences = async (userId) => {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId },
    });
  }

  return prefs;
};

export const updatePreferences = (userId, payload) =>
  prisma.notificationPreference.upsert({
    where: { userId },
    update: payload,
    create: {
      userId,
      ...payload,
    },
  });

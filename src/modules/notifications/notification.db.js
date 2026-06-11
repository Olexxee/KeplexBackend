import { prisma } from "../../config/prisma.js";

export const findUserNotifications = (userId) =>
  prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

export const countUnreadNotifications = (userId) =>
  prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

export const findNotificationByIdAndUser = (id, userId) =>
  prisma.notification.findFirst({
    where: {
      id,
      userId,
    },
  });

export const markNotificationRead = (id) =>
  prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

export const markAllNotificationsRead = (userId) =>
  prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

export const deleteNotificationById = (id) =>
  prisma.notification.delete({
    where: { id },
  });

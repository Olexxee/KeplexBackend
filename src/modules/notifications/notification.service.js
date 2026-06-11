import { NotFoundError } from "../../classes/errorClasses.js";

import {
  findOrCreatePreferences,
  updatePreferences,
} from "./notificationPreference.repository.js";

import {
  findUserNotifications,
  countUnreadNotifications,
  findNotificationByIdAndUser,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationById,
} from "./notification.db.js";

import { sendViaEmail } from "./channels/email.channel.js";
import { sendViaInApp } from "./channels/inapp.channel.js";

import { NOTIFICATION_ROUTES } from "./notification.router.js";

/* -------------------------------------------------------------------------- */
/*                                Preferences                                 */
/* -------------------------------------------------------------------------- */

export const getOrCreatePrefs = async (userId) => {
  return findOrCreatePreferences(userId);
};

export const updatePrefs = async (userId, payload) => {
  return updatePreferences(userId, payload);
};

/* -------------------------------------------------------------------------- */
/*                               Notifications                                */
/* -------------------------------------------------------------------------- */

export const fetchUserNotifications = async (userId) => {
  return findUserNotifications(userId);
};

export const fetchUnreadCount = async (userId) => {
  return countUnreadNotifications(userId);
};

export const readOne = async (notificationId, userId) => {
  const notification = await findNotificationByIdAndUser(
    notificationId,
    userId,
  );

  if (!notification) {
    throw new NotFoundError("Notification not found");
  }

  return markNotificationRead(notificationId);
};

export const readAll = async (userId) => {
  return markAllNotificationsRead(userId);
};

export const removeNotification = async (notificationId, userId) => {
  const notification = await findNotificationByIdAndUser(
    notificationId,
    userId,
  );

  if (!notification) {
    throw new NotFoundError("Notification not found");
  }

  return deleteNotificationById(notificationId);
};

/* -------------------------------------------------------------------------- */
/*                            Notification Engine                             */
/* -------------------------------------------------------------------------- */

const isChannelAllowed = (preferences, preferenceKey) => {
  if (!preferenceKey) return true;
  if (!preferences) return true;

  return preferences[preferenceKey] === true;
};

export const notify = async (jobName, payload) => {
  const route = NOTIFICATION_ROUTES[jobName];

  if (!route) {
    console.warn(`Notification route missing for job: ${jobName}`);
    return;
  }

  const { userId, email, title, message, type, data, emailPayload } = payload;

  const { channels, prefKey } = route;

  const preferences =
    prefKey && userId ? await findOrCreatePreferences(userId) : null;

  if (!isChannelAllowed(preferences, prefKey)) {
    console.log(`Notification skipped by user preferences: ${jobName}`);

    return;
  }

  const tasks = channels.map((channel) => {
    switch (channel) {
      case "email":
        if (email && emailPayload) {
          return sendViaEmail(email, emailPayload);
        }
        break;

      case "inapp":
        if (userId) {
          return sendViaInApp(userId, {
            title,
            message,
            type,
            data,
          });
        }
        break;

      default:
        return Promise.resolve();
    }

    return Promise.resolve();
  });

  return Promise.allSettled(tasks);
};

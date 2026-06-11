import { NOTIFICATION_JOBS } from "./notification.jobs.js";

export const NOTIFICATION_ROUTES = {
  [NOTIFICATION_JOBS.ORDER_CONFIRMED]: {
    channels: ["email", "inapp"],
    prefKey: "orderEmails",
  },
  [NOTIFICATION_JOBS.ORDER_STATUS_UPDATED]: {
    channels: ["email", "inapp"],
    prefKey: "orderStatusEmails",
  },
  [NOTIFICATION_JOBS.REGISTRATION_CONFIRMED]: {
    channels: ["email", "inapp"],
    prefKey: "trainingEmails",
  },
  [NOTIFICATION_JOBS.WELCOME]: {
    channels: ["email"],
    prefKey: null,
  },
  [NOTIFICATION_JOBS.PASSWORD_CHANGED]: {
    channels: ["email", "inapp"],
    prefKey: null,
  },
  [NOTIFICATION_JOBS.GROUP_CREATED]: {
    channels: ["inapp"],
    prefKey: null,
  },
};

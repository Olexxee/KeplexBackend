import { NOTIFICATION_JOBS } from "./notification.jobs.js";

/**
 * @typedef {typeof NOTIFICATION_JOBS[keyof typeof NOTIFICATION_JOBS]} NotificationJobName
 */

/**
 * @typedef {{ order: any }} OrderConfirmedPayload
 * @typedef {{ order: any }} OrderStatusUpdatedPayload
 * @typedef {{ registration: any }} RegistrationConfirmedPayload
 * @typedef {{ groupId: string }} GroupCreatedPayload
 */

/**
 * @typedef {{ name: string, data: object }} NotificationJob
 */

export { NOTIFICATION_JOBS };

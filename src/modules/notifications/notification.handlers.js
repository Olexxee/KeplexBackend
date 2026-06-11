import { NOTIFICATION_JOBS } from "./notification.jobs.js";
import { notify } from "./notification.service.js";
import {
  welcomeTemplate,
  passwordChangedTemplate,
  orderConfirmedTemplate,
  orderStatusTemplate,
  registrationConfirmedTemplate,
} from "./templates/index.js";

export const notificationHandlers = {
  [NOTIFICATION_JOBS.WELCOME]: async ({ user }) => {
    return notify(NOTIFICATION_JOBS.WELCOME, {
      userId: user.id,
      email: user.email,
      title: "Welcome to Keplex!",
      message: "Your account has been created successfully.",
      type: NOTIFICATION_JOBS.WELCOME,
      data: {},
      emailPayload: welcomeTemplate({ user }),
    });
  },

  [NOTIFICATION_JOBS.PASSWORD_CHANGED]: async ({ user }) => {
    return notify(NOTIFICATION_JOBS.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      title: "Password Changed",
      message: "Your account password was recently changed.",
      type: NOTIFICATION_JOBS.PASSWORD_CHANGED,
      data: {},
      emailPayload: passwordChangedTemplate({ user }),
    });
  },

  [NOTIFICATION_JOBS.ORDER_CONFIRMED]: async ({ order }) => {
    return notify(NOTIFICATION_JOBS.ORDER_CONFIRMED, {
      userId: order.userId,
      email: order.customerEmail,
      title: "Order Confirmed",
      message: `Your order ${order.id} has been confirmed.`,
      type: NOTIFICATION_JOBS.ORDER_CONFIRMED,
      data: { orderId: order.id },
      emailPayload: orderConfirmedTemplate({ order }),
    });
  },

  [NOTIFICATION_JOBS.ORDER_STATUS_UPDATED]: async ({ order }) => {
    return notify(NOTIFICATION_JOBS.ORDER_STATUS_UPDATED, {
      userId: order.userId,
      email: order.customerEmail,
      title: "Order Updated",
      message: `Your order status is now ${order.status}.`,
      type: NOTIFICATION_JOBS.ORDER_STATUS_UPDATED,
      data: { orderId: order.id, status: order.status },
      emailPayload: orderStatusTemplate({ order }),
    });
  },

  [NOTIFICATION_JOBS.REGISTRATION_CONFIRMED]: async ({ registration }) => {
    return notify(NOTIFICATION_JOBS.REGISTRATION_CONFIRMED, {
      userId: registration.userId ?? null,
      email: registration.email,
      title: "Registration Confirmed",
      message: "Your training registration has been confirmed.",
      type: NOTIFICATION_JOBS.REGISTRATION_CONFIRMED,
      data: { registrationId: registration.id },
      emailPayload: registrationConfirmedTemplate({ registration }),
    });
  },

  [NOTIFICATION_JOBS.GROUP_CREATED]: async ({ groupId, userId }) => {
    return notify(NOTIFICATION_JOBS.GROUP_CREATED, {
      userId,
      title: "Group Created",
      message: "Your group has been created successfully.",
      type: NOTIFICATION_JOBS.GROUP_CREATED,
      data: { groupId },
    });
  },
};

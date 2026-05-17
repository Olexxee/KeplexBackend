import { NOTIFICATION_JOBS } from "./notification.jobs.js";
import * as notificationService from "./notification.service.js";

export const notificationHandlers = {
  [NOTIFICATION_JOBS.ORDER_CONFIRMED]: notificationService.sendOrderConfirmedEmail,

  [NOTIFICATION_JOBS.ORDER_STATUS_UPDATED]:
    notificationService.sendOrderStatusEmail,
  
    [NOTIFICATION_JOBS.REGISTRATION_CONFIRMED]: notificationService.sendRegistrationConfirmedEmail,

  [NOTIFICATION_JOBS.GROUP_CREATED]: async (data) => {
    console.log("GROUP_CREATED notification received:", data);

    // for now, no email needed
    // later: send group invite email, admin alert, socket event, etc.
    return true;
  },
};  
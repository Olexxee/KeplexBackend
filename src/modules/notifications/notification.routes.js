import { Router } from "express";

import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";

import {
  getMyNotifications,
  getUnreadCount,
  markOneAsRead,
  markAllAsRead,
  deleteNotification,
  getMyPreferences,
  updateMyPreferences,
} from "./notification.controller.js";

import { updateNotificationPreferencesSchema } from "./notification.validation.js";

const notificationRouter = Router();

notificationRouter.use(authMiddleware);

notificationRouter.get("/", getMyNotifications);

notificationRouter.get("/unread-count", getUnreadCount);

notificationRouter.patch("/read-all", markAllAsRead);

notificationRouter.patch("/:id/read", markOneAsRead);

notificationRouter.delete("/:id", deleteNotification);

notificationRouter.get("/preferences", getMyPreferences);

notificationRouter.patch(
  "/preferences",
  validateBody(updateNotificationPreferencesSchema),
  updateMyPreferences,
);

export default notificationRouter;

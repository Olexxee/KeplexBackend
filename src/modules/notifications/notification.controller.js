import { asyncWrapper} from "../../lib/asyncWrapper.js";
import {
  fetchUserNotifications,
  fetchUnreadCount,
  readOne,
  readAll,
  removeNotification,
  getOrCreatePrefs,
  updatePrefs,
} from "./notification.service.js";


// GET /api/notifications
export const getMyNotifications = asyncWrapper(async (req, res) => {
  const notifications = await fetchUserNotifications(req.user.id);
  res.json({ data: notifications });
});

// GET /api/notifications/unread-count
export const getUnreadCount = asyncWrapper(async (req, res) => {
  const count = await fetchUnreadCount(req.user.id);
  res.json({ data: { count } });
});

// PATCH /api/notifications/:id/read
export const markOneAsRead = asyncWrapper(async (req, res) => {
  const notification = await readOne(req.params.id, req.user.id);
  res.json({ data: notification });
});

// PATCH /api/notifications/read-all
export const markAllAsRead = asyncWrapper(async (req, res) => {
  await readAll(req.user.id);
  res.json({ message: "All notifications marked as read" });
});

// DELETE /api/notifications/:id
export const deleteNotification = asyncWrapper(async (req, res) => {
  await removeNotification(req.params.id, req.user.id);
  res.json({ message: "Notification deleted" });
});

// GET /api/notifications/preferences
export const getMyPreferences = asyncWrapper(async (req, res) => {
  const prefs = await getOrCreatePrefs(req.user.id);
  res.json({ data: prefs });
});

// PATCH /api/notifications/preferences
export const updateMyPreferences = asyncWrapper(async (req, res) => {
  const { orderEmails, orderStatusEmails, trainingEmails, marketingEmails } =
    req.body;

  const prefs = await updatePrefs(req.user.id, {
    orderEmails,
    orderStatusEmails,
    trainingEmails,
    marketingEmails,
  });

  res.json({ data: prefs });
});

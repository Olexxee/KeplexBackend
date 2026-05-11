import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import * as notificationService from "../modules/notifications/notification.service.js";

export const notificationWorker = new Worker(
  "notificationQueue",
  async (job) => {
    switch (job.name) {
      case "ORDER_CONFIRMED":
        return notificationService.sendOrderConfirmedEmail(job.data);

      case "ORDER_STATUS_UPDATED":
        return notificationService.sendOrderStatusEmail(job.data);

      default:
        throw new Error(`Unknown notification job: ${job.name}`);
    }
  },
  {
    connection: redisConnection,
  },
);

notificationWorker.on("completed", (job) => {
  console.log(`Notification job completed: ${job.name}`);
});

notificationWorker.on("failed", (job, error) => {
  console.error(`Notification job failed: ${job?.name}`, error);
});

import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { notificationHandlers } from "../modules/notifications/notification.handlers.js";
import {QUEUE_NAMES} from "../queues/notification.queue.js";

export const notificationWorker = new Worker(
  QUEUE_NAMES.NOTIFICATION,
  async (job) => {
    const handler = notificationHandlers[job.name];

    if (!handler) {
      throw new Error(`Unknown notification job: ${job.name}`);
    }

    return handler(job.data);
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

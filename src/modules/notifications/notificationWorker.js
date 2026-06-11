import { Worker } from "bullmq";
import { redisConnection } from "../../config/redis.js";
import { QUEUE_NAMES } from "./notification.queue.js";
import { notificationHandlers } from "./notification.handlers.js";

export const notificationWorker = new Worker(
  QUEUE_NAMES.NOTIFICATION,
  async (job) => {
    const handler = notificationHandlers[job.name];

    if (!handler) {
      throw new Error(`No handler found for job: ${job.name}`);
    }

    return handler(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 10,
  },
);

notificationWorker.on("completed", (job) => {
  console.log(`Notification job completed: ${job.name}`);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`Notification job failed: ${job?.name}`, err);
});

notificationWorker.on("error", (err) => {
  console.error("Worker crashed:", err);
});

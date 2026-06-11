import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.js";

export const QUEUE_NAMES = {
  NOTIFICATION: "keplex_notification_queue",
};

export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
  connection: redisConnection,
});

// future: replace Promise.allSettled fan-out with:
// optedIn.forEach(({ user }) =>
//   enqueueNotification({
//     name: NOTIFICATION_JOBS.PROMO,
//     data: { user, promo },
//   })
// );

export const enqueueNotification = async (job) => {
  return notificationQueue.add(job.name, job.data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  });
};

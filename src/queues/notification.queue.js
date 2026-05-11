import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const notificationQueue = new Queue("notificationQueue", {
  connection: redisConnection,
});

export const enqueueNotification = async (name, data) => {
  return notificationQueue.add(name, data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });
};

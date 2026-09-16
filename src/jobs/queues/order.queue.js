import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.js";

export const ORDER_QUEUE_NAME = "keplex-orders";

export const orderQueue = new Queue(ORDER_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,

    backoff: {
      type: "exponential",
      delay: 5000,
    },

    removeOnComplete: {
      age: 60 * 60 * 24,
      count: 1000,
    },

    removeOnFail: {
      age: 60 * 60 * 24 * 7,
    },
  },
});

console.log("✅ Order queue initialized");


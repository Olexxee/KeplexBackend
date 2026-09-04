// import IORedis from "ioredis";

// const host = process.env.REDIS_HOST;
// const port = process.env.REDIS_PORT;
// const username = process.env.REDIS_USERNAME;
// const rawPassword = process.env.REDIS_PASSWORD;

// if (!host || !port || !username || !rawPassword) {
//   throw new Error("Missing Redis environment variables");
// }

// const password = encodeURIComponent(rawPassword);

// const redisUrl = `redis://${username}:${password}@${host}:${port}`;

// export const redisConnection = new IORedis(redisUrl, {
//   maxRetriesPerRequest: null,
// });

// console.log("✅ IORedis initialized");
import IORedis from "ioredis";

const host = process.env.REDIS_HOST;
const port = Number(process.env.REDIS_PORT);
const username = process.env.REDIS_USERNAME;
const password = process.env.REDIS_PASSWORD;

if (!host || !port || !username || !password) {
  throw new Error(
    "Missing Redis environment variables: REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD",
  );
}

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(
    `Invalid REDIS_PORT: ${process.env.REDIS_PORT}`,
  );
}

export const redisConnection = new IORedis({
  host,
  port,
  username,
  password,
  maxRetriesPerRequest: null,
});

console.log(
  `✅ IORedis initialized: ${host}:${port}`,
);

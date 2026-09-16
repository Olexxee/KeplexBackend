import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import IORedis from "ioredis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env") }); // adjust if .env is elsewhere

const password = process.env.REDIS_PASSWORD;
console.log(
  "password as read:",
  JSON.stringify(password),
  "length:",
  password?.length,
);

const redis = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password,
});

redis
  .ping()
  .then((res) => {
    console.log("PING result:", res);
    process.exit(0);
  })
  .catch((err) => {
    console.error("PING failed:", err);
    process.exit(1);
  });

const Redis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(redisUrl, {
  lazyConnect: false,
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

module.exports = redis;

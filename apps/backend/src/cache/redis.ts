import { Redis } from "ioredis";

// Use environment variable for Redis URL, defaulting to local docker setup if not provided
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  if (process.env.NODE_ENV === "test") {
    return null; // Skip redis caching during tests
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) {
            console.warn("Redis connection failed, disabling cache.");
            return null; // Stop retrying
          }
          return Math.min(times * 50, 2000);
        },
      });
      
      redisClient.on("error", (error) => {
        console.warn("Redis client error:", error.message);
      });
    } catch (error) {
      console.warn("Failed to initialize Redis client:", error);
      return null;
    }
  }

  return redisClient;
};

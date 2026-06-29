import IORedis from "ioredis";

const redis = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

redis.on("error", (error) => {
  console.error("REDIS CONNECTION ERROR:", error.message);
});

export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ success: boolean; remaining: number }> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  return {
    success: current <= limit,
    remaining: Math.max(0, limit - current)
  };
}

export default redis;

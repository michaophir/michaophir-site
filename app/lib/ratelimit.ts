import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function checkRateLimit(
  ip: string,
  action: string,
  limit: number = 3,
  windowSeconds: number = 86400
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rolescout:${action}:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}

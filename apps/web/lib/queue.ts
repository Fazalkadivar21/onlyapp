import { Queue, type ConnectionOptions } from "bullmq";

export function createQueue(name: string) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  return new Queue(name, { connection: redisConnectionFromUrl(redisUrl) });
}

export function redisConnectionFromUrl(value: string): ConnectionOptions {
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null
  };
}

import Redis from "ioredis";

let redisClient = null;
let redisInitAttempted = false;

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readRedisConfig = () => {
  const redisUrl = String(process.env.REDIS_URL || "").trim();
  const host = String(process.env.REDIS_HOST || "127.0.0.1").trim();
  const port = toInt(process.env.REDIS_PORT, 6379);
  const password = String(process.env.REDIS_PASSWORD || "").trim() || undefined;
  const db = toInt(process.env.REDIS_DB, 0);
  const keyPrefix = String(process.env.REDIS_KEY_PREFIX || "").trim();

  if (redisUrl) {
    return {
      mode: "url",
      redisUrl,
      options: {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 1000,
        ...(keyPrefix ? { keyPrefix } : {}),
      },
    };
  }

  return {
    mode: "socket",
    host,
    port,
    options: {
      password,
      db,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 1000,
      ...(keyPrefix ? { keyPrefix } : {}),
    },
  };
};

export const isRedisConfigured = () =>
  Boolean(String(process.env.REDIS_URL || "").trim() || String(process.env.REDIS_HOST || "").trim());

export const getRedisClient = () => {
  if (!isRedisConfigured()) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  if (redisInitAttempted) {
    return null;
  }

  redisInitAttempted = true;

  try {
    const config = readRedisConfig();
    redisClient = config.mode === "url"
      ? new Redis(config.redisUrl, config.options)
      : new Redis({ host: config.host, port: config.port, ...config.options });

    redisClient.on("error", (error) => {
      console.warn("Redis client error:", error?.message || error);
    });

    redisClient.connect().catch((error) => {
      console.warn("Redis connection failed, API will use fallback limiter:", error?.message || error);
      redisClient = null;
    });

    return redisClient;
  } catch (error) {
    console.warn("Redis initialization failed, API will use fallback limiter:", error?.message || error);
    redisClient = null;
    return null;
  }
};

export const closeRedisClient = async () => {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch {
  } finally {
    redisClient = null;
    redisInitAttempted = false;
  }
};

import crypto from "node:crypto";
import Partner from "../models/partner.model.js";
import PartnerApiKey from "../models/partnerApiKey.model.js";
import { getRedisClient, isRedisConfigured } from "../config/redisClient.js";
import {
  getPartnerDynamicLimitSnapshot,
  getPartnerDynamicRedisKeys,
} from "../services/partnerApiDynamicScaling.service.js";

const PARTNER_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const PARTNER_RATE_LIMIT_DEFAULT_MAX = 120;
const PARTNER_RATE_LIMIT_MIN_MAX = 10;
const PARTNER_RATE_LIMIT_MAX_MAX = 5000;
const PARTNER_DAILY_LIMIT_DEFAULT_MAX = 20000;
const PARTNER_DAILY_LIMIT_MIN_MAX = 100;
const PARTNER_DAILY_LIMIT_MAX_MAX = 5000000;

const partnerRateLimitStore = new Map();
const partnerDailyLimitStore = new Map();
const partnerUsageStore = new Map();
const PARTNER_BUCKET_MIN_DELAY_MS = 10;

const PARTNER_TOKEN_BUCKET_LUA = `
local bucketKey = KEYS[1]
local nowMs = tonumber(ARGV[1])
local refillPerSec = tonumber(ARGV[2])
local capacity = tonumber(ARGV[3])
local needed = tonumber(ARGV[4])
local ttlSeconds = tonumber(ARGV[5])

if refillPerSec <= 0 then
  return {0, 0, 60000}
end

local current = redis.call('HMGET', bucketKey, 'tokens', 'lastRefillMs')
local tokens = tonumber(current[1])
local lastRefillMs = tonumber(current[2])

if tokens == nil then
  tokens = capacity
end
if lastRefillMs == nil then
  lastRefillMs = nowMs
end

local elapsedMs = nowMs - lastRefillMs
if elapsedMs < 0 then
  elapsedMs = 0
end

tokens = math.min(capacity, tokens + (elapsedMs / 1000) * refillPerSec)

local allowed = 0
local waitMs = 0
if tokens >= needed then
  tokens = tokens - needed
  allowed = 1
else
  waitMs = math.ceil(((needed - tokens) / refillPerSec) * 1000)
end

redis.call('HMSET', bucketKey, 'tokens', tostring(tokens), 'lastRefillMs', tostring(nowMs))
redis.call('EXPIRE', bucketKey, ttlSeconds)

return {allowed, tokens, waitMs}
`;

const PARTNER_SCOPE_ALIASES = Object.freeze({
  "price.read": ["price.read", "pricing.read"],
  "pricing.read": ["pricing.read", "price.read"],
  "catalog.read": ["catalog.read"],
  "inventory.read": ["inventory.read"],
  "gst.read": ["gst.read"],
  "combos.read": ["combos.read"],
});

const toClampedRateLimit = (value) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return PARTNER_RATE_LIMIT_DEFAULT_MAX;
  return Math.min(
    PARTNER_RATE_LIMIT_MAX_MAX,
    Math.max(PARTNER_RATE_LIMIT_MIN_MAX, parsed),
  );
};

const toClampedDailyLimit = (value) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return PARTNER_DAILY_LIMIT_DEFAULT_MAX;
  return Math.min(
    PARTNER_DAILY_LIMIT_MAX_MAX,
    Math.max(PARTNER_DAILY_LIMIT_MIN_MAX, parsed),
  );
};

const getPartnerRedisKeys = (keyPrefix) => getPartnerDynamicRedisKeys(keyPrefix);

const secondsUntilNextUtcDay = () => {
  const now = new Date();
  const tomorrowUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1, Math.ceil((tomorrowUtc - now.getTime()) / 1000));
};

const getDailyBucketKey = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const evaluateTokenBucketMemory = ({
  rateKey,
  capacity,
  refillPerSecond,
  now,
}) => {
  let bucket = partnerRateLimitStore.get(rateKey);
  if (!bucket) {
    bucket = {
      tokens: capacity,
      lastRefillAt: now,
    };
    partnerRateLimitStore.set(rateKey, bucket);
  }

  const elapsedMs = Math.max(0, now - Number(bucket.lastRefillAt || now));
  const refilled = (elapsedMs / 1000) * refillPerSecond;
  bucket.tokens = Math.min(capacity, Number(bucket.tokens || 0) + refilled);
  bucket.lastRefillAt = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      tokensRemaining: Math.max(bucket.tokens, 0),
      waitMs: 0,
    };
  }

  const waitMs = Math.ceil(((1 - bucket.tokens) / Math.max(refillPerSecond, 0.001)) * 1000);
  return {
    allowed: false,
    tokensRemaining: Math.max(bucket.tokens, 0),
    waitMs,
  };
};

const evaluateTokenBucketRedis = async ({
  redis,
  bucketKey,
  now,
  refillPerSecond,
  capacity,
}) => {
  const ttlSeconds = Math.max(60, Math.ceil((capacity / Math.max(refillPerSecond, 0.001)) * 2));

  const [allowedRaw, tokensRaw, waitMsRaw] = await redis.eval(
    PARTNER_TOKEN_BUCKET_LUA,
    1,
    bucketKey,
    String(now),
    String(refillPerSecond),
    String(capacity),
    "1",
    String(ttlSeconds),
  );

  return {
    allowed: Number(allowedRaw || 0) === 1,
    tokensRemaining: Math.max(Number(tokensRaw || 0), 0),
    waitMs: Math.max(Number(waitMsRaw || 0), 0),
  };
};

const sweepPartnerRateLimitStore = () => {
  const now = Date.now();
  for (const [key, entry] of partnerRateLimitStore.entries()) {
    if (!entry || now - Number(entry.lastRefillAt || 0) > 10 * PARTNER_RATE_LIMIT_WINDOW_MS) {
      partnerRateLimitStore.delete(key);
    }
  }
};

const sweepPartnerDailyLimitStore = () => {
  const currentBucket = getDailyBucketKey();
  for (const [key, entry] of partnerDailyLimitStore.entries()) {
    if (!entry || entry.bucket !== currentBucket) {
      partnerDailyLimitStore.delete(key);
    }
  }
};

setInterval(sweepPartnerRateLimitStore, 5 * 60 * 1000).unref?.();
setInterval(sweepPartnerDailyLimitStore, 60 * 60 * 1000).unref?.();

export const getPartnerRateLimitSnapshot = async ({
  partnerId,
  keyPrefix,
  configuredRateLimitPerMinute,
  partner,
}) => {
  const safePartnerId = String(partnerId || "").trim();
  const safeKeyPrefix = String(keyPrefix || "").trim();
  const limit = toClampedRateLimit(configuredRateLimitPerMinute);

  let effectiveLimit = limit;
  if (partner && safeKeyPrefix) {
    try {
      const dynamicSnapshot = await getPartnerDynamicLimitSnapshot({
        partner,
        keyPrefix: safeKeyPrefix,
      });
      effectiveLimit = Math.max(Number(dynamicSnapshot?.effectiveRPM || limit), 1);
    } catch {
    }
  }

  if (!safePartnerId || !safeKeyPrefix) {
    return {
      limit: effectiveLimit,
      used: 0,
      remaining: effectiveLimit,
      resetInSeconds: 0,
      isLimited: false,
    };
  }

  const redis = getRedisClient();
  if (redis) {
    try {
      const keys = getPartnerRedisKeys(safeKeyPrefix);
      const [usedRaw, ttlRaw] = await Promise.all([
        redis.get(keys.rpm),
        redis.ttl(keys.rpm),
      ]);
      const used = Math.max(Number(usedRaw || 0), 0);
      const remaining = Math.max(effectiveLimit - used, 0);
      const resetInSeconds = Number(ttlRaw) > 0 ? Number(ttlRaw) : 0;
      return {
        limit: effectiveLimit,
        used,
        remaining,
        resetInSeconds,
        isLimited: remaining <= 0,
      };
    } catch (error) {
      console.warn("Redis snapshot read failed for partner RPM; falling back to memory.", error?.message || error);
    }
  }

  const now = Date.now();
  const rateKey = `partner:${safePartnerId}:${safeKeyPrefix}`;
  const bucket = partnerRateLimitStore.get(rateKey);
  if (!bucket) {
    if (bucket) {
      partnerRateLimitStore.delete(rateKey);
    }
    return {
      limit: effectiveLimit,
      used: 0,
      remaining: effectiveLimit,
      resetInSeconds: 0,
      isLimited: false,
    };
  }

  const tokens = Math.max(Number(bucket.tokens || 0), 0);
  const refillPerSecond = Math.max(effectiveLimit / 60, 0.001);
  const used = Math.max(effectiveLimit - Math.floor(tokens), 0);
  const resetInSeconds = Math.max(1, Math.ceil((1 / refillPerSecond)));
  const remaining = Math.max(Math.floor(tokens), 0);

  return {
    limit: effectiveLimit,
    used,
    remaining,
    resetInSeconds,
    isLimited: remaining <= 0,
  };
};

export const getPartnerDailyLimitSnapshot = async ({
  partnerId,
  keyPrefix,
  configuredDailyRequestLimit,
  partner,
}) => {
  const safePartnerId = String(partnerId || "").trim();
  const safeKeyPrefix = String(keyPrefix || "").trim();
  const limit = toClampedDailyLimit(configuredDailyRequestLimit);

  let effectiveDailyLimit = limit;
  if (partner && safeKeyPrefix) {
    try {
      const dynamicSnapshot = await getPartnerDynamicLimitSnapshot({
        partner,
        keyPrefix: safeKeyPrefix,
      });
      effectiveDailyLimit = Math.max(Number(dynamicSnapshot?.dailyLimit || limit), 1);
    } catch {
    }
  }

  if (!safePartnerId || !safeKeyPrefix) {
    return {
      limit: effectiveDailyLimit,
      used: 0,
      remaining: effectiveDailyLimit,
      bucket: getDailyBucketKey(),
      isLimited: false,
    };
  }

  const redis = getRedisClient();
  if (redis) {
    try {
      const keys = getPartnerRedisKeys(safeKeyPrefix);
      const [usedRaw] = await Promise.all([
        redis.get(keys.daily),
      ]);
      const used = Math.max(Number(usedRaw || 0), 0);
      const remaining = Math.max(effectiveDailyLimit - used, 0);
      return {
        limit: effectiveDailyLimit,
        used,
        remaining,
        bucket: getDailyBucketKey(),
        isLimited: remaining <= 0,
      };
    } catch (error) {
      console.warn("Redis snapshot read failed for partner daily limit; falling back to memory.", error?.message || error);
    }
  }

  const dailyKey = `partner-day:${safePartnerId}:${safeKeyPrefix}`;
  const currentBucket = getDailyBucketKey();
  const bucket = partnerDailyLimitStore.get(dailyKey);

  if (!bucket || bucket.bucket !== currentBucket) {
    return {
      limit: effectiveDailyLimit,
      used: 0,
      remaining: effectiveDailyLimit,
      bucket: currentBucket,
      isLimited: false,
    };
  }

  const used = Math.max(Number(bucket.count || 0), 0);
  const remaining = Math.max(effectiveDailyLimit - used, 0);
  return {
    limit: effectiveDailyLimit,
    used,
    remaining,
    bucket: currentBucket,
    isLimited: remaining <= 0,
  };
};

const hashApiKey = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

const extractApiKey = (req) => {
  const authHeader = String(req.headers?.authorization || "").trim();
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const keyHeader = String(req.headers?.["x-api-key"] || "").trim();
  if (keyHeader) return keyHeader;

  return "";
};

const hasScope = (partner, requiredScope) => {
  const scopes = Array.isArray(partner?.scopes) ? partner.scopes : [];
  if (scopes.includes("*")) return true;
  const required = PARTNER_SCOPE_ALIASES[String(requiredScope || "")] || [requiredScope];
  return required.some((scope) => scopes.includes(scope));
};

export const requirePartnerScope = (scope) => (req, res, next) => {
  req.requiredPartnerScope = scope;
  if (!hasScope(req.partner, scope)) {
    res.locals.partnerErrorCode = "INSUFFICIENT_SCOPE";
    return res.status(403).json({
      success: false,
      error: {
        code: "INSUFFICIENT_SCOPE",
        message: "Permission denied for this resource",
        details: null,
      },
      meta: {
        requestId: req.requestId || "",
      },
    });
  }

  return next();
};

export const partnerApiAuth = async (req, res, next) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.locals.partnerErrorCode = "UNAUTHORIZED";
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid API Key",
          details: null,
        },
      });
    }

    const keyPrefix = String(apiKey).split(".")[0]?.trim();
    if (!keyPrefix || !keyPrefix.startsWith("hogp_")) {
      res.locals.partnerErrorCode = "UNAUTHORIZED";
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid API Key",
          details: null,
        },
      });
    }

    const keyRecord = await PartnerApiKey.findOne({
      keyPrefix,
    }).lean();

    if (!keyRecord) {
      res.locals.partnerErrorCode = "UNAUTHORIZED";
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid API Key",
          details: null,
        },
      });
    }

    if (keyRecord.status === "paused") {
      res.locals.partnerErrorCode = "KEY_PAUSED";
      return res.status(403).json({
        success: false,
        error: {
          code: "KEY_PAUSED",
          message: "API key is paused",
          details: null,
        },
      });
    }

    if (keyRecord.status === "revoked") {
      res.locals.partnerErrorCode = "KEY_REVOKED";
      return res.status(403).json({
        success: false,
        error: {
          code: "KEY_REVOKED",
          message: "API key has been revoked",
          details: null,
        },
      });
    }

    if (keyRecord.status !== "active") {
      res.locals.partnerErrorCode = "UNAUTHORIZED";
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid API Key",
          details: null,
        },
      });
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      res.locals.partnerErrorCode = "KEY_EXPIRED";
      return res.status(401).json({
        success: false,
        error: {
          code: "KEY_EXPIRED",
          message: "API key expired",
          details: null,
        },
      });
    }

    const incomingHash = hashApiKey(apiKey);
    if (incomingHash !== keyRecord.keyHash) {
      res.locals.partnerErrorCode = "UNAUTHORIZED";
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid API Key",
          details: null,
        },
      });
    }

    const partner = await Partner.findById(keyRecord.partnerId).lean();
    if (!partner) {
      res.locals.partnerErrorCode = "PARTNER_INACTIVE";
      return res.status(403).json({
        success: false,
        error: {
          code: "PARTNER_INACTIVE",
          message: "Partner access not available",
          details: null,
        },
      });
    }

    if (partner.status === "paused") {
      res.locals.partnerErrorCode = "PARTNER_PAUSED";
      return res.status(403).json({
        success: false,
        error: {
          code: "PARTNER_PAUSED",
          message: "Partner access is paused",
          details: null,
        },
      });
    }

    if (partner.status === "revoked") {
      res.locals.partnerErrorCode = "PARTNER_REVOKED";
      return res.status(403).json({
        success: false,
        error: {
          code: "PARTNER_REVOKED",
          message: "Partner access has been revoked",
          details: null,
        },
      });
    }

    if (partner.status !== "active") {
      res.locals.partnerErrorCode = "PARTNER_INACTIVE";
      return res.status(403).json({
        success: false,
        error: {
          code: "PARTNER_INACTIVE",
          message: "Partner access not available",
          details: null,
        },
      });
    }

    req.partner = partner;
    req.partnerKey = keyRecord;

    PartnerApiKey.updateOne(
      { _id: keyRecord._id },
      {
        $set: {
          lastUsedAt: new Date(),
          lastUsedIp: String(req.ip || req.socket?.remoteAddress || ""),
        },
      },
    ).catch(() => null);

    Partner.updateOne(
      { _id: partner._id },
      {
        $set: {
          lastUsedAt: new Date(),
        },
      },
    ).catch(() => null);

    return next();
  } catch (error) {
    console.error("partnerApiAuth error:", error);
    res.locals.partnerErrorCode = "AUTH_FAILED";
    return res.status(500).json({
      success: false,
      error: {
        code: "AUTH_FAILED",
        message: "Partner authentication failed",
        details: null,
      },
    });
  }
};

export const partnerRuntimeLimiter = async (req, res, next) => {
  try {
    if (req.method === "OPTIONS") return next();
    if (!req.partner || !req.partnerKey) return next();

    const partnerId = String(req.partner?._id || "").trim();
    const keyPrefix = String(req.partnerKey?.keyPrefix || "").trim();
    if (!partnerId || !keyPrefix) return next();

    const dynamicSnapshot = await getPartnerDynamicLimitSnapshot({
      partner: req.partner,
      keyPrefix,
    });

    const limit = Math.max(Number(dynamicSnapshot?.effectiveRPM || 0), 1);
    const burstLimit = Math.max(Number(dynamicSnapshot?.burstRPM || limit), limit);
    const dailyLimit = Math.max(Number(dynamicSnapshot?.dailyLimit || 0), 1);
    const refillPerSecond = Math.max(limit / 60, 0.001);

    const now = Date.now();
    const rateKey = `partner:${partnerId}:${keyPrefix}`;
    const dailyKey = `partner-day:${partnerId}:${keyPrefix}`;
    const dailyBucketKey = getDailyBucketKey();
    const redis = getRedisClient();

    if (redis) {
      try {
        const keys = getPartnerRedisKeys(keyPrefix);
        const dailyExpirySeconds = secondsUntilNextUtcDay();

        let tokenResult = await evaluateTokenBucketRedis({
          redis,
          bucketKey: keys.bucket,
          now,
          refillPerSecond,
          capacity: burstLimit,
        });

        if (!tokenResult.allowed) {
          const retryAfterSeconds = Math.max(1, Math.ceil(tokenResult.waitMs / 1000));
          const shouldDelay = tokenResult.waitMs >= PARTNER_BUCKET_MIN_DELAY_MS
            && tokenResult.waitMs <= 350;

          if (shouldDelay) {
            await sleep(tokenResult.waitMs);
            const secondTry = await evaluateTokenBucketRedis({
              redis,
              bucketKey: keys.bucket,
              now: Date.now(),
              refillPerSecond,
              capacity: burstLimit,
            });
            if (!secondTry.allowed) {
              await Promise.all([
                redis.hincrby(keys.usageDaily, "errors", 1),
                redis.hincrby(keys.usageDaily, "throttles", 1),
                redis.incr(keys.errors),
                redis.expire(keys.errors, dailyExpirySeconds),
                redis.expire(keys.usageDaily, dailyExpirySeconds),
              ]);

              res.setHeader("Retry-After", String(retryAfterSeconds));
              res.setHeader("X-RateLimit-Limit", String(limit));
              res.setHeader("RateLimit-Limit", `${limit};w=60`);
              res.setHeader("X-RateLimit-Reset", String(retryAfterSeconds));
              res.setHeader("RateLimit-Reset", String(retryAfterSeconds));
              res.setHeader("X-RateLimit-Remaining", String(Math.floor(secondTry.tokensRemaining)));
              res.setHeader("RateLimit-Remaining", String(Math.floor(secondTry.tokensRemaining)));
              res.setHeader("X-DailyLimit-Limit", String(dailyLimit));
              res.setHeader("X-DailyLimit-Remaining", String(dailyLimit));
              res.setHeader("X-RateLimit-Mode", "dynamic-token-bucket");
              res.setHeader("X-RateLimit-Burst", String(burstLimit));
              res.setHeader("X-RateLimit-Policy", String(dynamicSnapshot?.state?.policy || "auto"));

              res.locals.partnerErrorCode = "RATE_LIMIT_EXCEEDED";
              return res.status(429).json({
                success: false,
                error: {
                  code: "RATE_LIMIT_EXCEEDED",
                  message: "Rate limit exceeded",
                  details: {
                    limit,
                    burstLimit,
                    retryAfterSeconds,
                    strategy: "token-bucket",
                  },
                },
                meta: {
                  requestId: req.requestId || "",
                  partnerId,
                },
              });
            }
            tokenResult = secondTry;
          } else {
            await Promise.all([
              redis.hincrby(keys.usageDaily, "errors", 1),
              redis.hincrby(keys.usageDaily, "throttles", 1),
              redis.incr(keys.errors),
              redis.expire(keys.errors, dailyExpirySeconds),
              redis.expire(keys.usageDaily, dailyExpirySeconds),
            ]);

            res.setHeader("Retry-After", String(retryAfterSeconds));
            res.setHeader("X-RateLimit-Limit", String(limit));
            res.setHeader("RateLimit-Limit", `${limit};w=60`);
            res.setHeader("X-RateLimit-Reset", String(retryAfterSeconds));
            res.setHeader("RateLimit-Reset", String(retryAfterSeconds));
            res.setHeader("X-RateLimit-Remaining", String(Math.floor(tokenResult.tokensRemaining)));
            res.setHeader("RateLimit-Remaining", String(Math.floor(tokenResult.tokensRemaining)));
            res.setHeader("X-DailyLimit-Limit", String(dailyLimit));
            res.setHeader("X-DailyLimit-Remaining", String(dailyLimit));
            res.setHeader("X-RateLimit-Mode", "dynamic-token-bucket");
            res.setHeader("X-RateLimit-Burst", String(burstLimit));
            res.setHeader("X-RateLimit-Policy", String(dynamicSnapshot?.state?.policy || "auto"));

            res.locals.partnerErrorCode = "RATE_LIMIT_EXCEEDED";
            return res.status(429).json({
              success: false,
              error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: "Rate limit exceeded",
                details: {
                  limit,
                  burstLimit,
                  retryAfterSeconds,
                  strategy: "token-bucket",
                },
              },
              meta: {
                requestId: req.requestId || "",
                partnerId,
              },
            });
          }
        }

        const [[, rpmCountRaw], [, rpmTtlRaw], [, dailyCountRaw], [, dailyTtlRaw]] = await redis
          .multi()
          .incr(keys.rpm)
          .ttl(keys.rpm)
          .incr(keys.daily)
          .ttl(keys.daily)
          .exec();

        const rpmCount = Math.max(Number(rpmCountRaw || 0), 0);
        const dailyCount = Math.max(Number(dailyCountRaw || 0), 0);
        let rpmTtl = Number(rpmTtlRaw || 0);

        const pending = [];
        if (rpmTtl <= 0) {
          pending.push(redis.expire(keys.rpm, 60));
          rpmTtl = 60;
        }
        if (Number(dailyTtlRaw || 0) <= 0) {
          pending.push(redis.expire(keys.daily, dailyExpirySeconds));
        }

        pending.push(redis.hincrby(keys.usageDaily, "total", 1));
        pending.push(redis.expire(keys.usageDaily, dailyExpirySeconds));
        pending.push(redis.hset(keys.meta, {
          lastRequestAt: new Date().toISOString(),
          lastEndpoint: String(req.originalUrl || req.url || "").slice(0, 240),
          dynamicRPM: String(limit),
          burstRPM: String(burstLimit),
          policy: String(dynamicSnapshot?.state?.policy || "auto"),
        }));

        await Promise.all(pending);

        const resetInSeconds = Math.max(1, rpmTtl);
        const baseHeaders = {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Reset": String(resetInSeconds),
          "RateLimit-Limit": `${limit};w=60`,
          "RateLimit-Reset": String(resetInSeconds),
          "X-RateLimit-Burst": String(burstLimit),
          "X-RateLimit-Mode": "dynamic-token-bucket",
          "X-RateLimit-Policy": String(dynamicSnapshot?.state?.policy || "auto"),
        };

        if (dailyCount > dailyLimit) {
          await Promise.all([
            redis.hincrby(keys.usageDaily, "errors", 1),
            redis.hincrby(keys.usageDaily, "throttles", 1),
            redis.incr(keys.errors),
            redis.expire(keys.errors, dailyExpirySeconds),
          ]);

          res.setHeader("X-RateLimit-Remaining", String(Math.floor(tokenResult.tokensRemaining)));
          res.setHeader("RateLimit-Remaining", String(Math.floor(tokenResult.tokensRemaining)));
          res.setHeader("X-DailyLimit-Limit", String(dailyLimit));
          res.setHeader("X-DailyLimit-Remaining", "0");
          res.locals.partnerErrorCode = "DAILY_LIMIT_EXCEEDED";

          return res.status(429).json({
            success: false,
            error: {
              code: "DAILY_LIMIT_EXCEEDED",
              message: "Daily request limit exceeded",
              details: {
                limit: dailyLimit,
                bucket: dailyBucketKey,
              },
            },
            meta: {
              requestId: req.requestId || "",
              partnerId,
            },
          });
        }

        const tokenRemaining = Math.max(Math.floor(tokenResult.tokensRemaining), 0);
        const dailyRemaining = Math.max(dailyLimit - dailyCount, 0);

        res.setHeader("X-RateLimit-Remaining", String(tokenRemaining));
        res.setHeader("RateLimit-Remaining", String(tokenRemaining));
        res.setHeader("X-DailyLimit-Limit", String(dailyLimit));
        res.setHeader("X-DailyLimit-Remaining", String(dailyRemaining));
        for (const [header, value] of Object.entries(baseHeaders)) {
          res.setHeader(header, value);
        }

        req.partnerUsageSnapshot = {
          minute: {
            limit,
            used: rpmCount,
            remaining: tokenRemaining,
            resetInSeconds,
            burstLimit,
          },
          daily: {
            limit: dailyLimit,
            used: dailyCount,
            remaining: dailyRemaining,
            bucket: dailyBucketKey,
          },
          mode: "dynamic-redis",
          dynamic: dynamicSnapshot,
        };

        let finalized = false;
        const finalizeUsage = async () => {
          if (finalized) return;
          finalized = true;
          try {
            const statusCode = Number(res.statusCode || 0);
            if (statusCode >= 400) {
              await Promise.all([
                redis.hincrby(keys.usageDaily, "errors", 1),
                redis.incr(keys.errors),
                redis.expire(keys.errors, dailyExpirySeconds),
              ]);
            } else {
              await redis.hincrby(keys.usageDaily, "success", 1);
            }
          } catch {
          }
        };

        res.on("finish", finalizeUsage);
        res.on("close", finalizeUsage);

        return next();
      } catch (error) {
        console.error("Redis limiter error, switching to safe in-memory fallback:", error?.message || error);
        res.setHeader("X-RateLimit-Mode", isRedisConfigured() ? "fallback-memory-token-bucket" : "memory-token-bucket");
      }
    }

    const bucket = evaluateTokenBucketMemory({
      rateKey,
      capacity: burstLimit,
      refillPerSecond,
      now,
    });

    let memoryBucket = partnerRateLimitStore.get(rateKey);

    if (!bucket.allowed) {
      const waitMs = Math.max(bucket.waitMs, PARTNER_BUCKET_MIN_DELAY_MS);
      if (waitMs <= 350) {
        await sleep(waitMs);
        const retry = evaluateTokenBucketMemory({
          rateKey,
          capacity: burstLimit,
          refillPerSecond,
          now: Date.now(),
        });
        if (!retry.allowed) {
          const retryAfterSeconds = Math.max(1, Math.ceil(retry.waitMs / 1000));
          res.setHeader("Retry-After", String(retryAfterSeconds));
          res.setHeader("X-RateLimit-Limit", String(limit));
          res.setHeader("RateLimit-Limit", `${limit};w=60`);
          res.setHeader("X-RateLimit-Reset", String(retryAfterSeconds));
          res.setHeader("RateLimit-Reset", String(retryAfterSeconds));
          res.setHeader("X-RateLimit-Remaining", String(Math.floor(retry.tokensRemaining)));
          res.setHeader("RateLimit-Remaining", String(Math.floor(retry.tokensRemaining)));
          res.setHeader("X-DailyLimit-Limit", String(dailyLimit));
          res.setHeader("X-DailyLimit-Remaining", String(dailyLimit));
          res.setHeader("X-RateLimit-Burst", String(burstLimit));
          res.setHeader("X-RateLimit-Policy", String(dynamicSnapshot?.state?.policy || "auto"));
          res.locals.partnerErrorCode = "RATE_LIMIT_EXCEEDED";

          return res.status(429).json({
            success: false,
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: "Rate limit exceeded",
              details: {
                limit,
                burstLimit,
                retryAfterSeconds,
                strategy: "token-bucket",
              },
            },
            meta: {
              requestId: req.requestId || "",
              partnerId,
            },
          });
        }
      } else {
        const retryAfterSeconds = Math.max(1, Math.ceil(waitMs / 1000));
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.setHeader("X-RateLimit-Limit", String(limit));
        res.setHeader("RateLimit-Limit", `${limit};w=60`);
        res.setHeader("X-RateLimit-Reset", String(retryAfterSeconds));
        res.setHeader("RateLimit-Reset", String(retryAfterSeconds));
        res.setHeader("X-RateLimit-Remaining", String(Math.floor(bucket.tokensRemaining)));
        res.setHeader("RateLimit-Remaining", String(Math.floor(bucket.tokensRemaining)));
        res.setHeader("X-DailyLimit-Limit", String(dailyLimit));
        res.setHeader("X-DailyLimit-Remaining", String(dailyLimit));
        res.setHeader("X-RateLimit-Burst", String(burstLimit));
        res.setHeader("X-RateLimit-Policy", String(dynamicSnapshot?.state?.policy || "auto"));
        res.locals.partnerErrorCode = "RATE_LIMIT_EXCEEDED";

        return res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Rate limit exceeded",
            details: {
              limit,
              burstLimit,
              retryAfterSeconds,
              strategy: "token-bucket",
            },
          },
          meta: {
            requestId: req.requestId || "",
            partnerId,
          },
        });
      }
      memoryBucket = partnerRateLimitStore.get(rateKey);
    }

    const resetInSeconds = Math.max(1, Math.ceil(1 / refillPerSecond));

    const baseHeaders = {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Reset": String(resetInSeconds),
      "RateLimit-Limit": `${limit};w=60`,
      "RateLimit-Reset": String(resetInSeconds),
      "X-RateLimit-Burst": String(burstLimit),
      "X-RateLimit-Policy": String(dynamicSnapshot?.state?.policy || "auto"),
      "X-RateLimit-Mode": "dynamic-memory-token-bucket",
    };

    let dailyBucket = partnerDailyLimitStore.get(dailyKey);
    if (!dailyBucket || dailyBucket.bucket !== dailyBucketKey) {
      dailyBucket = {
        bucket: dailyBucketKey,
        count: 0,
      };
      partnerDailyLimitStore.set(dailyKey, dailyBucket);
    }

    if (dailyBucket.count >= dailyLimit) {
      res.setHeader("X-DailyLimit-Limit", String(dailyLimit));
      res.setHeader("X-DailyLimit-Remaining", "0");
      res.locals.partnerErrorCode = "DAILY_LIMIT_EXCEEDED";

      return res.status(429).json({
        success: false,
        error: {
          code: "DAILY_LIMIT_EXCEEDED",
          message: "Daily request limit exceeded",
          details: {
            limit: dailyLimit,
            bucket: dailyBucketKey,
          },
        },
        meta: {
          requestId: req.requestId || "",
          partnerId,
        },
      });
    }

    dailyBucket.count += 1;
    const usageFallbackKey = `usage:${partnerId}:${keyPrefix}:${dailyBucketKey}`;
    const usage = partnerUsageStore.get(usageFallbackKey) || { total: 0, success: 0, errors: 0 };
    usage.total += 1;
    partnerUsageStore.set(usageFallbackKey, usage);

    const finalizeFallbackUsage = () => {
      const statusCode = Number(res.statusCode || 0);
      if (statusCode >= 400) usage.errors += 1;
      else usage.success += 1;
    };

    res.on("finish", finalizeFallbackUsage);
    res.on("close", finalizeFallbackUsage);

    const remaining = Math.max(Math.floor(Number(memoryBucket?.tokens || 0)), 0);
    const dailyRemaining = Math.max(dailyLimit - dailyBucket.count, 0);
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("X-DailyLimit-Limit", String(dailyLimit));
    res.setHeader("X-DailyLimit-Remaining", String(dailyRemaining));
    for (const [header, value] of Object.entries(baseHeaders)) {
      res.setHeader(header, value);
    }

    req.partnerUsageSnapshot = {
      minute: {
        limit,
        used: Math.max(limit - remaining, 0),
        remaining,
        resetInSeconds,
        burstLimit,
      },
      daily: {
        limit: dailyLimit,
        used: dailyBucket.count,
        remaining: dailyRemaining,
        bucket: dailyBucketKey,
      },
      mode: "dynamic-memory",
      dynamic: dynamicSnapshot,
    };

    return next();
  } catch (error) {
    console.error("partnerRuntimeLimiter error:", error);
    res.locals.partnerErrorCode = "RATE_LIMIT_CHECK_FAILED";
    return res.status(500).json({
      success: false,
      error: {
        code: "RATE_LIMIT_CHECK_FAILED",
        message: "Unable to validate partner rate limit",
        details: null,
      },
    });
  }
};

export default partnerApiAuth;

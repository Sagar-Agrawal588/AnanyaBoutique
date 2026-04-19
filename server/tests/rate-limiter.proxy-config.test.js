import assert from "node:assert/strict";
import test from "node:test";
import { ipKeyGenerator } from "express-rate-limit";

import {
  buildLimiterKey,
  resolveRateLimitIp,
} from "../middlewares/rateLimiter.js";

test("resolveRateLimitIp prefers Express-resolved req.ip over raw forwarded headers", () => {
  const req = {
    ip: "198.51.100.10",
    headers: {
      "x-forwarded-for": "203.0.113.9, 10.0.0.5",
      "x-real-ip": "203.0.113.9",
    },
    socket: {
      remoteAddress: "10.0.0.5",
    },
    originalUrl: "/api/analytics/collect",
  };

  assert.equal(resolveRateLimitIp(req), "198.51.100.10");
  assert.equal(
    buildLimiterKey(req, "analytics", true),
    `analytics:/api/analytics:${ipKeyGenerator("198.51.100.10")}`,
  );
});

test("resolveRateLimitIp falls back to socket.remoteAddress when req.ip is unavailable", () => {
  const req = {
    headers: {},
    socket: {
      remoteAddress: "127.0.0.1",
    },
    originalUrl: "/api/user/login",
  };

  assert.equal(resolveRateLimitIp(req), "127.0.0.1");
  assert.equal(
    buildLimiterKey(req, "auth"),
    `auth:${ipKeyGenerator("127.0.0.1")}`,
  );
});

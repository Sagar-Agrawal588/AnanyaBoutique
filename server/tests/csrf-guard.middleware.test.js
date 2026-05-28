import assert from "node:assert/strict";
import test from "node:test";
import cookieParser from "cookie-parser";
import express from "express";
import createCookieCsrfGuard from "../middlewares/csrfGuard.js";

const startServer = async (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });

const requestJson = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json();
  return { response, payload };
};

test("csrf guard exempts Google auth path with trailing slash", async (t) => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    createCookieCsrfGuard({
      allowedOrigins: [],
      isProduction: true,
    }),
  );
  app.post("/api/user/authWithGoogle", (_req, res) => {
    res.json({ success: true });
  });
  app.post("/api/user/set-backup-password", (_req, res) => {
    res.json({ success: true });
  });

  const server = await startServer(app);
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  );

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "accessToken=dummy; refreshToken=dummy",
    },
    body: "{}",
  };

  const googleAuth = await requestJson(
    baseUrl,
    "/api/user/authWithGoogle/",
    options,
  );
  assert.equal(googleAuth.response.status, 200);
  assert.equal(googleAuth.payload.success, true);

  const protectedRoute = await requestJson(
    baseUrl,
    "/api/user/set-backup-password/",
    options,
  );
  assert.equal(protectedRoute.response.status, 403);
  assert.equal(
    protectedRoute.payload.message,
    "CSRF protection blocked the request",
  );
});

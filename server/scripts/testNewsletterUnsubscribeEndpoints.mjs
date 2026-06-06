import { unsubscribe } from "../controllers/newsletter.controller.js";
import Newsletter from "../models/newsletter.model.js";

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = undefined;
    this.type = null;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  set(name, value) {
    this.headers[String(name).toLowerCase()] = value;
    return this;
  }

  send(payload) {
    this.type = "send";
    this.body = payload;
    return this;
  }

  json(payload) {
    this.type = "json";
    this.body = payload;
    return this;
  }
}

const originalFindOne = Newsletter.findOne;

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const runCase = async (label, fn) => {
  try {
    await fn();
    console.log(`PASS: ${label}`);
  } catch (error) {
    console.error(`FAIL: ${label}`);
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  }
};

await runCase("GET unsubscribe link returns confirm page HTML", async () => {
  Newsletter.findOne = async () => {
    throw new Error("findOne should not be called before confirmation");
  };

  const req = {
    method: "GET",
    query: { email: "user@example.com" },
    body: {},
  };
  const res = new MockResponse();

  await unsubscribe(req, res);

  expect(res.statusCode === 200, "Expected HTTP 200");
  expect(res.type === "send", "Expected HTML send response");
  expect(
    String(res.headers["content-type"] || "").includes("text/html"),
    "Expected text/html content type",
  );
  const html = String(res.body || "");
  expect(
    html.includes("Unsubscribe from Ananya Boutique"),
    "Expected confirm page title",
  );
  expect(
    html.includes("confirm=1"),
    "Expected confirm=1 unsubscribe action URL",
  );
});

await runCase("GET confirm unsubscribe returns success HTML", async () => {
  let saveCalled = false;
  Newsletter.findOne = async () => ({
    isActive: true,
    unsubscribedAt: null,
    save: async () => {
      saveCalled = true;
    },
  });

  const req = {
    method: "GET",
    query: { email: "user@example.com", confirm: "1" },
    body: {},
  };
  const res = new MockResponse();

  await unsubscribe(req, res);

  expect(res.statusCode === 200, "Expected HTTP 200");
  expect(res.type === "send", "Expected HTML send response");
  expect(saveCalled, "Expected subscriber.save() to be called");
  const html = String(res.body || "");
  expect(html.includes("You unsubscribed"), "Expected success heading in HTML");
  expect(
    html.includes("You have been unsubscribed from our newsletter"),
    "Expected success message in HTML",
  );
});

await runCase("POST unsubscribe returns JSON payload", async () => {
  Newsletter.findOne = async () => ({
    isActive: true,
    unsubscribedAt: null,
    save: async () => {},
  });

  const req = {
    method: "POST",
    query: {},
    body: { email: "user@example.com" },
  };
  const res = new MockResponse();

  await unsubscribe(req, res);

  expect(res.statusCode === 200, "Expected HTTP 200");
  expect(res.type === "json", "Expected JSON response");
  expect(res.body?.success === true, "Expected success=true in JSON body");
  expect(
    String(res.body?.message || "").includes("unsubscribed"),
    "Expected unsubscribed message in JSON body",
  );
});

Newsletter.findOne = originalFindOne;

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}

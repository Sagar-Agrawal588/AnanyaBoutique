#!/usr/bin/env node

/**
 * Test All WhatsApp Message Types Locally
 *
 * Usage:
 *   node test_all_message_types.mjs <recipient_phone> [testType]
 *
 * Examples:
 *   node test_all_message_types.mjs +919983531243
 *   node test_all_message_types.mjs +919983531243 text
 *   node test_all_message_types.mjs +919983531243 template
 *   node test_all_message_types.mjs +919983531243 image
 *   node test_all_message_types.mjs +919983531243 all
 *
 * Tests:
 *   1. Text message (personal send)
 *   2. Template message (using approved template)
 *   3. Image send
 *   4. GIF/Video send
 *   5. Document send
 *   6. Campaign send (broadcast to segment)
 */

import axios from "axios";

const BASE_URL = process.env.API_URL || "http://localhost:8000";
const API_KEY = process.env.ADMIN_API_KEY || "test-key";

const RECIPIENT = process.argv[2] || "+919983531243";
const TEST_TYPE = process.argv[3] || "all";

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) =>
    console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`),
};

// Test helper functions
const testTextMessage = async () => {
  log.section("TEST 1: Text Message (Personal Send)");
  try {
    const response = await axios.post(
      `${BASE_URL}/api/test/whatsapp/message`,
      {
        to: RECIPIENT,
        body: "Hello from CRM! 👋 This is a test text message from the admin panel.",
        previewUrl: false,
      },
      { headers: { "x-api-key": API_KEY } },
    );

    if (response.data?.success) {
      log.success(
        `Text message sent. MessageID: ${response.data.data?.messageId || "N/A"}`,
      );
      return true;
    } else {
      log.error(`Failed: ${response.data?.message || "Unknown error"}`);
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

const testTemplateMessage = async () => {
  log.section("TEST 2: Template Message (Using Approved Template)");
  try {
    const response = await axios.post(
      `${BASE_URL}/api/test/whatsapp/message`,
      {
        to: RECIPIENT,
        templateName: "hello_world",
        languageCode: "en_US",
        bodyVariables: [],
        campaignName: "test_template_send",
      },
      { headers: { "x-api-key": API_KEY } },
    );

    if (response.data?.success) {
      log.success(
        `Template sent. MessageID: ${response.data.data?.messageId || "N/A"}`,
      );
      return true;
    } else {
      log.error(`Failed: ${response.data?.message || "Unknown error"}`);
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

const testImageMessage = async () => {
  log.section("TEST 3: Image Message (Direct Send)");
  try {
    const response = await axios.post(
      `${BASE_URL}/api/test/whatsapp/message`,
      {
        to: RECIPIENT,
        mode: "image",
        mediaUrl:
          "https://res.cloudinary.com/dzmpmbsq2/image/upload/v1718102156/og-image_uo2pqz.png",
        caption: "Test image from CRM admin panel 📸",
      },
      { headers: { "x-api-key": API_KEY } },
    );

    if (response.data?.success) {
      log.success(
        `Image sent. MessageID: ${response.data.data?.messageId || "N/A"}`,
      );
      return true;
    } else {
      log.error(`Failed: ${response.data?.message || "Unknown error"}`);
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

const testGifMessage = async () => {
  log.section("TEST 4: GIF/Video Message (Converted to MP4)");
  try {
    const response = await axios.post(
      `${BASE_URL}/api/test/whatsapp/message`,
      {
        to: RECIPIENT,
        mode: "gif",
        mediaUrl:
          "https://res.cloudinary.com/dzmpmbsq2/video/upload/v1718102156/demo_uo2pqz.gif",
        caption: "Test GIF from CRM admin 🎬",
      },
      { headers: { "x-api-key": API_KEY } },
    );

    if (response.data?.success) {
      log.success(
        `GIF/Video sent. MessageID: ${response.data.data?.messageId || "N/A"}`,
      );
      return true;
    } else {
      log.error(`Failed: ${response.data?.message || "Unknown error"}`);
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

const testDocumentMessage = async () => {
  log.section("TEST 5: Document Message (PDF/File Send)");
  try {
    const response = await axios.post(
      `${BASE_URL}/api/test/whatsapp/message`,
      {
        to: RECIPIENT,
        mode: "document",
        mediaUrl:
          "https://res.cloudinary.com/dzmpmbsq2/raw/upload/v1718102156/sample_doc_abc123.pdf",
        filename: "CRM_Test_Document.pdf",
        caption: "Test document from CRM",
      },
      { headers: { "x-api-key": API_KEY } },
    );

    if (response.data?.success) {
      log.success(
        `Document sent. MessageID: ${response.data.data?.messageId || "N/A"}`,
      );
      return true;
    } else {
      log.error(`Failed: ${response.data?.message || "Unknown error"}`);
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

const testCampaignMessage = async () => {
  log.section("TEST 6: Campaign Send (Broadcast to Segment)");
  try {
    const response = await axios.post(
      `${BASE_URL}/api/test/whatsapp/campaign`,
      {
        segment: "all",
        inactiveDays: 45,
        templateName: "hello_world",
        languageCode: "en_US",
        bodyVariables: [],
        campaignName: "test_campaign_send",
        limit: 1, // Limit to 1 for testing
      },
      { headers: { "x-api-key": API_KEY } },
    );

    if (response.data?.success) {
      const stats = response.data.data;
      log.success(
        `Campaign sent. Attempted: ${stats.attempted}, Sent: ${stats.sent}, Failed: ${stats.failed}`,
      );
      return true;
    } else {
      log.error(`Failed: ${response.data?.message || "Unknown error"}`);
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

const checkHealthStatus = async () => {
  log.section("Pre-Check: WhatsApp Sender Health");
  try {
    const response = await axios.get(`${BASE_URL}/api/test/whatsapp/health`, {
      headers: { "x-api-key": API_KEY },
    });

    if (response.data?.success) {
      const health = response.data.data;
      const status = health.state === "ready" ? colors.green : colors.yellow;
      console.log(`${status}${health.state}${colors.reset}`);
      console.log(`  Display Phone: ${health.displayPhoneNumber}`);
      console.log(`  Verified Name: ${health.verifiedName}`);
      console.log(`  Code Verification: ${health.codeVerificationStatus}`);
      console.log(`  Name Status: ${health.nameStatus}`);
      console.log(`  Quality Rating: ${health.qualityRating}`);

      if (
        health.codeVerificationStatus !== "green" ||
        health.nameStatus !== "approved"
      ) {
        log.warn(
          "Sender has warnings that may block delivery. Fix before mass campaigns.",
        );
      }
    }
  } catch (error) {
    log.error(`Could not fetch health status: ${error.message}`);
  }
};

// Main execution
const runTests = async () => {
  console.log(
    "\n╔════════════════════════════════════════════════════════════╗",
  );
  console.log("║     WhatsApp CRM Message Type Test Suite                  ║");
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n",
  );

  log.info(`API Base URL: ${BASE_URL}`);
  log.info(`Recipient: ${RECIPIENT}`);
  log.info(`Test Type: ${TEST_TYPE}`);

  await checkHealthStatus();

  const tests = {
    text: testTextMessage,
    template: testTemplateMessage,
    image: testImageMessage,
    gif: testGifMessage,
    document: testDocumentMessage,
    campaign: testCampaignMessage,
  };

  const results = {};

  if (TEST_TYPE === "all") {
    for (const [name, testFn] of Object.entries(tests)) {
      results[name] = await testFn();
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1sec delay between tests
    }
  } else if (tests[TEST_TYPE]) {
    results[TEST_TYPE] = await tests[TEST_TYPE]();
  } else {
    log.error(`Unknown test type: ${TEST_TYPE}`);
    console.log(
      "\nAvailable tests: text, template, image, gif, document, campaign, all",
    );
    process.exit(1);
  }

  // Summary
  log.section("Test Summary");
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  console.log(`Passed: ${passed}/${total}`);

  for (const [name, result] of Object.entries(results)) {
    const status = result
      ? `${colors.green}PASS${colors.reset}`
      : `${colors.red}FAIL${colors.reset}`;
    console.log(`  ${status} - ${name}`);
  }

  console.log(
    `\n${colors.cyan}→ Check WhatsApp app for received messages${colors.reset}`,
  );
  console.log(
    `${colors.cyan}→ Check CRM timeline for interaction records${colors.reset}\n`,
  );

  process.exit(passed === total ? 0 : 1);
};

// Run tests
runTests().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

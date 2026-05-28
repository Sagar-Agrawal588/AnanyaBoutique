const baseUrl = String(
  process.argv[2] || "https://healthyonegram-api-v2-xb7znoco6a-uc.a.run.app",
)
  .trim()
  .replace(/\/+$/, "");
const comboId = String(process.argv[3] || "").trim();
const quantity = Math.max(Number(process.argv[4] || 1), 1);
const pincode = String(process.argv[5] || "302022").trim();
const state = String(process.argv[6] || "Rajasthan").trim();

if (!comboId) {
  throw new Error(
    "Usage: node server/tmp/checkDeployedCheckoutPreview.mjs <baseUrl> <comboId> [quantity] [pincode] [state]",
  );
}

const payload = {
  products: [],
  combos: [{ comboId, quantity }],
  delivery_address: null,
  guestDetails: {
    fullName: "Codex Preview",
    email: "preview@example.com",
    phone: "9876543210",
    address: "Jaipur",
    pincode,
    state,
  },
  coinRedeem: { coins: 0 },
  paymentType: "prepaid",
};

const response = await fetch(`${baseUrl}/api/orders/preview`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const body = await response.json().catch(() => null);

console.log(`STATUS ${response.status}`);
console.log(
  JSON.stringify(
    {
      request: payload,
      response: body?.data || body,
    },
    null,
    2,
  ),
);

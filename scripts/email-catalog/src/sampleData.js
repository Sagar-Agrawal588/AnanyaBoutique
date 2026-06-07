export function buildSampleData() {
  const now = new Date();
  const dateText = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return {
    brandName: "Ananya Boutique",
    brandTagline: "Fresh choices, delivered with care",
    logoText: "AB",
    supportEmail: "support@ananyaboutique.com",
    supportPhone: "+91 98765 43210",
    siteUrl: "https://ananyaboutique.com",
    customer_name: "Piyush",
    order_number: "ANB2526/0001",
    amount: "INR 499",
    otp: "482913",
    date: dateText,
    payment_method: "UPI",
    ticket_id: "SUP-20481",
    issue_summary: "Payment confirmation delay",
    estimated_resolution: "24 hours",
    promo_code: "BOUTIQUE20",
    expiry_date: now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    items: [
      { name: "Signature Kurti Set", qty: 1, price: "INR 299" },
      { name: "Artificial Jewellery Edit", qty: 1, price: "INR 200" },
    ],
  };
}

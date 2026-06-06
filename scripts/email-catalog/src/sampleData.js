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
    logoText: "HOG",
    supportEmail: "support@ananyaboutique.com",
    supportPhone: "+91 98765 43210",
    siteUrl: "https://ananyaboutique.com",
    customer_name: "Piyush",
    order_number: "HOG12345",
    amount: "INR 499",
    otp: "482913",
    date: dateText,
    payment_method: "UPI",
    ticket_id: "SUP-20481",
    issue_summary: "Payment confirmation delay",
    estimated_resolution: "24 hours",
    promo_code: "HEALTHY20",
    expiry_date: now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    items: [
      { name: "Organic Chia Seeds 250g", qty: 1, price: "INR 299" },
      { name: "Cold-Pressed Almond Oil 100ml", qty: 1, price: "INR 200" },
    ],
  };
}

import PolicyContentPage from "@/components/PolicyContentPage";

const fallbackContent = `
Ananya Boutique ships orders with care so products reach customers safely.

Delivery timelines depend on destination, courier serviceability, dispatch readiness, and payment/order confirmation. Tracking details are shared when available.

Shipping charges, free-shipping rules, and delivery estimates may vary by cart, address, and active store settings.

For shipment help, tracking questions, or delivery issues, please contact Ananya Boutique support.
`;

export default function ShippingPolicyPage() {
  return (
    <PolicyContentPage
      slug="shipping-policy"
      fallbackTitle="Shipping Policy"
      fallbackContent={fallbackContent}
      eyebrow="Policy"
    />
  );
}

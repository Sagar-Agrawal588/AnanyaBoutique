import PolicyContentPage from "@/components/PolicyContentPage";

const fallbackContent = `
Ananya Boutique return requests are reviewed with care by our support team.

Products must be unused, unworn, and in their original condition with packaging where applicable. Return eligibility can vary by product type, hygiene requirements, sale terms, and order status.

Please contact support before sending any product back. Our team will guide you through the correct next step.

For cancellation details, refund timelines, and non-returnable cases, please also review the Cancellation & Return Policy page.
`;

export default function ReturnPolicyPage() {
  return (
    <PolicyContentPage
      slug="return-policy"
      fallbackTitle="Return Policy"
      fallbackContent={fallbackContent}
      eyebrow="Policy"
    />
  );
}

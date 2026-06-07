import PolicyContentPage from "@/components/PolicyContentPage";

const fallbackContent = `
Ananya Boutique respects your privacy and handles customer information with care.

We collect information needed to provide shopping, account, order, support, delivery, and communication services. This may include your name, email address, phone number, shipping address, order details, and support messages.

We use this information to process orders, provide customer support, improve the shopping experience, prevent fraud, and share boutique updates when permitted.

We do not sell customer personal information. Information may be shared only with service providers needed for payments, shipping, support, analytics, legal compliance, or platform operations.

For privacy questions, corrections, or account/data requests, please contact Ananya Boutique through the Contact page.
`;

export default function PrivacyPolicyPage() {
  return (
    <PolicyContentPage
      slug="privacy-policy"
      fallbackTitle="Privacy Policy"
      fallbackContent={fallbackContent}
      eyebrow="Legal"
    />
  );
}

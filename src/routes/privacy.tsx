import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your personal information."
      lastUpdated="July 4, 2026"
    >
      <PolicySection title="1. Introduction">
        <p>
          {STORE.legalName} (&quot;{STORE.name}&quot;, &quot;we&quot;, &quot;us&quot;) operates {STORE.name.toLowerCase()}.in.
          This Privacy Policy explains how we handle your data when you browse, register, or purchase on our platform.
        </p>
      </PolicySection>
      <PolicySection title="2. Information We Collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data:</strong> name, email, phone number when you register</li>
          <li><strong>Order data:</strong> shipping address, order history, payment status</li>
          <li><strong>Payment data:</strong> processed securely by Razorpay; we do not store card/UPI details</li>
          <li><strong>Technical data:</strong> IP address, browser type, device info for security and analytics</li>
        </ul>
      </PolicySection>
      <PolicySection title="3. How We Use Your Information">
        <ul className="list-disc pl-5 space-y-1">
          <li>Process and fulfil your orders</li>
          <li>Send order confirmations and shipping updates</li>
          <li>Provide customer support</li>
          <li>Prevent fraud and ensure platform security</li>
          <li>Comply with legal obligations under Indian law</li>
        </ul>
      </PolicySection>
      <PolicySection title="4. Payment Processing">
        <p>
          Online payments are processed by Razorpay Software Private Limited, a PCI-DSS compliant payment gateway.
          Your payment information is transmitted directly to Razorpay and is subject to{" "}
          <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary">
            Razorpay&apos;s Privacy Policy
          </a>.
        </p>
      </PolicySection>
      <PolicySection title="5. Data Sharing">
        <p>
          We share data only with service providers necessary to operate our store: payment processors (Razorpay),
          shipping partners (Shiprocket/courier services), and cloud infrastructure (Supabase). We do not sell your
          personal data to third parties.
        </p>
      </PolicySection>
      <PolicySection title="6. Data Retention">
        <p>
          We retain order and account data for as long as your account is active and as required by tax and accounting
          laws (minimum 7 years for transaction records under Indian regulations).
        </p>
      </PolicySection>
      <PolicySection title="7. Your Rights">
        <p>
          You may request access, correction, or deletion of your personal data by emailing{" "}
          <a href={`mailto:${STORE.email}`} className="text-primary">{STORE.email}</a>. We will respond within 30 days.
        </p>
      </PolicySection>
      <PolicySection title="8. Contact">
        <p>
          Data Protection Officer / Grievance Officer: {STORE.legalName}<br />
          Email: {STORE.email}<br />
          Phone: {STORE.phone}
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}

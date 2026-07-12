import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";
import { LEGAL_LAST_UPDATED, contactBlock } from "@/lib/legal-copy";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="How we collect, use, store, and protect your data."
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <PolicySection title="1. Introduction">
        <p>
          {STORE.legalName} (&quot;{STORE.name}&quot;) operates this e-commerce platform. This policy complies with the
          Information Technology Act, 2000 and applicable rules.
        </p>
      </PolicySection>

      <PolicySection title="2. Data We Collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account:</strong> name, email, phone</li>
          <li><strong>Orders:</strong> shipping address, order history, payment status</li>
          <li><strong>Payment:</strong> processed by Razorpay — we do not store card/UPI credentials</li>
          <li><strong>Technical:</strong> IP, browser, session data for security and analytics</li>
        </ul>
      </PolicySection>

      <PolicySection title="3. How We Use Data">
        <ul className="list-disc pl-5 space-y-1">
          <li>Fulfil orders and communicate status</li>
          <li>Customer support and dispute resolution</li>
          <li>Fraud prevention and legal compliance</li>
          <li>Anonymous visit analytics (no sale of personal data)</li>
        </ul>
      </PolicySection>

      <PolicySection title="4. Data Sharing">
        <p>We share data only with processors required to operate:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Razorpay</strong> — payments</li>
          <li><strong>Courier / Shiprocket</strong> — delivery</li>
          <li><strong>CJ Dropshipping & suppliers</strong> — order fulfilment (name, address, phone, product SKU)</li>
          <li><strong>Supabase / cloud hosting</strong> — secure storage</li>
        </ul>
        <p className="mt-2">We do not sell your personal data.</p>
      </PolicySection>

      <PolicySection title="5. Retention">
        <p>Order records retained minimum 7 years for tax/legal compliance. Account data until deletion request.</p>
      </PolicySection>

      <PolicySection title="6. Your Rights">
        <p>
          Request access, correction, or deletion:{" "}
          <a href={`mailto:${STORE.email}`} className="text-primary">{STORE.email}</a> — response within 30 days.
        </p>
      </PolicySection>

      <PolicySection title="7. Grievance Officer">
        <p>
          {contactBlock()} · See also{" "}
          <Link to="/grievance" className="text-primary">Grievance Redressal</Link>
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";
import { SHOPIFY_FULFILLMENT_SUMMARY, LEGAL_LAST_UPDATED, NO_FRAUD_CLAUSE, contactBlock } from "@/lib/legal-copy";

export const Route = createFileRoute("/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <PolicyLayout
      title="Terms & Conditions"
      subtitle="Binding terms for using GadgetVault and placing orders."
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <PolicySection title="1. Acceptance">
        <p>
          By using {STORE.name} or placing an order, you agree to these Terms, our{" "}
          <Link to="/privacy" className="text-primary">Privacy Policy</Link>,{" "}
          <Link to="/refund" className="text-primary">Refund Policy</Link>,{" "}
          <Link to="/shipping" className="text-primary">Shipping Policy</Link>,{" "}
          <Link to="/fulfillment" className="text-primary">Fulfillment Policy</Link>, and{" "}
          <Link to="/disclaimer" className="text-primary">Disclaimer</Link>.
        </p>
      </PolicySection>

      <PolicySection title="2. Eligibility">
        <p>You must be 18+ and capable of entering a binding contract under Indian law.</p>
      </PolicySection>

      <PolicySection title="3. Products & Pricing">
        <ul className="list-disc pl-5 space-y-1">
          <li>Prices in INR; applicable taxes shown at checkout</li>
          <li>Supplier-provided images/specs may vary slightly from the product received</li>
          <li>Confirmed order prices are honoured; listing errors may be corrected before acceptance</li>
          <li>We may limit quantities to prevent abuse</li>
        </ul>
      </PolicySection>

      <PolicySection title="4. Dropshipping & Fulfilment">
        <p>{SHOPIFY_FULFILLMENT_SUMMARY}</p>
      </PolicySection>

      <PolicySection title="5. Orders & Payment">
        <p>
          Orders are confirmed after successful Razorpay payment or COD acceptance. Failed payments are not processed.
          You agree not to initiate fraudulent chargebacks or police complaints without first contacting our{" "}
          <Link to="/grievance" className="text-primary">Grievance Redressal</Link> channel.
        </p>
      </PolicySection>

      <PolicySection title="6. Delivery">
        <p>{NO_FRAUD_CLAUSE}</p>
      </PolicySection>

      <PolicySection title="7. Returns & Refunds">
        <p>See <Link to="/refund" className="text-primary">Refund & Cancellation Policy</Link>.</p>
      </PolicySection>

      <PolicySection title="8. User Conduct">
        <p>
          You may not misuse the platform, submit false claims, harass staff, or attempt payment fraud. Violations may result
          in account suspension and legal action.
        </p>
      </PolicySection>

      <PolicySection title="9. Intellectual Property">
        <p>Website content is owned by {STORE.legalName} or licensors. Unauthorized copying is prohibited.</p>
      </PolicySection>

      <PolicySection title="10. Limitation of Liability">
        <p>
          Maximum liability per order is limited to the amount paid for that order. No liability for indirect or consequential
          damages to the extent permitted by law.
        </p>
      </PolicySection>

      <PolicySection title="11. Governing Law & Disputes">
        <p>
          Governed by laws of India. Courts at Gautam Buddha Nagar, Uttar Pradesh have jurisdiction. You may also use consumer
          forums under the Consumer Protection Act, 2019.
        </p>
      </PolicySection>

      <PolicySection title="12. Contact">
        <p>{contactBlock()}</p>
      </PolicySection>
    </PolicyLayout>
  );
}

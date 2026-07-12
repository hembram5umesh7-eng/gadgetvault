import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";
import { LEGAL_LAST_UPDATED, NO_FRAUD_CLAUSE, contactBlock } from "@/lib/legal-copy";

export const Route = createFileRoute("/disclaimer")({ component: DisclaimerPage });

function DisclaimerPage() {
  return (
    <PolicyLayout
      title="Disclaimer"
      subtitle="Important limitations on information, products, and services on this website."
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <PolicySection title="1. General">
        <p>
          Information on {STORE.name} is provided for general shopping purposes. While we strive for accuracy, we do not warrant
          that product descriptions, pricing, or availability are error-free at all times.
        </p>
      </PolicySection>

      <PolicySection title="2. No Professional Advice">
        <p>
          Content on this site does not constitute legal, financial, or technical advice. Use products according to manufacturer
          instructions and applicable safety standards.
        </p>
      </PolicySection>

      <PolicySection title="3. Delivery Estimates">
        <p>{NO_FRAUD_CLAUSE}</p>
        <p className="mt-2">
          See our{" "}
          <Link to="/fulfillment" className="text-primary">Fulfillment Policy</Link> and{" "}
          <Link to="/shipping" className="text-primary">Shipping Policy</Link> for detailed timelines.
        </p>
      </PolicySection>

      <PolicySection title="4. Third-Party Services">
        <p>
          Payments are processed by Razorpay. Shipping may involve third-party couriers and dropshipping partners (e.g. CJ Dropshipping).
          {STORE.name} is not responsible for failures solely caused by third-party systems beyond our reasonable control, but we
          will assist you in resolving order issues.
        </p>
      </PolicySection>

      <PolicySection title="5. Limitation of Liability">
        <p>
          To the maximum extent permitted under Indian law, {STORE.legalName} shall not be liable for indirect, incidental, special,
          or consequential damages. Our aggregate liability for any order shall not exceed the amount you paid for that order.
        </p>
      </PolicySection>

      <PolicySection title="6. External Links">
        <p>
          Links to external websites are provided for convenience. We do not endorse or control third-party content.
        </p>
      </PolicySection>

      <PolicySection title="7. Contact">
        <p>{contactBlock()}</p>
      </PolicySection>
    </PolicyLayout>
  );
}

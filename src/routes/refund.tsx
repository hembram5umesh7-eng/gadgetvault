import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";
import { DELIVERY_ESTIMATES, LEGAL_LAST_UPDATED, contactBlock } from "@/lib/legal-copy";

export const Route = createFileRoute("/refund")({ component: RefundPage });

function RefundPage() {
  return (
    <PolicyLayout
      title="Refund & Cancellation Policy"
      subtitle="When you can cancel, return, or get a refund — including dropshipped orders."
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <PolicySection title="1. Overview">
        <p>
          This policy applies to all {STORE.name} orders, including those fulfilled via dropshipping partners.
          Delivery delays within our stated estimates ({DELIVERY_ESTIMATES.totalTypical}) alone do not automatically qualify for a refund.
        </p>
      </PolicySection>

      <PolicySection title="2. Cancellation Before Dispatch">
        <ul className="list-disc pl-5 space-y-1">
          <li>Cancel via <Link to="/orders" className="text-primary">My Orders</Link> or email {STORE.email} with order number</li>
          <li>If not yet dispatched to courier, full refund for prepaid orders within 5–7 business days</li>
          <li>Once handed to supplier for dispatch, cancellation may not be possible</li>
        </ul>
      </PolicySection>

      <PolicySection title="3. Cancellation After Dispatch">
        <p>
          You may refuse delivery in some cases; return shipping and restocking costs may be deducted. Contact us before refusing.
        </p>
      </PolicySection>

      <PolicySection title="4. Return Eligibility">
        <ul className="list-disc pl-5 space-y-1">
          <li>Damaged or defective — report within <strong>48 hours</strong> with photos/video</li>
          <li>Wrong item shipped — report within 48 hours</li>
          <li>Unused, original packaging with tags (where applicable)</li>
        </ul>
        <p className="mt-2">
          <strong>Non-returnable:</strong> Hygiene-sealed items once opened, personalized goods, items marked non-returnable on product page,
          and damage from misuse.
        </p>
      </PolicySection>

      <PolicySection title="5. Dropship Return Limitations">
        <p>
          Returns for supplier-fulfilled items may require return to a designated address or supplier RMA process.
          International return legs may take longer. We will guide you after approval.
        </p>
      </PolicySection>

      <PolicySection title="6. Refund Timeline">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Prepaid:</strong> 5–10 business days after approved return inspection</li>
          <li><strong>COD:</strong> Bank/UPI refund within 7–14 business days after approval</li>
          <li>Shipping fees non-refundable unless our error</li>
        </ul>
      </PolicySection>

      <PolicySection title="7. Non-Refund Cases">
        <ul className="list-disc pl-5 space-y-1">
          <li>Change of mind after use or seal broken (where applicable)</li>
          <li>Delays within published estimate ranges without product defect</li>
          <li>Minor packaging dents that do not affect product function</li>
          <li>False or abusive claims</li>
        </ul>
      </PolicySection>

      <PolicySection title="8. Grievance">
        <p>
          Unresolved issues: <Link to="/grievance" className="text-primary">Grievance Redressal</Link> · {contactBlock()}
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";
import { CJ_FULFILLMENT_SUMMARY, DELIVERY_ESTIMATES, LEGAL_LAST_UPDATED, NO_FRAUD_CLAUSE, contactBlock } from "@/lib/legal-copy";

export const Route = createFileRoute("/fulfillment")({ component: FulfillmentPage });

function FulfillmentPage() {
  return (
    <PolicyLayout
      title="Fulfillment & Dropshipping Policy"
      subtitle="How orders are sourced, processed, and shipped — including CJ Dropshipping."
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <PolicySection title="1. Business Model Disclosure">
        <p>{CJ_FULFILLMENT_SUMMARY}</p>
        <p className="mt-2">
          Product images, descriptions, and specifications are provided by suppliers. We display this information in good faith but
          minor variations in colour, packaging, or accessories may occur.
        </p>
      </PolicySection>

      <PolicySection title="2. Order Flow">
        <ol className="list-decimal pl-5 space-y-1">
          <li>You place an order and payment is confirmed (Razorpay) or accepted (COD).</li>
          <li>We validate the order and transmit fulfilment instructions to our supplier partner.</li>
          <li>The supplier prepares and dispatches the package to your shipping address in India.</li>
          <li>You receive tracking details when available from the courier or supplier.</li>
        </ol>
      </PolicySection>

      <PolicySection title="3. Estimated Timelines (Not Guaranteed)">
        <p className="font-semibold text-foreground">Important: These are estimates only — not promises of delivery by a fixed date.</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Order processing:</strong> {DELIVERY_ESTIMATES.processingDays} after payment confirmation</li>
          <li><strong>Supplier fulfilment:</strong> {DELIVERY_ESTIMATES.fulfillmentDays} before handover to courier</li>
          <li><strong>India courier transit:</strong> {DELIVERY_ESTIMATES.courierDays} after dispatch</li>
          <li><strong>Typical total:</strong> {DELIVERY_ESTIMATES.totalTypical} from order date</li>
        </ul>
        <p className="mt-2">{DELIVERY_ESTIMATES.extendedNote}</p>
        <p className="mt-2">{NO_FRAUD_CLAUSE}</p>
      </PolicySection>

      <PolicySection title="4. Tracking & Communication">
        <p>
          Tracking may be updated in stages. If tracking is delayed, it does not always mean your order failed — supplier systems
          sometimes update late. Contact {STORE.email} with your order number if no update after {DELIVERY_ESTIMATES.totalTypical}.
        </p>
      </PolicySection>

      <PolicySection title="5. Stock & Cancellations">
        <p>
          If a product becomes unavailable after you order, we will notify you and offer a full refund or alternative product.
          We will not ship a substitute without your consent.
        </p>
      </PolicySection>

      <PolicySection title="6. Related Policies">
        <p>
          Also read our{" "}
          <Link to="/shipping" className="text-primary">Shipping Policy</Link>,{" "}
          <Link to="/refund" className="text-primary">Refund Policy</Link>, and{" "}
          <Link to="/terms" className="text-primary">Terms & Conditions</Link>.
        </p>
      </PolicySection>

      <PolicySection title="7. Contact">
        <p>{contactBlock()}</p>
      </PolicySection>
    </PolicyLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";
import { DELIVERY_ESTIMATES, LEGAL_LAST_UPDATED, NO_FRAUD_CLAUSE, contactBlock } from "@/lib/legal-copy";

export const Route = createFileRoute("/shipping")({ component: ShippingPage });

function ShippingPage() {
  return (
    <PolicyLayout
      title="Shipping & Delivery Policy"
      subtitle="Coverage, charges, and honest delivery timelines for India."
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <PolicySection title="1. Delivery Coverage">
        <p>
          {STORE.name} ships to serviceable pin codes across India through courier partners. Remote, restricted, or
          non-serviceable areas may be cancelled with a full refund.
        </p>
      </PolicySection>

      <PolicySection title="2. Shipping Charges">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Free shipping</strong> on orders above ₹{STORE.freeShippingMin} (where offered at checkout)</li>
          <li><strong>Standard shipping:</strong> ₹{STORE.standardShippingFee} for orders below ₹{STORE.freeShippingMin}</li>
          <li>Final shipping fee is shown at checkout before payment — no hidden charges after payment</li>
        </ul>
      </PolicySection>

      <PolicySection title="3. Delivery Timelines — Estimates Only">
        <p className="font-semibold text-foreground">
          We do <strong>not</strong> guarantee delivery by a specific date unless explicitly stated in a signed written offer.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Processing:</strong> {DELIVERY_ESTIMATES.processingDays} after payment confirmation</li>
          <li><strong>Supplier fulfilment (dropship):</strong> {DELIVERY_ESTIMATES.fulfillmentDays}</li>
          <li><strong>Courier transit in India:</strong> {DELIVERY_ESTIMATES.courierDays} after dispatch</li>
          <li><strong>Typical total:</strong> {DELIVERY_ESTIMATES.totalTypical}</li>
          <li><strong>Remote areas:</strong> {DELIVERY_ESTIMATES.remoteTypical}</li>
        </ul>
        <p className="mt-2">{DELIVERY_ESTIMATES.extendedNote}</p>
        <p className="mt-2">{NO_FRAUD_CLAUSE}</p>
        <p className="mt-2">
          Full dropshipping details:{" "}
          <Link to="/fulfillment" className="text-primary">Fulfillment & Dropshipping Policy</Link>
        </p>
      </PolicySection>

      <PolicySection title="4. Order Tracking">
        <p>
          Tracking is shared by email and in{" "}
          <Link to="/orders" className="text-primary">My Orders</Link> when the supplier/courier generates it.
          Tracking may update late — contact us if no update after {DELIVERY_ESTIMATES.totalTypical}.
        </p>
      </PolicySection>

      <PolicySection title="5. Cash on Delivery (COD)">
        <p>
          {STORE.codAvailable
            ? "COD is available on eligible orders at checkout. Refusal without valid reason may restrict future COD. COD orders follow the same estimated delivery windows."
            : "COD is currently not offered. Online prepayment via Razorpay is required."}
        </p>
      </PolicySection>

      <PolicySection title="6. Address & Failed Delivery">
        <p>
          You are responsible for accurate shipping details. Failed delivery due to wrong address, repeated unavailability,
          or refusal may forfeit free return shipping. Re-delivery charges may apply.
        </p>
      </PolicySection>

      <PolicySection title="7. Force Majeure">
        <p>
          Delays caused by natural disasters, strikes, pandemics, government orders, or courier shutdowns are outside our control.
          We will communicate delays and offer refund/cancellation where fulfilment is impossible.
        </p>
      </PolicySection>

      <PolicySection title="8. Contact">
        <p>{contactBlock()}</p>
      </PolicySection>
    </PolicyLayout>
  );
}

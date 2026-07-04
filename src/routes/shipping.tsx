import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";

export const Route = createFileRoute("/shipping")({ component: ShippingPage });

function ShippingPage() {
  return (
    <PolicyLayout
      title="Shipping & Delivery Policy"
      subtitle="How we deliver your orders across India."
      lastUpdated="July 4, 2026"
    >
      <PolicySection title="1. Delivery Coverage">
        <p>
          {STORE.name} delivers to all serviceable pin codes across India through our courier partners including
          Shiprocket. Remote or restricted areas may have extended delivery times.
        </p>
      </PolicySection>
      <PolicySection title="2. Shipping Charges">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Free shipping</strong> on orders above ₹{STORE.freeShippingMin}
          </li>
          <li>
            <strong>Standard shipping:</strong> ₹{STORE.standardShippingFee} for orders below ₹{STORE.freeShippingMin}
          </li>
          <li>Shipping fee is calculated at checkout before payment</li>
        </ul>
      </PolicySection>
      <PolicySection title="3. Delivery Timeline">
        <ul className="list-disc pl-5 space-y-1">
          <li>Orders are processed within 1–2 business days after confirmation</li>
          <li>Estimated delivery: {STORE.deliveryDays} from dispatch</li>
          <li>Delays may occur due to weather, festivals, or courier disruptions — we will notify you via email/SMS</li>
        </ul>
      </PolicySection>
      <PolicySection title="4. Order Tracking">
        <p>
          Once shipped, you will receive a tracking ID via email and can track your order at{" "}
          <a href="/orders" className="text-primary">My Orders</a> after signing in to your account.
        </p>
      </PolicySection>
      <PolicySection title="5. Cash on Delivery (COD)">
        <p>
          COD is available on eligible orders. Please keep exact change ready. If you refuse delivery without valid
          reason, your account may be restricted from future COD orders.
        </p>
      </PolicySection>
      <PolicySection title="6. Incorrect Address">
        <p>
          Please ensure your shipping address is accurate. {STORE.name} is not responsible for failed delivery due to
          incorrect or incomplete addresses provided by the customer. Re-shipping charges may apply.
        </p>
      </PolicySection>
      <PolicySection title="7. Contact">
        <p>
          Shipping queries: {STORE.email} · {STORE.phone}
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}

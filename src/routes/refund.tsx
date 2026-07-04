import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";

export const Route = createFileRoute("/refund")({ component: RefundPage });

function RefundPage() {
  return (
    <PolicyLayout
      title="Refund & Cancellation Policy"
      subtitle="Our policy on order cancellations, returns, and refunds."
      lastUpdated="July 4, 2026"
    >
      <PolicySection title="1. Overview">
        <p>
          At {STORE.name}, customer satisfaction is important to us. This policy outlines when you can cancel an order,
          request a return, or receive a refund. Please read carefully before purchasing.
        </p>
      </PolicySection>
      <PolicySection title="2. Order Cancellation">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Before dispatch:</strong> You may cancel your order by contacting {STORE.email} with your order
            number. Full refund will be processed within 5–7 business days for prepaid orders.
          </li>
          <li>
            <strong>After dispatch:</strong> Cancellation is not possible once the order has been shipped. You may
            refuse delivery, but return shipping costs may be deducted from your refund.
          </li>
          <li>COD orders cancelled before dispatch incur no charge.</li>
        </ul>
      </PolicySection>
      <PolicySection title="3. Return Eligibility">
        <p>Returns are accepted only in the following cases:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Product received is damaged or defective (report within 48 hours with photos)</li>
          <li>Wrong product delivered (report within 48 hours of delivery)</li>
          <li>Product is unused, in original packaging with all accessories and tags intact</li>
        </ul>
        <p className="mt-2">
          <strong>Non-returnable items:</strong> Opened earphones/headphones (hygiene), software licenses, personalized
          items, and products marked as non-returnable on the product page.
        </p>
      </PolicySection>
      <PolicySection title="4. Return Process">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Email {STORE.email} with order number, reason, and photos (if damaged/defective)</li>
          <li>Our team will approve or reject within 2 business days</li>
          <li>On approval, arrange pickup or ship to our return address (details provided via email)</li>
          <li>Inspection within 3 business days of receiving the return</li>
        </ol>
      </PolicySection>
      <PolicySection title="5. Refund Timeline">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Prepaid (Razorpay):</strong> Refund to original payment method within 5–7 business days after inspection</li>
          <li><strong>COD:</strong> Refund via bank transfer (NEFT/UPI) within 7–10 business days; bank details required</li>
          <li>Shipping charges are non-refundable unless the return is due to our error</li>
        </ul>
      </PolicySection>
      <PolicySection title="6. No-Refund Cases">
        <ul className="list-disc pl-5 space-y-1">
          <li>Change of mind after opening sealed electronic products</li>
          <li>Physical damage caused by customer misuse</li>
          <li>Products returned after 7 days of delivery without prior approval</li>
          <li>Missing accessories, box, or original packaging</li>
        </ul>
      </PolicySection>
      <PolicySection title="7. Contact">
        <p>
          Refund & cancellation requests: {STORE.email} · {STORE.phone}<br />
          Include your order number (e.g. GV100001) in all communications.
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}

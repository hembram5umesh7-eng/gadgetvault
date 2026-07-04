import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";

export const Route = createFileRoute("/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <PolicyLayout
      title="Terms & Conditions"
      subtitle="Please read these terms carefully before using our website or placing an order."
      lastUpdated="July 4, 2026"
    >
      <PolicySection title="1. Acceptance of Terms">
        <p>
          By accessing {STORE.name} or placing an order, you agree to these Terms & Conditions, our Privacy Policy,
          Refund & Cancellation Policy, and Shipping Policy. If you do not agree, please do not use our services.
        </p>
      </PolicySection>
      <PolicySection title="2. Eligibility">
        <p>
          You must be at least 18 years of age and capable of entering into a legally binding contract under Indian
          law to use this platform and make purchases.
        </p>
      </PolicySection>
      <PolicySection title="3. Products & Pricing">
        <ul className="list-disc pl-5 space-y-1">
          <li>All prices are listed in Indian Rupees (INR) and include applicable GST unless stated otherwise</li>
          <li>Product images are for illustration; minor colour/variant differences may occur</li>
          <li>We reserve the right to modify prices without prior notice; confirmed order prices are honoured</li>
          <li>We may limit order quantities to prevent reselling or stock hoarding</li>
        </ul>
      </PolicySection>
      <PolicySection title="4. Orders & Payment">
        <p>
          An order is confirmed only after successful payment (online via Razorpay) or COD order acceptance.
          We accept Cash on Delivery (COD) and online payments via UPI, credit/debit cards, netbanking, and wallets
          through Razorpay. Failed or cancelled payments will not be processed.
        </p>
      </PolicySection>
      <PolicySection title="5. Shipping & Delivery">
        <p>
          Delivery timelines and shipping charges are described in our{" "}
          <Link to="/shipping" className="text-primary">Shipping & Delivery Policy</Link>. Risk of loss passes to you
          upon delivery to the address provided.
        </p>
      </PolicySection>
      <PolicySection title="6. Returns & Refunds">
        <p>
          Our return, refund, and cancellation terms are detailed in the{" "}
          <Link to="/refund" className="text-primary">Refund & Cancellation Policy</Link>. Please review it before purchase.
        </p>
      </PolicySection>
      <PolicySection title="7. Intellectual Property">
        <p>
          All content on this website — including logos, text, images, and design — is owned by {STORE.legalName} and
          protected under applicable copyright and trademark laws.
        </p>
      </PolicySection>
      <PolicySection title="8. Limitation of Liability">
        <p>
          {STORE.name} shall not be liable for indirect, incidental, or consequential damages arising from use of our
          platform. Our maximum liability for any order is limited to the amount paid for that order.
        </p>
      </PolicySection>
      <PolicySection title="9. Governing Law">
        <p>
          These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of
          courts in Gautam Buddha Nagar, Uttar Pradesh.
        </p>
      </PolicySection>
      <PolicySection title="10. Contact">
        <p>
          {STORE.legalName} · {STORE.email} · {STORE.phone}
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}

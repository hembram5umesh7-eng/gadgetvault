import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE, fullAddress, hasGstin, hasPhone } from "@/lib/store-info";

export const Route = createFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  return (
    <PolicyLayout
      title="About Us"
      subtitle={`Learn about ${STORE.name} — who we are and what we stand for.`}
      lastUpdated="July 4, 2026"
    >
      <PolicySection title="Our Story">
        <p>
          {STORE.name} curates kitchen accessories, unique gadgets, and daily essentials for shoppers across India.
          We list products from trusted suppliers, show clear pricing at checkout, and fulfil orders with secure
          Razorpay payments.
        </p>
      </PolicySection>
      <PolicySection title="What We Sell">
        <p>
          Our catalog focuses on three categories: Kitchen Accessories, Unique Gadgets, and Necessities.
          Product details, images, and specifications come from the supplier listing shown on each product page.
        </p>
      </PolicySection>
      <PolicySection title="Our Values">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Honest Listings</strong> — We show supplier-provided product information without fake reviews or ratings</li>
          <li><strong>Transparent Pricing</strong> — Prices include applicable taxes; shipping rules are stated at checkout</li>
          <li><strong>Secure Payments</strong> — Razorpay-powered checkout with UPI, cards, netbanking & wallets</li>
          <li><strong>Reliable Delivery</strong> — Pan-India shipping via courier partners</li>
        </ul>
      </PolicySection>
      <PolicySection title="Registered Business">
        <p>
          <strong>{STORE.legalName}</strong><br />
          {fullAddress() && (<>{fullAddress()}<br /></>)}
          Email: {STORE.email}<br />
          {hasPhone() && <>Phone: {STORE.phone}<br /></>}
          {hasGstin() && <>GSTIN: {STORE.gstin}</>}
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}

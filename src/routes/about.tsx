import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE, fullAddress } from "@/lib/store-info";

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
          {STORE.name} was founded with a simple mission: make premium gadgets and accessories accessible to every Indian
          at honest prices. We curate tech products from trusted suppliers, verify quality, and deliver them to your
          doorstep with secure online payments powered by Razorpay.
        </p>
      </PolicySection>
      <PolicySection title="What We Sell">
        <p>
          We offer a wide range of consumer electronics and accessories including wireless earbuds, smartwatches,
          fast chargers, power banks, phone cases, USB hubs, and more — all sourced from verified manufacturers.
        </p>
      </PolicySection>
      <PolicySection title="Our Values">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Genuine Products</strong> — 100% authentic items from authorized suppliers</li>
          <li><strong>Transparent Pricing</strong> — All prices include applicable taxes; no hidden charges at checkout</li>
          <li><strong>Secure Payments</strong> — Razorpay-powered checkout with UPI, cards, netbanking & wallets</li>
          <li><strong>Fast Delivery</strong> — Pan-India shipping via trusted courier partners</li>
        </ul>
      </PolicySection>
      <PolicySection title="Registered Business">
        <p>
          <strong>{STORE.legalName}</strong><br />
          {fullAddress()}<br />
          Email: {STORE.email}<br />
          Phone: {STORE.phone}<br />
          GSTIN: {STORE.gstin}
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}

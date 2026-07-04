import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";

export const Route = createFileRoute("/faq")({ component: FaqPage });

function FaqPage() {
  return (
    <PolicyLayout
      title="Frequently Asked Questions"
      subtitle="Quick answers about orders, payments, delivery, and warranty."
      lastUpdated="July 4, 2026"
    >
      <PolicySection title="Orders & Delivery">
        <p><strong>How do I track my order?</strong><br />Sign in and visit <Link to="/orders" className="text-primary">My Orders</Link>. You will receive tracking details once the order is shipped.</p>
        <p><strong>What are delivery charges?</strong><br />Free shipping on orders above ₹{STORE.freeShippingMin}. Standard shipping is ₹{STORE.standardShippingFee} for smaller orders.</p>
        <p><strong>Do you deliver across India?</strong><br />Yes, we deliver to all serviceable pin codes in India via trusted courier partners.</p>
      </PolicySection>
      <PolicySection title="Payments">
        <p><strong>Is online payment secure?</strong><br />Yes. All online payments are processed through Razorpay, a PCI-DSS compliant payment gateway. We never store your card or UPI details.</p>
        <p><strong>Can I pay on delivery?</strong><br />COD is available on eligible orders. Pay in cash when your package arrives.</p>
        <p><strong>Is EMI available?</strong><br />No Cost EMI may be available on select products at checkout through Razorpay partner banks, subject to eligibility.</p>
      </PolicySection>
      <PolicySection title="Warranty & Returns">
        <p><strong>Do products come with warranty?</strong><br />Most electronics include 6–24 months manufacturer warranty. See product page or our <Link to="/warranty" className="text-primary">Warranty Policy</Link>.</p>
        <p><strong>Can I return a product?</strong><br />Returns are accepted for defective, damaged, or wrong items. See <Link to="/refund" className="text-primary">Refund Policy</Link>.</p>
      </PolicySection>
      <PolicySection title="Still need help?">
        <p>Email {STORE.email} or call {STORE.phone}. Support hours: {STORE.hours}.</p>
      </PolicySection>
    </PolicyLayout>
  );
}

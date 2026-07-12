import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";
import { LEGAL_LAST_UPDATED, contactBlock } from "@/lib/legal-copy";

export const Route = createFileRoute("/grievance")({ component: GrievancePage });

function GrievancePage() {
  return (
    <PolicyLayout
      title="Grievance Redressal"
      subtitle="How to raise complaints about orders, payments, delivery, or data privacy."
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <PolicySection title="1. Grievance Officer">
        <p>
          In accordance with the Information Technology Act, 2000 and applicable consumer protection rules, the Grievance Officer
          for {STORE.legalName} is reachable at:
        </p>
        <p className="mt-2 font-medium text-foreground">{contactBlock()}</p>
      </PolicySection>

      <PolicySection title="2. How to File a Complaint">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Email {STORE.email} with subject line: <strong>GRIEVANCE — [Order Number]</strong></li>
          <li>Include your full name, registered email/phone, order number, and a clear description of the issue</li>
          <li>Attach photos/videos for damaged or wrong-item claims within 48 hours of delivery</li>
        </ol>
      </PolicySection>

      <PolicySection title="3. Response Timeline">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Acknowledgement:</strong> within 2 business days</li>
          <li><strong>Initial response / resolution plan:</strong> within 7 business days</li>
          <li><strong>Complex cases</strong> (supplier investigation, courier trace): up to 15 business days with status updates</li>
        </ul>
      </PolicySection>

      <PolicySection title="4. Common Issues">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Delayed delivery:</strong> See <Link to="/fulfillment" className="text-primary">Fulfillment Policy</Link> — delays within stated estimates are not automatic grounds for fraud claims</li>
          <li><strong>Refund requests:</strong> See <Link to="/refund" className="text-primary">Refund Policy</Link></li>
          <li><strong>Payment disputes:</strong> Contact us first; chargebacks without contacting us may delay resolution</li>
          <li><strong>Privacy concerns:</strong> See <Link to="/privacy" className="text-primary">Privacy Policy</Link></li>
        </ul>
      </PolicySection>

      <PolicySection title="5. Escalation">
        <p>
          If you are not satisfied with our response, you may approach the appropriate consumer forum under the Consumer Protection
          Act, 2019, or other remedies available under Indian law. We prefer to resolve issues directly and in good faith.
        </p>
      </PolicySection>

      <PolicySection title="6. Good-Faith Commitment">
        <p>
          {STORE.name} does not engage in fraudulent sales practices. If we cannot fulfil an order, we will refund or offer alternatives.
          Filing false police complaints or defamatory claims without attempting resolution through this channel may be pursued under
          applicable law.
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}

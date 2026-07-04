import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE } from "@/lib/store-info";

export const Route = createFileRoute("/warranty")({ component: WarrantyPage });

function WarrantyPage() {
  return (
    <PolicyLayout
      title="Warranty Policy"
      subtitle="Manufacturer warranty coverage for electronics purchased on GadgetVault."
      lastUpdated="July 4, 2026"
    >
      <PolicySection title="1. Warranty Coverage">
        <p>
          Most gadgets sold on {STORE.name} include manufacturer warranty ranging from 3 to 24 months depending on the
          product category. Warranty duration is shown on each product page.
        </p>
      </PolicySection>
      <PolicySection title="2. What Is Covered">
        <ul className="list-disc pl-5 space-y-1">
          <li>Manufacturing defects in materials and workmanship</li>
          <li>Dead-on-arrival (DOA) units — report within 48 hours</li>
          <li>Battery performance issues within warranty period (as per brand policy)</li>
        </ul>
      </PolicySection>
      <PolicySection title="3. What Is Not Covered">
        <ul className="list-disc pl-5 space-y-1">
          <li>Physical damage, water damage, or misuse</li>
          <li>Normal wear and tear (scratches, battery degradation after stated cycles)</li>
          <li>Unauthorized repairs or modifications</li>
          <li>Accessories unless explicitly stated</li>
        </ul>
      </PolicySection>
      <PolicySection title="4. How to Claim Warranty">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Email {STORE.email} with order number, product name, and issue description</li>
          <li>Attach photos/videos demonstrating the defect</li>
          <li>Our team will guide you to brand service centre or arrange pickup where applicable</li>
          <li>Repair or replacement is at manufacturer discretion</li>
        </ol>
      </PolicySection>
      <PolicySection title="5. Contact">
        <p>Warranty support: {STORE.email} · {STORE.phone}</p>
      </PolicySection>
    </PolicyLayout>
  );
}

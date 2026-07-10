import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { STORE, fullAddress, hasGstin, hasPhone } from "@/lib/store-info";
import { Sms, Call, Location, Clock } from "iconsax-react";

export const Route = createFileRoute("/contact")({ component: ContactPage });

function ContactPage() {
  const cards = [
    { icon: Sms, label: "Email", value: STORE.email, href: `mailto:${STORE.email}` },
    hasPhone()
      ? { icon: Call, label: "Phone", value: STORE.phone, href: `tel:${String(STORE.phone).replace(/\s/g, "")}` }
      : null,
    fullAddress()
      ? { icon: Location, label: "Address", value: fullAddress()!, href: undefined }
      : null,
    { icon: Clock, label: "Support Hours", value: STORE.hours, href: undefined },
  ].filter(Boolean) as { icon: typeof Sms; label: string; value: string; href?: string }[];

  return (
    <PolicyLayout
      title="Contact Us"
      subtitle="We're here to help with orders, payments, and product queries."
      lastUpdated="July 4, 2026"
    >
      <div className="grid sm:grid-cols-2 gap-4 mb-8 not-prose">
        {cards.map((c) => (
          <div key={c.label} className="flex gap-3 p-4 rounded-xl bg-muted/50 border">
            <c.icon size={22} className="text-primary shrink-0 mt-0.5" variant="Bold" />
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{c.label}</p>
              {c.href ? (
                <a href={c.href} className="text-sm font-semibold hover:text-primary">{c.value}</a>
              ) : (
                <p className="text-sm font-semibold">{c.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <PolicySection title="Order & Payment Support">
        <p>
          For order status, payment issues, or delivery queries, email us at{" "}
          <a href={`mailto:${STORE.email}`} className="text-primary font-medium">{STORE.email}</a> with your order
          number. We aim to respond within 24 business hours on working days.
        </p>
      </PolicySection>
      <PolicySection title="Business Enquiries">
        <p>
          For bulk orders, supplier partnerships, or media enquiries, contact{" "}
          <a href={`mailto:${STORE.email}`} className="text-primary font-medium">{STORE.email}</a> with the subject line
          &quot;Business Enquiry&quot;.
        </p>
      </PolicySection>
      {(fullAddress() || hasGstin()) && (
        <PolicySection title="Registered Office">
          <p>
            {STORE.legalName}<br />
            {fullAddress() && (<>{fullAddress()}<br /></>)}
            {hasGstin() && <>GSTIN: {STORE.gstin}</>}
          </p>
        </PolicySection>
      )}
    </PolicyLayout>
  );
}

import { Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ImmersiveReveal } from "@/components/animations/immersive-reveal";
import { POLICY_LINKS, STORE, fullAddress, hasGstin, hasPhone } from "@/lib/store-info";
import { ArrowLeft2 } from "iconsax-react";

interface PolicyLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function PolicyLayout({ title, subtitle, lastUpdated, children }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b bg-gradient-hero text-white">
          <div className="container mx-auto px-4 py-10 md:py-14">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-4">
              <ArrowLeft2 size={16} /> Back to store
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-white/85 max-w-2xl">{subtitle}</p>}
            {lastUpdated && (
              <p className="mt-3 text-xs text-white/60 uppercase tracking-wider">Last updated: {lastUpdated}</p>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-10 grid lg:grid-cols-[1fr_280px] gap-10">
          <ImmersiveReveal>
            <article className="premium-card p-6 md:p-10 prose-policy">{children}</article>
          </ImmersiveReveal>

          <aside className="space-y-4 h-fit lg:sticky lg:top-24">
            <div className="premium-card p-5">
              <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Legal Pages</h3>
              <ul className="space-y-2 text-sm">
                {POLICY_LINKS.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-foreground/80 hover:text-primary transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="premium-card p-5 text-sm">
              <h3 className="font-bold mb-2">{STORE.legalName}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {STORE.email}
                {hasPhone() && (<><br />{STORE.phone}</>)}
                {hasGstin() && (<><br />GSTIN: {STORE.gstin}</>)}
                {fullAddress() && (<><br />{fullAddress()}</>)}
              </p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="text-lg font-bold mb-3 text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

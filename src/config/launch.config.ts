import { Cpu, ShieldCheck, Sparkles, Truck } from "lucide-react";
import type { LaunchTemplateConfig } from "@launch-template/types/launch-template-config";

/** GadgetVault — cinematic launch countdown branding */
export const gadgetVaultLaunchConfig: LaunchTemplateConfig = {
  brandName: "GadgetVault",
  eyebrow: "Premium Gadgets & Accessories",
  footerTagline: "Kitchen · Gadgets · Essentials",
  comingSoonLabel: "Coming Soon",
  countdownTitle: "Launch Countdown",
  featuresSectionTitle: "Why GadgetVault?",
  featuresSectionSubtitle:
    "Curated kitchen accessories, unique gadgets, and daily essentials — secure checkout and pan-India delivery.",
  accentClassName: "text-brand-olive-light",
  sessionRevealKey: "gadgetvault_launch_reveal_seen",
  photos: [
    {
      src: "https://images.unsplash.com/photo-1556911223-bff03130eb78?w=640&q=80",
      alt: "Kitchen accessories",
      label: "Kitchen",
    },
    {
      src: "https://images.unsplash.com/photo-1585819409453-0e95a44c0d34?w=640&q=80",
      alt: "Unique gadgets",
      label: "Gadgets",
    },
    {
      src: "https://images.unsplash.com/photo-1585771724684-e3823f9ee8ef?w=640&q=80",
      alt: "Daily essentials",
      label: "Essentials",
    },
    {
      src: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=640&q=80",
      alt: "Tech lifestyle",
      label: "Tech Life",
    },
  ],
  features: [
    { icon: Cpu, title: "Curated Catalog", desc: "Kitchen, gadgets & necessities in one store" },
    { icon: ShieldCheck, title: "Secure Checkout", desc: "Razorpay · UPI · Cards · COD" },
    { icon: Truck, title: "Pan-India Delivery", desc: "Ships across India after order confirm" },
    { icon: Sparkles, title: "CJ Fulfillment", desc: "Products sourced & fulfilled via trusted suppliers" },
  ],
  infoCards: [
    {
      title: "What is GadgetVault?",
      body: "An online store for kitchen accessories, unique gadgets, and daily essentials — with transparent pricing and secure payments.",
    },
    {
      title: "Who is it for?",
      body: "Shoppers across India looking for useful products at honest prices — from home organizers to smart everyday tools.",
    },
  ],
  reveal: {
    badge: "We're Live",
    lines: ["Great tools don't shout.", "They quietly make life better."],
    body: "We've been preparing this store — not for hype, but to bring you gadgets and essentials you can actually use. Today, GadgetVault opens its doors.",
    closer: "Welcome to GadgetVault. Shop smart. Live easy.",
    ctaLabel: "Enter GadgetVault",
    ctaSubtext: "Opening the store for you…",
    voice: {
      enabled: true,
      useTts: true,
      pitch: 0.85,
      rate: 0.92,
    },
  },
};

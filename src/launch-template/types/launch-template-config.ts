import type { LucideIcon } from "lucide-react";

export type LaunchPhoto = {
  src: string;
  alt: string;
  label: string;
};

export type LaunchFeature = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export type LaunchInfoCard = {
  title: string;
  body: string;
};

export type LaunchRevealVoice = {
  /** Default true — bold narrator on reveal */
  enabled?: boolean;
  /** Pre-recorded MP3 (overrides TTS). Use a deep, bold voice recording. */
  audioUrl?: string;
  /** Browser TTS fallback when no audioUrl. Default true. */
  useTts?: boolean;
  /** TTS-optimized single narration (natural flow, no repeated chunks) */
  narrationScript?: string;
  lang?: string;
  /** 1.0 = natural human. Default 1 */
  pitch?: number;
  /** ~1.0 = confident natural pace. Default 0.97 */
  rate?: number;
  ambientUrl?: string;
  ambientVolume?: number;
};

export type LaunchRevealCopy = {
  badge: string;
  lines: string[];
  body: string;
  closer: string;
  ctaLabel: string;
  ctaSubtext: string;
  voice?: LaunchRevealVoice;
};

/** Brand + content config — copy `examples/threadart.config.ts` per project */
export type LaunchTemplateConfig = {
  brandName: string;
  eyebrow: string;
  footerTagline: string;
  comingSoonLabel: string;
  countdownTitle: string;
  featuresSectionTitle: string;
  featuresSectionSubtitle: string;
  accentClassName?: string;
  photos: LaunchPhoto[];
  features: LaunchFeature[];
  infoCards: [LaunchInfoCard, LaunchInfoCard];
  reveal: LaunchRevealCopy;
  sessionRevealKey?: string;
};

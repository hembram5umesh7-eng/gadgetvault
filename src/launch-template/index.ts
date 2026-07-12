// Launch Countdown Template — public exports

export { LaunchGate } from "./components/LaunchGate";
export type { LaunchGateProps, LaunchGateMode } from "./components/LaunchGate";

export { LaunchCountdownPage } from "./components/LaunchCountdownPage";
export { LaunchRevealMessage } from "./components/LaunchRevealMessage";
export { CinematicLaunchHero } from "./components/CinematicLaunchHero";
export { AdminLaunchPanel } from "./components/AdminLaunchPanel";
export type { AdminLaunchPanelProps } from "./components/AdminLaunchPanel";

export {
  parseLaunchSettings,
  shouldShowLaunchCountdown,
  launchCountdownStatus,
  isoToDatetimeLocal,
  datetimeLocalToIso,
  DEFAULT_LAUNCH_SETTINGS,
  LAUNCH_SETTINGS_KEY,
} from "./lib/launch-settings";
export type { LaunchCountdownSettings } from "./lib/launch-settings";

export { calcTimeLeft, formatLaunchDate, padCountdown } from "./lib/launch-countdown";
export { cn } from "./lib/cn";
export {
  bindLaunchAudioUnlock,
  unlockLaunchAudio,
  isLaunchAudioUnlocked,
  primeRevealSpeech,
  isSpeechPrimed,
  prepareRevealAudio,
} from "./lib/launch-audio-unlock";
export {
  createRevealVoiceController,
  estimateRevealVoiceDurationMs,
  preloadRevealVoice,
} from "./lib/reveal-voice";
export type { RevealVoiceController } from "./lib/reveal-voice";
export { CINEMATIC_LAUNCH_STYLES } from "./styles/cinematic-launch-styles";

export type {
  LaunchTemplateConfig,
  LaunchPhoto,
  LaunchFeature,
  LaunchInfoCard,
  LaunchRevealCopy,
  LaunchRevealVoice,
} from "./types/launch-template-config";

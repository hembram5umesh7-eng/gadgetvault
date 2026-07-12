import type { LaunchRevealCopy, LaunchRevealVoice } from "../types/launch-template-config";

const VOICE_SCORE = (v: SpeechSynthesisVoice): number => {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural|neural|premium|enhanced|online/.test(n)) s += 150;
  if (!v.localService) s += 70;
  if (/microsoft.*ryan|microsoft.*guy|microsoft.*davis|microsoft.*tony/.test(n)) s += 55;
  if (/google.*journey|google.*studio|google.*news/.test(n)) s += 50;
  if (/microsoft|google/.test(n)) s += 30;
  if (/christopher|jason|eric|andrew|brian/.test(n)) s += 35;
  if (/david|james|daniel|mark|george|aaron/.test(n)) s += 22;
  if (/male/.test(n)) s += 15;
  if (/female|zira|susan|samantha|jenny|aria|sonia|hazel|linda/.test(n)) s -= 100;
  if (v.lang.startsWith("en-US")) s += 20;
  if (v.lang.startsWith("en")) s += 10;
  return s;
};

let cachedVoice: SpeechSynthesisVoice | null = null;
let cachedLang = "en-US";

export type RevealVoiceController = {
  start: () => void;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
};

/** Call on countdown page — loads voices before reveal so zero delay */
export function preloadRevealVoice(lang = "en-US"): void {
  if (typeof speechSynthesis === "undefined") return;
  cachedLang = lang;
  speechSynthesis.getVoices();
  const picked = pickNaturalBoldVoice(lang);
  if (picked) cachedVoice = picked;

  const onChange = () => {
    speechSynthesis.removeEventListener("voiceschanged", onChange);
    cachedVoice = pickNaturalBoldVoice(lang);
  };
  speechSynthesis.addEventListener("voiceschanged", onChange);
}

function pickNaturalBoldVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  const langPrefix = lang.split("-")[0];
  const pool = voices.filter((v) => v.lang.startsWith(langPrefix) || v.lang.startsWith("en"));
  const ranked = [...pool].sort((a, b) => VOICE_SCORE(b) - VOICE_SCORE(a));
  return ranked[0] ?? voices[0] ?? null;
}

async function resolveVoiceFast(lang: string): Promise<SpeechSynthesisVoice | null> {
  if (cachedVoice && cachedLang === lang) return cachedVoice;
  preloadRevealVoice(lang);
  const instant = pickNaturalBoldVoice(lang);
  if (instant) {
    cachedVoice = instant;
    return instant;
  }
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    const v = pickNaturalBoldVoice(lang);
    if (v) {
      cachedVoice = v;
      return v;
    }
  }
  return null;
}

function buildNarrationScript(reveal: LaunchRevealCopy): string {
  if (reveal.voice?.narrationScript?.trim()) {
    return reveal.voice.narrationScript.trim();
  }
  const hook = reveal.lines.join(" ");
  const body = reveal.body.replace(/—/g, ",").replace(/\s+/g, " ").trim();
  return `${hook} ${body} ${reveal.closer}`.replace(/\s+/g, " ").trim();
}

async function flushSpeechQueue(): Promise<void> {
  if (typeof speechSynthesis === "undefined") return;
  if (!speechSynthesis.speaking && !speechSynthesis.pending) return;
  speechSynthesis.cancel();
  await new Promise((r) => requestAnimationFrame(r));
}

function speakOnce(
  text: string,
  voice: SpeechSynthesisVoice | null,
  opts: { lang: string; pitch: number; rate: number },
): Promise<void> {
  return new Promise((resolve) => {
    if (!text.trim() || typeof speechSynthesis === "undefined") {
      resolve();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? opts.lang;
    u.pitch = opts.pitch;
    u.rate = opts.rate;
    u.volume = 1;
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

export function estimateRevealVoiceDurationMs(reveal: LaunchRevealCopy): number {
  const script = buildNarrationScript(reveal);
  const rate = reveal.voice?.rate ?? 0.97;
  return Math.min(50000, Math.max(16000, Math.ceil(script.length * (0.05 / rate) * 1000) + 3000));
}

export function createRevealVoiceController(
  reveal: LaunchRevealCopy,
  voiceConfig?: LaunchRevealVoice,
): RevealVoiceController {
  const cfg: LaunchRevealVoice = {
    enabled: true,
    useTts: true,
    lang: "en-US",
    pitch: 1,
    rate: 0.97,
    ambientVolume: 0.12,
    ...voiceConfig,
  };

  let muted = false;
  let stopped = true;
  let playing = false;
  let session = 0;
  let ambientEl: HTMLAudioElement | null = null;
  let voiceEl: HTMLAudioElement | null = null;

  const stop = () => {
    session += 1;
    stopped = true;
    playing = false;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    if (ambientEl) {
      ambientEl.pause();
      ambientEl = null;
    }
    if (voiceEl) {
      voiceEl.pause();
      voiceEl.currentTime = 0;
      voiceEl = null;
    }
  };

  const playAmbient = () => {
    if (!cfg.ambientUrl || muted || stopped) return;
    ambientEl = new Audio(cfg.ambientUrl);
    ambientEl.loop = true;
    ambientEl.volume = cfg.ambientVolume ?? 0.12;
    void ambientEl.play().catch(() => {});
  };

  const playMp3 = () => {
    if (!cfg.audioUrl || muted || stopped) return;
    voiceEl = new Audio(cfg.audioUrl);
    voiceEl.volume = 1;
    voiceEl.onended = () => {
      playing = false;
    };
    void voiceEl.play().catch(() => {
      playing = false;
    });
  };

  const playTts = async (mySession: number) => {
    if (!cfg.useTts || cfg.audioUrl || muted || stopped || typeof speechSynthesis === "undefined") return;

    const lang = cfg.lang ?? "en-US";
    const voice = await resolveVoiceFast(lang);
    if (mySession !== session || muted || stopped) return;

    await flushSpeechQueue();
    if (mySession !== session || muted || stopped) return;

    await speakOnce(buildNarrationScript(reveal), voice, {
      lang,
      pitch: cfg.pitch ?? 1,
      rate: cfg.rate ?? 0.97,
    });
    if (mySession === session) playing = false;
  };

  const start = () => {
    if (cfg.enabled === false || muted || playing) return;
    session += 1;
    stopped = false;
    playing = true;
    const mySession = session;

    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();

    playAmbient();
    if (cfg.audioUrl) {
      playMp3();
      return;
    }
    void playTts(mySession);
  };

  const setMuted = (m: boolean) => {
    if (muted === m) return;
    muted = m;
    if (muted) stop();
    else {
      stopped = false;
      start();
    }
  };

  return { start, stop, setMuted, isMuted: () => muted };
}

const UNLOCK_KEY = "launch_audio_unlocked";
const SPEECH_PRIMED_KEY = "launch_speech_primed";

let unlocked = false;
let speechPrimed = false;
let audioCtx: AudioContext | null = null;

export function unlockLaunchAudio(): boolean {
  if (typeof window === "undefined") return false;

  try {
    if (sessionStorage.getItem(UNLOCK_KEY) === "1") unlocked = true;
  } catch {
    /* ignore */
  }

  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();

    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);

    unlocked = true;
    try {
      sessionStorage.setItem(UNLOCK_KEY, "1");
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return unlocked;
  }
}

export function primeRevealSpeech(): boolean {
  if (typeof speechSynthesis === "undefined") return false;
  if (speechPrimed) return true;

  try {
    speechSynthesis.getVoices();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0.01;
    u.rate = 2;
    speechSynthesis.speak(u);
    speechPrimed = true;
    try {
      sessionStorage.setItem(SPEECH_PRIMED_KEY, "1");
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

export function isLaunchAudioUnlocked(): boolean {
  if (unlocked) return true;
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(UNLOCK_KEY) === "1") {
      unlocked = true;
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function isSpeechPrimed(): boolean {
  if (speechPrimed) return true;
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(SPEECH_PRIMED_KEY) === "1") {
      speechPrimed = true;
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function prepareRevealAudio(): void {
  unlockLaunchAudio();
  if (isSpeechPrimed() && typeof speechSynthesis !== "undefined") {
    speechSynthesis.getVoices();
  }
}

const GESTURE_EVENTS = ["click", "touchstart", "pointerdown", "keydown"] as const;
const PASSIVE_EVENTS = ["scroll", "wheel", "mousemove", "touchmove"] as const;

export function bindLaunchAudioUnlock(onReady?: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  onReady?.();

  if (isLaunchAudioUnlocked() && isSpeechPrimed()) return () => {};

  const primeAll = () => {
    unlockLaunchAudio();
    primeRevealSpeech();
    removeAll();
  };

  const removeAll = () => {
    for (const ev of GESTURE_EVENTS) window.removeEventListener(ev, primeAll, true);
    for (const ev of PASSIVE_EVENTS) window.removeEventListener(ev, onPassive, true);
  };

  const onPassive = () => {
    unlockLaunchAudio();
  };

  for (const ev of GESTURE_EVENTS) {
    window.addEventListener(ev, primeAll, { capture: true, passive: true });
  }
  for (const ev of PASSIVE_EVENTS) {
    window.addEventListener(ev, onPassive, { capture: true, passive: true });
  }

  return removeAll;
}

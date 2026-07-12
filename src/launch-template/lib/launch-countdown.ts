export type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

export function calcTimeLeft(launchAt: string): TimeLeft {
  const totalMs = Math.max(0, Date.parse(launchAt) - Date.now());
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);
  return { days, hours, minutes, seconds, totalMs };
}

export function padCountdown(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatLaunchDate(launchAt: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(launchAt));
  } catch {
    return launchAt;
  }
}

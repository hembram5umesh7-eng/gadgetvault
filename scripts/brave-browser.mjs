/** Open URL in Brave browser (Windows). Shared by admin scripts + server functions. */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const BRAVE_PATHS = [
  "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
    : "",
  process.env.BRAVE_BROWSER_PATH ?? "",
].filter(Boolean);

export function braveExecutable() {
  for (const p of BRAVE_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

export function openInBrave(url) {
  const brave = braveExecutable();
  if (!brave) return false;
  try {
    const child = spawn(brave, [url], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

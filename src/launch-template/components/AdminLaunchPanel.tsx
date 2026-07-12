"use client";

import { useState, type ComponentType, type InputHTMLAttributes, type ButtonHTMLAttributes } from "react";
import {
  datetimeLocalToIso,
  isoToDatetimeLocal,
  launchCountdownStatus,
  shouldShowLaunchCountdown,
  type LaunchCountdownSettings,
} from "../lib/launch-settings";

export type AdminLaunchPanelProps = {
  initialSettings: LaunchCountdownSettings;
  onSave: (settings: LaunchCountdownSettings) => Promise<{ ok: boolean }>;
  previewHref?: string;
  /** Optional shadcn-style components from your app */
  Switch?: ComponentType<{ checked: boolean; onCheckedChange: (v: boolean) => void; id?: string }>;
  Input?: ComponentType<InputHTMLAttributes<HTMLInputElement>>;
  Button?: ComponentType<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }>;
};

export function AdminLaunchPanel({
  initialSettings,
  onSave,
  previewHref = "/",
  Switch: SwitchCmp,
  Input: InputCmp,
  Button: ButtonCmp,
}: AdminLaunchPanelProps) {
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [launchLocal, setLaunchLocal] = useState(isoToDatetimeLocal(initialSettings.launchAt));
  const [headline, setHeadline] = useState(initialSettings.headline);
  const [tagline, setTagline] = useState(initialSettings.tagline);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const status = launchCountdownStatus({
    enabled,
    launchAt: launchLocal ? datetimeLocalToIso(launchLocal) : initialSettings.launchAt,
    headline,
    tagline,
  });

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      await onSave({
        enabled,
        launchAt: datetimeLocalToIso(launchLocal),
        headline: headline.trim(),
        tagline: tagline.trim(),
      });
      setMessage(enabled ? "Saved — countdown active" : "Saved — main site showing");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const input = InputCmp ?? "input";
  const button = ButtonCmp ?? "button";

  return (
    <div className="max-w-2xl space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h2 className="text-xl font-bold">Launch Countdown</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Status: <strong>{status}</strong>
          {shouldShowLaunchCountdown({ enabled, launchAt: datetimeLocalToIso(launchLocal), headline, tagline }) &&
            " — visitors see countdown page"}
        </p>
      </div>

      <label className="flex items-center justify-between gap-4">
        <span className="font-medium">Show countdown on homepage</span>
        {SwitchCmp ? (
          <SwitchCmp id="launch-enabled" checked={enabled} onCheckedChange={setEnabled} />
        ) : (
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        )}
      </label>

      <div>
        <label className="text-sm font-medium">Launch date & time</label>
        {input === "input" ? (
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={launchLocal}
            onChange={(e) => setLaunchLocal(e.target.value)}
          />
        ) : (
          <InputCmp type="datetime-local" className="mt-1" value={launchLocal} onChange={(e) => setLaunchLocal(e.target.value)} />
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Headline</label>
        {input === "input" ? (
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} />
        ) : (
          <InputCmp className="mt-1" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} />
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Tagline</label>
        {input === "input" ? (
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={240} />
        ) : (
          <InputCmp className="mt-1" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={240} />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {button === "button" ? (
          <button type="button" className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save"}
          </button>
        ) : (
          <ButtonCmp disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save"}
          </ButtonCmp>
        )}
        <a href={previewHref} target="_blank" rel="noreferrer" className="rounded-lg border px-4 py-2 text-sm font-semibold">
          Preview homepage
        </a>
      </div>

      {message && <p className="text-sm text-neutral-600 dark:text-neutral-400">{message}</p>}
    </div>
  );
}

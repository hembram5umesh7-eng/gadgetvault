import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLaunchPanel } from "@launch-template/components/AdminLaunchPanel";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getLaunchSettingsAdmin, saveLaunchSettingsAdmin } from "@/lib/launch.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import type { LaunchCountdownSettings } from "@launch-template/lib/launch-settings";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/launch")({
  component: AdminLaunchPage,
});

function AdminLaunchPage() {
  const loadSettings = useAuthedServerFn(getLaunchSettingsAdmin);
  const saveSettings = useAuthedServerFn(saveLaunchSettingsAdmin);
  const [settings, setSettings] = useState<LaunchCountdownSettings | null>(null);

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load launch settings"));
  }, [loadSettings]);

  return (
    <AdminShell title="Launch Countdown" subtitle="Control the cinematic coming-soon page on the homepage.">
      {!settings ? (
        <p className="text-sm text-muted-foreground">Loading launch settings…</p>
      ) : (
        <AdminLaunchPanel
          initialSettings={settings}
          previewHref="/"
          Switch={Switch}
          Input={Input}
          Button={Button}
          onSave={async (s) => {
            await saveSettings({ data: s });
            setSettings(s);
            return { ok: true };
          }}
        />
      )}
    </AdminShell>
  );
}

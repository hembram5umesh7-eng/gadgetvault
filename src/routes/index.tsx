import { createFileRoute } from "@tanstack/react-router";
import { LaunchGate } from "@launch-template/components/LaunchGate";
import { gadgetVaultLaunchConfig } from "@/config/launch.config";
import { fetchPublicLaunchSettings } from "@/lib/launch-client";
import { HomeStore } from "@/components/home-store";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <LaunchGate
      config={gadgetVaultLaunchConfig}
      loadSettings={fetchPublicLaunchSettings}
      loadingFallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-950">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-lime-600 border-t-transparent" />
        </div>
      }
    >
      <HomeStore />
    </LaunchGate>
  );
}

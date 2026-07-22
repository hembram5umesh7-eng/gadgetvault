import { useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { saveReferralCodeToStorage } from "@/lib/referral-settings";

/** Captures ?ref=CODE from any page and stores for signup/checkout */
export function ReferralCapture() {
  const search = useSearch({ strict: false }) as { ref?: string };

  useEffect(() => {
    const fromUrl = search?.ref;
    if (fromUrl && typeof fromUrl === "string" && fromUrl.trim()) {
      saveReferralCodeToStorage(fromUrl);
      return;
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) saveReferralCodeToStorage(ref);
    }
  }, [search?.ref]);

  return null;
}

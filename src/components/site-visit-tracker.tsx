import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { recordSiteVisit } from "@/lib/analytics.functions";

const SESSION_KEY = "gv_session_id";

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return crypto.randomUUID();
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Fire-and-forget visit ping once per page load (admin analytics). */
export function SiteVisitTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const record = useServerFn(recordSiteVisit);
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (sent.current === pathname) return;
    sent.current = pathname;
    const sessionKey = getSessionId();
    record({ data: { sessionKey, path: pathname } }).catch(() => {
      /* analytics optional */
    });
  }, [pathname, record]);

  return null;
}

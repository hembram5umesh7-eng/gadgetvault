import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authStorageKey, persistSession, readCachedSession } from "@/lib/auth-storage";

export type AppRole = "user" | "admin" | "staff" | "manufacturer";

const VALID_ROLES = new Set<AppRole>(["user", "admin", "staff", "manufacturer"]);

export { authStorageKey, persistSession, readCachedSession };

export function rolesFromUser(user: User | null | undefined): AppRole[] {
  if (!user) return [];
  const meta = user.app_metadata?.roles;
  if (!Array.isArray(meta)) return [];
  return meta.filter((r): r is AppRole => typeof r === "string" && VALID_ROLES.has(r as AppRole));
}

export function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("invalid email or password")) {
    return "Wrong email or password. Please check and try again.";
  }
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return "Email not verified. Create account again or contact support.";
  }
  if (m.includes("too many") || m.includes("rate limit")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return message;
}

export function canAccessAdminPanel(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("staff");
}

export function isSuperAdmin(roles: AppRole[]) {
  return roles.includes("admin");
}

export function isShopperAccount(roles: string[]): boolean {
  return !roles.some((r) => r === "admin" || r === "staff" || r === "manufacturer");
}

export function resolvePostLoginRedirect(requested: string, roles: AppRole[]): string {
  const isShopper =
    roles.length === 0 ||
    (roles.length === 1 && roles[0] === "user") ||
    (!roles.includes("admin") && !roles.includes("staff") && !roles.includes("manufacturer"));

  if (requested && requested !== "/") return requested;
  if (isShopper) return "/account";
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("staff")) return "/staff";
  if (roles.includes("manufacturer")) return "/partner";
  return "/";
}

let syncPromise: Promise<import("@supabase/supabase-js").Session | null> | null = null;

/** Sync localStorage session into supabase-js so RLS requests include JWT. */
export async function syncSupabaseSession() {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const { data: { session: existing } } = await supabase.auth.getSession();
    if (existing?.access_token) return existing;

    const cached = readCachedSession();
    if (!cached) return null;

    const setSessionPromise = supabase.auth.setSession({
      access_token: cached.access_token,
      refresh_token: cached.refresh_token,
    });

    const timeout = new Promise<{ data: { session: import("@supabase/supabase-js").Session | null }; error: Error | null }>((resolve) => {
      window.setTimeout(
        () => resolve({ data: { session: cached }, error: null }),
        4000,
      );
    });

    const { data, error } = await Promise.race([setSessionPromise, timeout]);
    if (!error && data.session?.access_token) return data.session;

    const { data: { session: after } } = await supabase.auth.getSession();
    return after ?? cached;
  })();

  try {
    return await syncPromise;
  } finally {
    syncPromise = null;
  }
}

export async function loginWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw new Error(mapAuthError(error.message));

  if (!data.session?.access_token || !data.user) {
    throw new Error("Sign in failed. Please try again.");
  }

  persistSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    token_type: data.session.token_type,
    user: data.session.user,
  });

  await syncSupabaseSession();
  return { user: data.user, session: data.session };
}

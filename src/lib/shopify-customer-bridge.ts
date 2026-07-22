import type { Session } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { shopifyCustomerGraphqlUrl } from "@/integrations/shopify/customer-account";

export type ShopifyCustomerProfile = {
  email: string;
  fullName: string;
};

export function authStorageKeyFromSupabaseUrl(supabaseUrl: string): string {
  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "local";
  return `sb-${ref}-auth-token`;
}

export async function fetchShopifyCustomerProfile(accessToken: string): Promise<ShopifyCustomerProfile> {
  const res = await fetch(shopifyCustomerGraphqlUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
    body: JSON.stringify({
      query: `query {
        customer {
          firstName
          lastName
          emailAddress { emailAddress }
        }
      }`,
    }),
  });

  const json = (await res.json()) as {
    errors?: { message: string }[];
    data?: {
      customer?: {
        firstName?: string | null;
        lastName?: string | null;
        emailAddress?: { emailAddress?: string | null } | null;
      } | null;
    };
  };

  if (!res.ok || json.errors?.length) {
    throw new Error(json.errors?.[0]?.message ?? `Customer API failed (${res.status})`);
  }

  const email = json.data?.customer?.emailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) throw new Error("Shopify account has no email — use email/password sign in");

  const first = json.data?.customer?.firstName?.trim() ?? "";
  const last = json.data?.customer?.lastName?.trim() ?? "";
  const fullName = `${first} ${last}`.trim() || email.split("@")[0];

  return { email, fullName };
}

async function findUserByEmail(email: string) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) break;
    page++;
  }
  return null;
}

async function ensureShopifyShopper(email: string, fullName: string) {
  const existing = await findUserByEmail(email);
  if (!existing) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: `${crypto.randomUUID()}Aa1!`,
      user_metadata: { full_name: fullName, shopify_customer: true },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Could not create GadgetVault account");

    await supabaseAdmin.from("profiles").upsert(
      { id: data.user.id, full_name: fullName },
      { onConflict: "id" },
    );
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("role", "user")
      .maybeSingle();
    if (!role) {
      await supabaseAdmin.from("user_roles").insert({ user_id: data.user.id, role: "user" });
    }
    return;
  }

  await supabaseAdmin.from("profiles").upsert(
    { id: existing.id, full_name: fullName },
    { onConflict: "id" },
  );
}

/** Create Supabase session server-side — no magic-link redirect to localhost. */
export async function createSupabaseSessionAfterShopify(opts: {
  email: string;
  fullName: string;
}): Promise<Session> {
  const email = opts.email.trim().toLowerCase();
  await ensureShopifyShopper(email, opts.fullName);

  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    throw new Error(linkErr?.message ?? "Could not start GadgetVault session");
  }

  const { data: verified, error: verifyErr } = await supabaseAdmin.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (verifyErr || !verified.session) {
    throw new Error(verifyErr?.message ?? "Could not verify GadgetVault session");
  }

  return verified.session;
}

/** HTML page that saves session to localStorage and redirects — works on production domain. */
export function buildSessionBootstrapHtml(session: Session, redirectTo: string): string {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const storageKey = authStorageKeyFromSupabaseUrl(supabaseUrl);
  const sessionJson = JSON.stringify(session);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Signing in…</title>
  <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#334155}</style>
</head>
<body>
  <p>Signing you in…</p>
  <script>
    try {
      localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(sessionJson)});
      location.replace(${JSON.stringify(redirectTo)});
    } catch (e) {
      document.body.innerHTML = "<p>Sign in failed. <a href='/auth'>Try again</a></p>";
    }
  </script>
</body>
</html>`;
}

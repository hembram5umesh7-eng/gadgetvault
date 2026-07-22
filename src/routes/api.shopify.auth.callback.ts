import { createFileRoute } from "@tanstack/react-router";
import { exchangeShopifyOAuthCode } from "@/lib/shopify-oauth";
import { saveStoredShopifyAdminToken, getStoredShopifyClientSecret } from "@/lib/shopify-token-store";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SHOPIFY_CANONICAL_ORIGIN, SHOPIFY_OAUTH_REDIRECT_URI } from "@/lib/shopify-oauth-config";
import { fetchInstalledShopifyScopes } from "@/integrations/shopify/admin-auth";

export const Route = createFileRoute("/api/shopify/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const shop = url.searchParams.get("shop");
        const adminBase = `${SHOPIFY_CANONICAL_ORIGIN}/admin/shopify`;

        if (!code || !shop) {
          return Response.redirect(`${adminBase}?error=oauth_denied`, 302);
        }

        const cookie = request.headers.get("cookie") ?? "";
        const stateCookie = cookie.match(/shopify_oauth_state=([^;]+)/)?.[1];
        if (!state || !stateCookie || state !== stateCookie) {
          return Response.redirect(`${adminBase}?error=invalid_state`, 302);
        }

        const clientId = process.env.SHOPIFY_CLIENT_ID?.trim() || process.env.SHOPIFY_API_KEY?.trim();
        const clientSecret =
          (await getStoredShopifyClientSecret()) ||
          process.env.SHOPIFY_CLIENT_SECRET?.trim() ||
          process.env.SHOPIFY_API_SECRET?.trim();

        if (!clientId || !clientSecret) {
          return Response.redirect(`${adminBase}?error=missing_credentials`, 302);
        }

        try {
          const tokens = await exchangeShopifyOAuthCode({
            shop,
            code,
            clientId,
            clientSecret,
            redirectUri: SHOPIFY_OAUTH_REDIRECT_URI,
          });

          await saveStoredShopifyAdminToken(tokens.access_token);

          const installedScopes = await fetchInstalledShopifyScopes(tokens.access_token);
          const ordersScopeReady =
            installedScopes.includes("read_orders") && installedScopes.includes("write_orders");

          await supabaseAdmin.from("app_settings").upsert({
            key: "shopify_admin",
            value: {
              access_token: tokens.access_token,
              scope: tokens.scope || installedScopes.join(","),
              installed_scopes: installedScopes,
              orders_scope_ready: ordersScopeReady,
              connected_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          });

          const redirectQuery = ordersScopeReady ? "connected=1" : "connected=1&orders_scopes=0";
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${adminBase}?${redirectQuery}`,
              "Set-Cookie": "shopify_oauth_state=; Path=/; HttpOnly; Max-Age=0",
            },
          });
        } catch (err) {
          const msg = encodeURIComponent(err instanceof Error ? err.message : "oauth_failed");
          return Response.redirect(`${adminBase}?error=${msg}`, 302);
        }
      },
    },
  },
  component: () => null,
});

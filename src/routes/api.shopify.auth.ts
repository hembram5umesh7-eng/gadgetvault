import { createFileRoute } from "@tanstack/react-router";
import { buildShopifyOAuthUrl } from "@/lib/shopify-oauth";
import { SHOPIFY_OAUTH_REDIRECT_URI } from "@/lib/shopify-oauth-config";
import { getStoredShopifyClientSecret } from "@/lib/shopify-token-store";

export const Route = createFileRoute("/api/shopify/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.SHOPIFY_CLIENT_ID?.trim() || process.env.SHOPIFY_API_KEY?.trim();
        if (!clientId) {
          return new Response("Missing SHOPIFY_CLIENT_ID", { status: 500 });
        }

        const secret =
          (await getStoredShopifyClientSecret()) ||
          process.env.SHOPIFY_CLIENT_SECRET?.trim() ||
          process.env.SHOPIFY_API_SECRET?.trim();

        if (!secret) {
          return Response.redirect(new URL("/admin/shopify?error=missing_secret", request.url), 302);
        }

        const redirectUri = SHOPIFY_OAUTH_REDIRECT_URI;
        const state = crypto.randomUUID();
        const authorizeUrl = buildShopifyOAuthUrl({ clientId, redirectUri, state });

        return new Response(null, {
          status: 302,
          headers: {
            Location: authorizeUrl,
            "Set-Cookie": `shopify_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
          },
        });
      },
    },
  },
  component: () => null,
});

import { createFileRoute } from "@tanstack/react-router";
import {
  exchangeShopifyCustomerCode,
  shopifyCustomerAccountConfigured,
} from "@/integrations/shopify/customer-account";
import {
  buildSessionBootstrapHtml,
  createSupabaseSessionAfterShopify,
  fetchShopifyCustomerProfile,
} from "@/lib/shopify-customer-bridge";
import { shopifyCustomerCallbackUrl } from "@/lib/site-url";

function cookieFlags(origin: string): string {
  return origin.startsWith("https") ? "; Secure" : "";
}

export const Route = createFileRoute("/account/authorize")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
          return Response.redirect(`${origin}/auth?error=${encodeURIComponent(error)}`, 302);
        }

        if (!code || !shopifyCustomerAccountConfigured()) {
          return Response.redirect(`${origin}/auth?error=customer_oauth_denied`, 302);
        }

        const cookie = request.headers.get("cookie") ?? "";
        const stateCookie = cookie.match(/shopify_customer_oauth_state=([^;]+)/)?.[1];
        const verifier = cookie.match(/shopify_customer_pkce=([^;]+)/)?.[1];
        const returnCookie = cookie.match(/shopify_customer_return=([^;]+)/)?.[1];
        const returnTo = returnCookie ? decodeURIComponent(returnCookie) : "/account";
        const redirectPath =
          returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/account";

        if (!state || !stateCookie || state !== stateCookie || !verifier) {
          return Response.redirect(`${origin}/auth?error=invalid_customer_state`, 302);
        }

        try {
          const tokens = await exchangeShopifyCustomerCode({
            code,
            codeVerifier: verifier,
            redirectUri: shopifyCustomerCallbackUrl(request),
          });

          const profile = await fetchShopifyCustomerProfile(tokens.access_token);
          const session = await createSupabaseSessionAfterShopify({
            email: profile.email,
            fullName: profile.fullName,
          });

          const secure = cookieFlags(origin);
          const clear = [
            "shopify_customer_pkce=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            "shopify_customer_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            "shopify_customer_return=; Path=/; HttpOnly; Max-Age=0",
          ];
          const maxAge = tokens.expires_in ?? 3600;
          const set = [
            `shopify_customer_token=${tokens.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
            ...(tokens.refresh_token
              ? [`shopify_customer_refresh=${tokens.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`]
              : []),
          ];

          const html = buildSessionBootstrapHtml(session, `${origin}${redirectPath}`);

          return new Response(html, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
              "Set-Cookie": [...clear, ...set],
            },
          });
        } catch (err) {
          const msg = encodeURIComponent(err instanceof Error ? err.message : "customer_oauth_failed");
          return Response.redirect(`${origin}/auth?error=${msg}`, 302);
        }
      },
    },
  },
  component: () => null,
});

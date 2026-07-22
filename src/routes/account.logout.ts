import { createFileRoute } from "@tanstack/react-router";
import { buildShopifyCustomerLogoutRedirect } from "@/integrations/shopify/customer-account";

export const Route = createFileRoute("/account/logout")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const logoutUrl = buildShopifyCustomerLogoutRedirect();

        const headers = new Headers();
        headers.set("Location", logoutUrl);
        headers.append("Set-Cookie", "shopify_customer_token=; Path=/; HttpOnly; Max-Age=0");
        headers.append("Set-Cookie", "shopify_customer_refresh=; Path=/; HttpOnly; Max-Age=0");

        return new Response(null, { status: 302, headers });
      },
    },
  },
  component: () => null,
});

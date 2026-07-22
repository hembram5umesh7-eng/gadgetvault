import { createFileRoute } from "@tanstack/react-router";

/** Customer Shopify OAuth disabled — shoppers use GadgetVault email/password only. */
export const Route = createFileRoute("/account/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const returnTo = url.searchParams.get("return_to");
        const back = new URL("/auth", url.origin);
        back.searchParams.set("redirect", returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/account");
        back.searchParams.set("tab", "login");
        return Response.redirect(back.toString(), 302);
      },
    },
  },
  component: () => null,
});

import { createFileRoute } from "@tanstack/react-router";
import { publishProductToHeadless } from "@/integrations/shopify/publish";
import { verifyShopifyHmac } from "@/lib/shopify-webhook-verify";

type ShopifyProductWebhook = {
  admin_graphql_api_id?: string;
  id?: number;
  title?: string;
  status?: string;
};

function productGid(payload: ShopifyProductWebhook): string | null {
  if (payload.admin_graphql_api_id) return payload.admin_graphql_api_id;
  if (payload.id) return `gid://shopify/Product/${payload.id}`;
  return null;
}

export const Route = createFileRoute("/api/webhooks/shopify/products")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SHOPIFY_WEBHOOK_SECRET?.trim();
        const rawBody = await request.text();

        if (secret) {
          const hmac = request.headers.get("x-shopify-hmac-sha256");
          if (!verifyShopifyHmac(rawBody, hmac, secret)) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        let payload: ShopifyProductWebhook;
        try {
          payload = JSON.parse(rawBody) as ShopifyProductWebhook;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (payload.status && payload.status !== "active") {
          return Response.json({ ok: true, skipped: "not_active" });
        }

        const gid = productGid(payload);
        if (!gid) return Response.json({ ok: false, error: "missing_product_id" }, { status: 400 });

        const result = await publishProductToHeadless(gid);
        return Response.json({
          ok: result.ok,
          product: payload.title ?? gid,
          message: result.message,
        });
      },
    },
  },
  component: () => null,
});

import { createFileRoute } from "@tanstack/react-router";
import { applyShopifyOrderInboundUpdate, type ShopifyOrderWebhookPayload } from "@/lib/shopify-order-inbound";
import { verifyShopifyHmac } from "@/lib/shopify-webhook-verify";

export const Route = createFileRoute("/api/webhooks/shopify/orders")({
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

        let payload: ShopifyOrderWebhookPayload;
        try {
          payload = JSON.parse(rawBody) as ShopifyOrderWebhookPayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const topic = request.headers.get("x-shopify-topic") ?? undefined;
        const result = await applyShopifyOrderInboundUpdate(payload, topic);

        return Response.json({
          ok: true,
          topic,
          matched: result.matched,
          orderId: result.orderId,
          previousStatus: result.previousStatus,
          newStatus: result.newStatus,
        });
      },
    },
  },
  component: () => null,
});

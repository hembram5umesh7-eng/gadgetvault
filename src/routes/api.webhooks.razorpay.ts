import { createFileRoute } from "@tanstack/react-router";
import { handleRazorpayWebhook, verifyRazorpayWebhookSignature } from "@/lib/razorpay-refund";

export const Route = createFileRoute("/api/webhooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-razorpay-signature");

        if (!(await verifyRazorpayWebhookSignature(raw, signature))) {
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          const result = await handleRazorpayWebhook(raw);
          return Response.json(result);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Webhook handler failed";
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
  component: () => null,
});

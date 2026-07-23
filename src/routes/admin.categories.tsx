import { createFileRoute, redirect } from "@tanstack/react-router";

/** GadgetVault category CRUD removed — manage collections in Shopify Admin only. */
export const Route = createFileRoute("/admin/categories")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/shopify", hash: "collections" });
  },
});

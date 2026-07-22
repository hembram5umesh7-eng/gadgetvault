import { shopifyAdminApiUrl, shopifyStoreDomain } from "./config";
import { resolveShopifyAdminAccessToken, resolveShopifyAdminAccessTokenForOrders, shopifyAdminCredentialsConfigured } from "./admin-auth";
import { graphqlErrorMessages, hasGraphqlErrors } from "./graphql-errors";

export function shopifyAdminToken(): string {
  return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim() ?? "";
}

export function shopifyAdminConfigured(): boolean {
  return shopifyAdminCredentialsConfigured();
}

export async function shopifyAdminQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = await resolveShopifyAdminAccessToken();
  const domain = shopifyStoreDomain();
  if (!token || !domain) throw new Error("Shopify Admin API not configured — set SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET");

  const res = await fetch(shopifyAdminApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Shopify Admin API error: ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (hasGraphqlErrors(json.errors)) throw new Error(graphqlErrorMessages(json.errors));
  if (!json.data) throw new Error("Empty Shopify Admin response");
  return json.data;
}

export type ShopifyDraftLineItem = {
  variantId: string;
  quantity: number;
  customAttributes?: { key: string; value: string }[];
};

export type ShopifyDraftOrderInput = {
  email: string;
  phone?: string;
  lineItems: ShopifyDraftLineItem[];
  shippingAddress: {
    firstName: string;
    lastName?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    phone?: string;
  };
  note?: string;
  tags?: string[];
  appliedDiscount?: { value: number; valueType: "FIXED_AMOUNT"; title: string };
};

export async function createShopifyDraftOrder(input: ShopifyDraftOrderInput): Promise<{
  draftOrderId: string;
  orderId: string | null;
  status: string;
}> {
  const nameParts = input.shippingAddress.firstName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "Customer";
  const lastName = nameParts.slice(1).join(" ") || input.shippingAddress.lastName || ".";

  const data = await shopifyAdminQuery<{
    draftOrderCreate: {
      draftOrder: { id: string; status: string; order: { id: string } | null } | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(
    `mutation DraftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id status }
        userErrors { field message }
      }
    }`,
    {
      input: {
        email: input.email,
        phone: input.phone,
        lineItems: input.lineItems,
        shippingAddress: {
          ...input.shippingAddress,
          firstName,
          lastName,
        },
        note: input.note,
        tags: input.tags ?? ["gadgetvault"],
        appliedDiscount: input.appliedDiscount,
      },
    },
  );

  const errs = data.draftOrderCreate.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
  const draft = data.draftOrderCreate.draftOrder;
  if (!draft) throw new Error("Draft order not created");

  return {
    draftOrderId: draft.id,
    orderId: null,
    status: draft.status,
  };
}

function shopifyGidNumeric(gid: string): string {
  return gid.split("/").pop() ?? gid;
}

function toOrderGid(id: string): string | null {
  const t = id.trim();
  if (t.includes("/Order/")) return t;
  if (/^\d+$/.test(t)) return `gid://shopify/Order/${t}`;
  return null;
}

function toDraftGid(id: string): string | null {
  const t = id.trim();
  if (t.includes("/DraftOrder/")) return t;
  if (/^\d+$/.test(t)) return `gid://shopify/DraftOrder/${t}`;
  return null;
}

/** After draftOrderComplete, fetch real Order GID via REST (works without read_orders GraphQL scope). */
export async function fetchOrderGidFromDraft(draftOrderGid: string): Promise<string | null> {
  const token = await resolveShopifyAdminAccessToken();
  const domain = shopifyStoreDomain();
  if (!token || !domain) return null;

  const numericId = shopifyGidNumeric(draftOrderGid);
  const res = await fetch(`https://${domain}/admin/api/2024-10/draft_orders/${numericId}.json`, {
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { draft_order?: { order_id?: number | null; status?: string } };
  const orderId = json.draft_order?.order_id;
  return orderId ? `gid://shopify/Order/${orderId}` : null;
}

async function cancelShopifyOrderByRest(numericOrderId: string): Promise<void> {
  const token = await resolveShopifyAdminAccessTokenForOrders();
  const domain = shopifyStoreDomain();
  if (!token || !domain) throw new Error("Shopify Admin API not configured");

  const res = await fetch(`https://${domain}/admin/api/2024-10/orders/${numericOrderId}/cancel.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: "customer",
      email: false,
      refund: false,
      restock: true,
    }),
  });

  if (res.ok) return;

  const body = await res.text();
  if (res.status === 422 && /already cancelled|cannot be cancelled/i.test(body)) return;

  throw new Error(`Shopify order cancel failed (${res.status}): ${body.slice(0, 240)}`);
}

async function cancelShopifyOrderByGraphql(orderGid: string): Promise<void> {
  const token = await resolveShopifyAdminAccessTokenForOrders();
  const domain = shopifyStoreDomain();
  if (!domain) throw new Error("Shopify store domain not configured");

  const res = await fetch(shopifyAdminApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({
      query: `mutation OrderCancel($orderId: ID!, $notifyCustomer: Boolean, $refund: Boolean, $restock: Boolean, $reason: OrderCancelReason!) {
        orderCancel(orderId: $orderId, notifyCustomer: $notifyCustomer, refund: $refund, restock: $restock, reason: $reason) {
          job { id }
          orderCancelUserErrors { message }
        }
      }`,
      variables: {
        orderId: orderGid,
        notifyCustomer: false,
        refund: false,
        restock: true,
        reason: "CUSTOMER",
      },
    }),
  });

  if (!res.ok) throw new Error(`Shopify Admin API error: ${res.status}`);
  const json = (await res.json()) as {
    data?: { orderCancel: { orderCancelUserErrors: { message: string }[] } };
    errors?: unknown;
  };
  if (hasGraphqlErrors(json.errors)) throw new Error(graphqlErrorMessages(json.errors));

  const errs = json.data?.orderCancel.orderCancelUserErrors ?? [];
  if (errs.length) {
    const msg = errs.map((e) => e.message).join("; ");
    if (/already cancelled|cannot be cancelled/i.test(msg)) return;
    throw new Error(msg);
  }
}

async function tagShopifyOrderCancelled(numericOrderId: string, note?: string): Promise<void> {
  const token = await resolveShopifyAdminAccessTokenForOrders();
  const domain = shopifyStoreDomain();
  if (!token || !domain) return;

  await fetch(`https://${domain}/admin/api/2024-10/orders/${numericOrderId}.json`, {
    method: "PUT",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order: {
        id: Number(numericOrderId),
        tags: "gadgetvault, cancelled",
        note: note ?? "Cancelled on GadgetVault",
      },
    }),
  }).catch(() => {});
}

async function deleteShopifyDraftRest(numericDraftId: string): Promise<void> {
  const token = await resolveShopifyAdminAccessToken();
  const domain = shopifyStoreDomain();
  if (!token || !domain) return;

  const res = await fetch(`https://${domain}/admin/api/2024-10/draft_orders/${numericDraftId}.json`, {
    method: "DELETE",
    headers: { "X-Shopify-Access-Token": token },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Draft delete failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

/** Resolve real Shopify Order GID from stored order/draft ids. */
export async function resolveShopifyOrderGid(
  shopifyOrderId: string | null | undefined,
  shopifyDraftOrderId: string | null | undefined,
): Promise<string | null> {
  const candidates = [shopifyOrderId, shopifyDraftOrderId].filter(Boolean) as string[];

  for (const raw of candidates) {
    const orderGid = toOrderGid(raw);
    if (orderGid) return orderGid;
  }

  for (const raw of candidates) {
    const draftGid = toDraftGid(raw);
    if (!draftGid) continue;
    const linked = await fetchOrderGidFromDraft(draftGid);
    if (linked) return linked;
  }

  return null;
}

/** Cancel the Shopify order linked to a GadgetVault order (draft → order resolved automatically). */
export async function cancelShopifyOrderForGadgetVault(input: {
  shopifyOrderId?: string | null;
  shopifyDraftOrderId?: string | null;
  note?: string;
}): Promise<{ cancelledOrderId?: string; draftDeleted?: boolean }> {
  if (!shopifyAdminConfigured()) throw new Error("Shopify Admin API not configured");

  const note = input.note ?? "Cancelled on GadgetVault";
  const orderGid = await resolveShopifyOrderGid(input.shopifyOrderId, input.shopifyDraftOrderId);

  if (orderGid) {
    const numericId = shopifyGidNumeric(orderGid);
    try {
      await cancelShopifyOrderByGraphql(orderGid);
    } catch {
      await cancelShopifyOrderByRest(numericId);
    }
    await tagShopifyOrderCancelled(numericId, note);

    for (const raw of [input.shopifyDraftOrderId, input.shopifyOrderId].filter(Boolean) as string[]) {
      const draftGid = toDraftGid(raw);
      if (draftGid) {
        await deleteShopifyDraftRest(shopifyGidNumeric(draftGid)).catch(() => {});
      }
    }

    return { cancelledOrderId: orderGid };
  }

  let draftDeleted = false;
  for (const raw of [input.shopifyDraftOrderId, input.shopifyOrderId].filter(Boolean) as string[]) {
    const draftGid = toDraftGid(raw);
    if (!draftGid) continue;
    await deleteShopifyDraftRest(shopifyGidNumeric(draftGid));
    draftDeleted = true;
  }

  if (!draftDeleted) throw new Error("No Shopify order or draft linked to cancel");
  return { draftDeleted: true };
}

/** @deprecated use cancelShopifyOrderForGadgetVault */
export async function cancelShopifyLinkedOrder(shopifyGid: string, note?: string): Promise<void> {
  const isDraft = shopifyGid.includes("DraftOrder");
  await cancelShopifyOrderForGadgetVault({
    shopifyOrderId: isDraft ? null : shopifyGid,
    shopifyDraftOrderId: isDraft ? shopifyGid : null,
    note,
  });
}

export async function completeShopifyDraftOrder(draftOrderId: string, paymentPending = false): Promise<string | null> {
  const data = await shopifyAdminQuery<{
    draftOrderComplete: {
      draftOrder: { id: string; status: string } | null;
      userErrors: { message: string }[];
    };
  }>(
    `mutation Complete($id: ID!, $paymentPending: Boolean) {
      draftOrderComplete(id: $id, paymentPending: $paymentPending) {
        draftOrder { id status }
        userErrors { message }
      }
    }`,
    { id: draftOrderId, paymentPending },
  );

  const errs = data.draftOrderComplete.userErrors;
  if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
  const draft = data.draftOrderComplete.draftOrder;
  const draftGid = draft?.id ?? draftOrderId;

  let orderGid: string | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    orderGid = await fetchOrderGidFromDraft(draftGid);
    if (orderGid) break;
    await new Promise((r) => setTimeout(r, 600));
  }
  return orderGid ?? draftGid;
}

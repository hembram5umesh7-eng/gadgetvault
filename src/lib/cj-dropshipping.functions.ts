import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  CJ_API_BASE,
  cjConfigured,
  cjUsdToInr,
  flattenListV2,
  mapProductDetail,
  parseCJResponse,
  slugifyCJ,
  splitVariantKey,
  type CJListProduct,
} from "@/lib/cj-dropshipping";
import { colorNameToHex } from "@/lib/color-utils";
import { buildProfitEstimate, profitFromSelling, type CJLogisticsOption } from "@/lib/cj-pricing";

let tokenCache: { accessToken: string; refreshToken: string; expiresAt: number } | null = null;

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Admin access required");
}

async function cjAuthFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CJ_API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string>) },
  });
  const text = await res.text();
  let body: unknown = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!res.ok) throw new Error((body as { message?: string }).message || text);
  return parseCJResponse<T>(body);
}

async function cjFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getCJAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "CJ-Access-Token": token,
    ...(init.headers as Record<string, string>),
  };
  const res = await fetch(`${CJ_API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!res.ok) {
    const msg = (body as { message?: string }).message || text || `CJ HTTP ${res.status}`;
    throw new Error(msg);
  }
  return parseCJResponse<T>(body);
}

interface CJLogisticsOption {
  id: number;
  orderCode?: string;
  logisticsName: string;
  postage?: number;
  hasStock?: boolean;
  isChecked?: boolean | null;
}

/** Pick and apply CJ shipping method so store orders can move to picking. */
async function applyCJOrderLogistics(cjOrderCode: string, preferredName?: string): Promise<string | null> {
  try {
    const options = await cjFetch<CJLogisticsOption[]>(
      `/shopping/order/getOrderLogisticsInfo?orderCode=${encodeURIComponent(cjOrderCode)}`,
    );
    if (!options?.length) return null;

    const inStock = options.filter((o) => o.hasStock !== false);
    const pool = inStock.length ? inStock : options;
    const pref = preferredName?.trim();
    const chosen =
      (pref ? pool.find((o) => o.logisticsName === pref || o.logisticsName.includes(pref)) : null) ??
      pool.find((o) => o.isChecked) ??
      pool[0];

    if (!chosen?.id || !chosen.logisticsName) return chosen?.logisticsName ?? null;

    await cjFetch<unknown>("/shopping/order/updateLogistics", {
      method: "POST",
      body: JSON.stringify({
        id: chosen.id,
        orderCode: cjOrderCode,
        logisticsName: chosen.logisticsName,
        from: 1,
      }),
    });
    return chosen.logisticsName;
  } catch {
    return null;
  }
}

export async function getCJAccessToken(): Promise<string> {
  if (!cjConfigured()) throw new Error("CJ Dropshipping not configured. Add CJ_API_KEY to .env");
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.accessToken;

  const refresh = process.env.CJ_REFRESH_TOKEN?.trim();
  if (refresh) {
    try {
      const res = await fetch(`${CJ_API_BASE}/authentication/refreshAccessToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      const body = await res.json();
      const data = parseCJResponse<{
        accessToken: string;
        refreshToken: string;
        accessTokenExpiryDate?: string;
      }>(body);
      tokenCache = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + 13 * 24 * 60 * 60 * 1000,
      };
      return data.accessToken;
    } catch {
      /* fall through to apiKey */
    }
  }

  const data = await cjAuthFetch<{
    accessToken: string;
    refreshToken: string;
  }>("/authentication/getAccessToken", {
    method: "POST",
    body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
  });

  tokenCache = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + 13 * 24 * 60 * 60 * 1000,
  };
  return data.accessToken;
}

async function fetchCJProductDetail(pid: string) {
  const data = await cjFetch<Record<string, unknown>>(`/product/query?pid=${encodeURIComponent(pid)}&features=enable_description`);
  return mapProductDetail(data);
}

const searchInput = z.object({
  keyword: z.string().min(1).max(120),
  page: z.number().int().min(1).max(100).default(1),
});

export const searchCJProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => searchInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const qs = new URLSearchParams({
      page: String(data.page),
      size: "20",
      keyWord: data.keyword,
      features: "enable_category",
    });
    const raw = await cjFetch<unknown>(`/product/listV2?${qs}`);
    const products = flattenListV2(raw);
    return { products, page: data.page };
  });

const importInput = z.object({
  productIds: z.array(z.string().min(5)).min(1).max(20),
  categorySlug: z.string().min(2).max(40),
  markupPercent: z.number().min(0).max(300).default(45),
  sellPriceInr: z.number().positive().optional(),
  marketingPriceInr: z.number().positive().optional(),
});

export const importCJProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => importInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const results: { pid: string; name: string; ok: boolean; error?: string }[] = [];

    for (const pid of data.productIds) {
      try {
        const detail = await fetchCJProductDetail(pid);
        if (!detail.variants.length) throw new Error("No variants found on CJ");

        const baseVariant = detail.variants[0];
        const slugBase = slugifyCJ(detail.nameEn);
        let slug = slugBase;
        let n = 1;
        while (true) {
          const { data: exists } = await supabaseAdmin.from("products").select("id").eq("slug", slug).maybeSingle();
          if (!exists) break;
          slug = `${slugBase}-${n++}`;
        }

        const priceInr = data.sellPriceInr ?? cjUsdToInr(baseVariant.variantSellPrice || detail.sellPriceUsd, data.markupPercent);
        const marketingInr = data.marketingPriceInr ?? Math.ceil(priceInr * 1.45);
        const images = [
          ...new Set([
            ...detail.variants.map((v) => v.variantImage).filter(Boolean),
            ...detail.images,
          ]),
        ].slice(0, 12);

        const { data: product, error: pErr } = await supabaseAdmin
          .from("products")
          .insert({
            name: detail.nameEn,
            slug,
            category: data.categorySlug,
            description: detail.description || `${detail.nameEn} — dropshipped via CJ, official import.`,
            base_price: priceInr,
            marketing_price: marketingInr,
            brand: "CJ Dropshipping",
            specs: `CJ SKU: ${detail.sku} · Source: CJ Dropshipping · Auto-fulfill on order`,
            warranty_months: 6,
            is_bestseller: false,
            is_deal: false,
            images,
            active: true,
            cj_product_id: detail.pid,
            cj_sku: detail.sku,
            cj_cost_usd: baseVariant.variantSellPrice || detail.sellPriceUsd,
            fulfillment_source: "cj",
          })
          .select("id")
          .single();

        if (pErr || !product) throw new Error(pErr?.message ?? "Product insert failed");

        const variantRows = detail.variants.slice(0, 24).map((v) => {
          const { color, size } = splitVariantKey(v.variantKey);
          return {
            product_id: product.id,
            size,
            color,
            color_hex: colorNameToHex(color),
            variant_image: v.variantImage || null,
            stock: Math.min(Math.max(v.stock, 0), 999),
            cj_variant_id: v.vid,
          };
        });

        const { error: vErr } = await supabaseAdmin.from("product_variants").insert(variantRows);
        if (vErr) {
          await supabaseAdmin.from("products").delete().eq("id", product.id);
          throw new Error(vErr.message);
        }

        results.push({ pid, name: detail.nameEn, ok: true });
      } catch (err) {
        results.push({ pid, name: pid, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const ok = results.filter((r) => r.ok).length;
    return { imported: ok, failed: results.length - ok, results };
  });

/** Auto-send order to CJ Dropshipping for fulfillment */
export async function processCJFulfillment(orderId: string): Promise<{ ok: boolean; skipped?: boolean; message: string }> {
  if (!cjConfigured()) return { ok: false, skipped: true, message: "CJ not configured" };

  const { data: order, error: oErr } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (oErr || !order) return { ok: false, message: "Order not found" };
  if (order.cj_order_id) return { ok: true, message: "Already sent to CJ" };

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("id, product_id, variant_id, quantity, product_name, unit_price")
    .eq("order_id", orderId);

  if (!items?.length) return { ok: false, message: "No order items" };

  const productIds = [...new Set(items.map((i) => i.product_id))];
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, fulfillment_source, cj_product_id, images, slug, base_price, marketing_price")
    .in("id", productIds);

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const cjProductIds = new Set(
    (products ?? []).filter((p) => p.fulfillment_source === "cj" && p.cj_product_id).map((p) => p.id),
  );
  const cjItems = items.filter((i) => cjProductIds.has(i.product_id));
  if (!cjItems.length) return { ok: true, skipped: true, message: "No CJ products in order" };

  const variantIds = cjItems.map((i) => i.variant_id).filter(Boolean) as string[];
  const { data: variants } = await supabaseAdmin
    .from("product_variants")
    .select("id, cj_variant_id")
    .in("id", variantIds);

  const vidMap = new Map((variants ?? []).map((v) => [v.id, v.cj_variant_id]));

  const cjProducts = cjItems
    .map((item) => {
      const vid = item.variant_id ? vidMap.get(item.variant_id) : null;
      if (!vid) return null;
      const prod = productMap.get(item.product_id);
      return {
        vid,
        quantity: item.quantity,
        storeLineItemId: item.id,
        unitPrice: Number(item.unit_price),
        storeProductId: item.product_id,
        storeProductImg: prod?.images?.[0] ?? "",
      };
    })
    .filter(Boolean) as {
      vid: string;
      quantity: number;
      storeLineItemId: string;
      unitPrice: number;
      storeProductId: string;
      storeProductImg: string;
    }[];

  if (!cjProducts.length) {
    await supabaseAdmin.from("orders").update({
      cj_error: "CJ variant mapping missing — re-import product from CJ sync",
    }).eq("id", orderId);
    return { ok: false, message: "Missing CJ variant IDs" };
  }

  const payType = Number(process.env.CJ_PAY_TYPE ?? 3);
  const logisticName = process.env.CJ_LOGISTIC_NAME?.trim() || "CJPacket Ordinary";
  const configuredStoreName = process.env.CJ_STORE_NAME?.trim();

  try {
    const payload: Record<string, unknown> = {
      orderNumber: order.order_number,
      shippingZip: order.ship_pincode,
      shippingCountry: order.ship_country || "India",
      shippingCountryCode: "IN",
      shippingProvince: order.ship_state,
      shippingCity: order.ship_city,
      shippingPhone: order.ship_phone.replace(/\D/g, "").slice(-15),
      shippingCustomerName: order.ship_full_name,
      shippingAddress: order.ship_line1,
      shippingAddress2: order.ship_line2 ?? "",
      remark: `GadgetVault ${order.order_number} · Total ₹${order.total}`,
      shopAmount: Number(order.total),
      storeOrderTime: Math.floor(new Date(order.created_at).getTime() / 1000),
      logisticName,
      fromCountryCode: "CN",
      platform: "Api",
      shopLogisticsType: 2,
      orderFlow: 1,
      payType,
      products: cjProducts,
    };
    // Only send when it exactly matches an API store in CJ — otherwise CJ rejects the order.
    if (configuredStoreName) payload.storeName = configuredStoreName;

    const platformToken = process.env.CJ_PLATFORM_TOKEN?.trim();
    const extraHeaders = platformToken ? { platformToken } : undefined;

    const result = await cjFetch<{ orderId?: string; orderNum?: string }>("/shopping/order/createOrderV3", {
      method: "POST",
      headers: extraHeaders,
      body: JSON.stringify(payload),
    });

    const cjOrderId = String(result.orderNum ?? result.orderId ?? order.order_number);

    const appliedLogistics = await applyCJOrderLogistics(cjOrderId, logisticName);

    await supabaseAdmin.from("orders").update({
      cj_order_id: cjOrderId,
      cj_status: payType === 2 ? "SUBMITTED_PAID" : "SUBMITTED",
      cj_submitted_at: new Date().toISOString(),
      cj_error: appliedLogistics ? null : "CJ order created — select shipping method in CJ dashboard if picking fails",
      status: ["received", "processing"].includes(order.status) ? "sent_to_manufacturer" : order.status,
    }).eq("id", orderId);

    const logisticsNote = appliedLogistics ? ` · ${appliedLogistics}` : "";
    return { ok: true, message: `Sent to CJ (${cjOrderId})${logisticsNote}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabaseAdmin.from("orders").update({ cj_error: msg }).eq("id", orderId);
    return { ok: false, message: msg };
  }
}

interface CJOrderDetail {
  orderId?: string;
  orderNum?: string;
  orderStatus?: string;
  cjOrderId?: string | null;
}

/** Cancel CJ order when customer cancels on GadgetVault. */
export async function processCJOrderCancel(
  orderId: string,
  reason?: string,
): Promise<{ ok: boolean; message: string; cjCancelled?: boolean }> {
  if (!cjConfigured()) return { ok: true, message: "CJ not configured — local cancel only" };

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, cj_order_id, cj_status")
    .eq("id", orderId)
    .single();

  if (error || !order) return { ok: false, message: "Order not found" };
  if (!order.cj_order_id) return { ok: true, message: "No CJ order linked" };

  const idsToTry = [...new Set([order.cj_order_id, order.order_number].filter(Boolean))];
  let lastErr = "CJ cancel failed";

  for (const cjId of idsToTry) {
    try {
      let detail: CJOrderDetail | null = null;
      try {
        detail = await cjFetch<CJOrderDetail>(
          `/shopping/order/getOrderDetail?orderId=${encodeURIComponent(cjId)}`,
        );
      } catch {
        /* order id format may differ */
      }

      const status = (detail?.orderStatus ?? "").toUpperCase();
      const deleteId = detail?.orderId ?? detail?.cjOrderId ?? cjId;

      if (status && !["CREATED", "IN_CART", "UNPAID", "CANCELLED"].includes(status)) {
        lastErr = `CJ order is ${status} — cannot auto-cancel via API. Admin must cancel in CJ dashboard.`;
        continue;
      }

      await cjFetch<unknown>(
        `/shopping/order/deleteOrder?orderId=${encodeURIComponent(String(deleteId))}`,
        { method: "DELETE" },
      );

      await supabaseAdmin.from("orders").update({
        cj_status: "CANCELLED",
        cj_error: reason ? `Customer cancel: ${reason}` : "Cancelled on CJ",
      }).eq("id", orderId);

      return { ok: true, message: `CJ order cancelled (${deleteId})`, cjCancelled: true };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }

  await supabaseAdmin.from("orders").update({
    cj_status: "CANCEL_REQUESTED",
    cj_error: `Cancel on GadgetVault — please cancel manually in CJ: ${lastErr}`,
  }).eq("id", orderId);

  return { ok: false, message: lastErr, cjCancelled: false };
}

const orderIdInput = z.object({ orderId: z.string().uuid() });

export const triggerCJFulfillment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => orderIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("user_id")
      .eq("id", data.orderId)
      .single();
    if (!order) throw new Error("Order not found");

    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    const isStaff = (roles ?? []).some((r) => r.role === "admin" || r.role === "staff");
    if (order.user_id !== context.userId && !isStaff) throw new Error("Forbidden");

    return processCJFulfillment(data.orderId);
  });

export const retryCJOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => orderIdInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    await supabaseAdmin.from("orders").update({ cj_order_id: null, cj_error: null }).eq("id", data.orderId);
    return processCJFulfillment(data.orderId);
  });

/** Re-apply CJ shipping method when picking fails with "Shipping method not selected". */
export const fixCJOrderLogistics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => orderIdInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, cj_order_id")
      .eq("id", data.orderId)
      .single();
    if (!order?.cj_order_id) throw new Error("No CJ order linked");
    const preferred = process.env.CJ_LOGISTIC_NAME?.trim() || "CJPacket Ordinary";
    const applied = await applyCJOrderLogistics(order.cj_order_id, preferred);
    if (!applied) throw new Error("Could not set CJ shipping — pick logistics in CJ dashboard");
    await supabaseAdmin.from("orders").update({ cj_error: null }).eq("id", data.orderId);
    return { ok: true, message: `CJ shipping: ${applied}` };
  });

export const getCJStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    await assertStaffOrAdmin(context.userId);
    const configured = cjConfigured();
    if (!configured) return { configured: false, connected: false, message: "Add CJ_API_KEY in .env" };
    try {
      await getCJAccessToken();
      return { configured: true, connected: true, message: "Connected to CJ Dropshipping" };
    } catch (err) {
      return { configured: true, connected: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  });

const estimateInput = z.object({
  productId: z.string().min(5),
  destCountryCode: z.string().default("IN"),
  pincode: z.string().max(12).optional(),
  logisticName: z.string().optional(),
  sellPriceInr: z.number().positive().optional(),
});

/** Estimate CJ product + shipping cost and recommended selling price before import. */
export const estimateCJImportProfit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => estimateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    if (!cjConfigured()) throw new Error("CJ not configured");

    const detail = await fetchCJProductDetail(data.productId);
    if (!detail.variants.length) throw new Error("No variants on CJ product");

    const baseVariant = detail.variants[0];
    const productCostUsd = baseVariant.variantSellPrice || detail.sellPriceUsd;
    if (!productCostUsd) throw new Error("Could not read CJ product cost");

    const freightPayload: Record<string, unknown> = {
      startCountryCode: "CN",
      endCountryCode: data.destCountryCode || "IN",
      products: [{ quantity: 1, vid: baseVariant.vid }],
    };
    if (data.pincode?.trim()) freightPayload.zip = data.pincode.trim();

    const freightRaw = await cjFetch<Array<Record<string, unknown>>>("/logistic/freightCalculate", {
      method: "POST",
      body: JSON.stringify(freightPayload),
    });

    const shippingOptions: CJLogisticsOption[] = (freightRaw ?? [])
      .map((row) => ({
        logisticName: String(row.logisticName ?? ""),
        logisticPriceUsd: Number(row.logisticPrice ?? row.totalPostageFee ?? 0),
        logisticAging: String(row.logisticAging ?? ""),
      }))
      .filter((o) => o.logisticName && o.logisticPriceUsd > 0);

    if (!shippingOptions.length) throw new Error("No shipping options returned for India");

    const preferred = data.logisticName?.trim() || process.env.CJ_LOGISTIC_NAME?.trim();
    const estimate = buildProfitEstimate({
      productName: detail.nameEn,
      variantCount: detail.variants.length,
      productCostUsd,
      shippingOptions,
      preferredLogistic: preferred,
    });

    const preview = data.sellPriceInr
      ? profitFromSelling(estimate.totalCostInr, data.sellPriceInr)
      : undefined;

    return { ...estimate, preview };
  });

export type { CJListProduct };

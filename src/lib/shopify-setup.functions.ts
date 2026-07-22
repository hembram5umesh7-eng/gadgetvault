import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { shopifyStoreDomain } from "@/integrations/shopify/config";
import { resolveShopifyAdminAccessToken } from "@/integrations/shopify/admin-auth";
import {
  getStoredShopifyAdminToken,
  getStoredShopifyClientSecret,
  saveStoredShopifyAdminToken,
  clearStoredShopifyAdminToken,
  saveStoredShopifyClientSecret,
  saveStoredShopifyAutomationToken,
} from "@/lib/shopify-token-store";
import { publishAllProductsToHeadless } from "@/integrations/shopify/publish";
import { fetchShopifyProducts } from "@/integrations/shopify/storefront";
import { productMatchesNavCategory, toCategoryMatchInput, NAV_CATEGORY_SLUGS } from "@/lib/category-map";
import { syncOrderToShopifyById } from "@/lib/shopify-order.functions";
import { syncAllOrderStatusesWithShopify, ensureShopifyOrderWebhooks } from "@/lib/shopify-order-inbound";
import { appLocalOrigin, appPublicOrigin, shopifyAdminOAuthCallbackUrl, shopifyCustomerApiSetupValues } from "@/lib/site-url";

const REQUIRED_SCOPES = [
  "read_products",
  "write_products",
  "read_publications",
  "write_publications",
  "read_draft_orders",
  "write_draft_orders",
  "read_orders",
  "write_orders",
] as const;

export type ScopeCheck = { name: string; ok: boolean; detail: string };

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Admin access required");
}

async function checkScopesWithToken(token: string, domain: string): Promise<ScopeCheck[]> {
  async function gql(query: string) {
    const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query }),
    });
    const json = (await res.json()) as { errors?: { message: string }[] };
    return json.errors?.[0]?.message ?? null;
  }

  const map: Record<string, string> = {
    read_products: "query { products(first: 1) { edges { node { id } } } }",
    read_publications: "query { publications(first: 1) { edges { node { id } } } }",
    write_publications:
      'mutation { publishablePublish(id: "gid://shopify/Product/1", input: [{ publicationId: "gid://shopify/Publication/1" }]) { userErrors { message } } }',
    read_draft_orders: "query { draftOrders(first: 1) { edges { node { id } } } }",
    write_draft_orders:
      'mutation { draftOrderCreate(input: { email: "test@example.com", lineItems: [] }) { userErrors { message } } }',
    read_orders: "query { orders(first: 1) { edges { node { id } } } }",
    write_orders:
      'mutation { orderCancel(orderId: "gid://shopify/Order/1", notifyCustomer: false, refund: false, restock: true, reason: CUSTOMER) { orderCancelUserErrors { message } } }',
  };

  const checks: ScopeCheck[] = [];
  for (const name of REQUIRED_SCOPES) {
    if (name === "write_products") {
      checks.push({ name, ok: checks.find((c) => c.name === "read_products")?.ok ?? false, detail: "Bundled with product access" });
      continue;
    }
    if (name === "write_orders") {
      const err = await gql(map.write_orders);
      const ok = !err || /not found|does not exist|invalid id|cannot be cancelled|already cancelled/i.test(err);
      checks.push({ name, ok, detail: ok ? "OK" : err ?? "Missing — order cancel sync won't work" });
      continue;
    }
    const err = await gql(map[name]);
    const ok =
      !err ||
      (name.startsWith("write_") && /invalid id|not found|does not exist|line items|can't be blank/i.test(err));
    checks.push({ name, ok, detail: ok ? "OK" : err ?? "Unknown" });
  }
  return checks;
}

export const getShopifySetupStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const domain = shopifyStoreDomain();
    const hasDbToken = Boolean(await getStoredShopifyAdminToken());
    const hasEnvToken = Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim());
    const hasClientSecret = Boolean(await getStoredShopifyClientSecret()) || Boolean(process.env.SHOPIFY_CLIENT_SECRET?.trim());
    const clientId = process.env.SHOPIFY_CLIENT_ID?.trim() ?? "";

    let scopes: ScopeCheck[] = [];
    let tokenSource: "database" | "env" | "none" = "none";
    let connectError: string | null = null;
    let installedScopes: string[] = [];
    try {
      const token = await resolveShopifyAdminAccessToken();
      if (hasDbToken) tokenSource = "database";
      else if (hasEnvToken) tokenSource = "env";
      if (token && domain) {
        scopes = await checkScopesWithToken(token, domain);
        const installRes = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
          body: JSON.stringify({
            query: "query { currentAppInstallation { accessScopes { handle } app { title } } }",
          }),
        });
        const installJson = (await installRes.json()) as {
          data?: { currentAppInstallation?: { accessScopes?: { handle: string }[] } };
        };
        installedScopes =
          installJson.data?.currentAppInstallation?.accessScopes?.map((s) => s.handle) ?? [];
      }
    } catch (err) {
      connectError = err instanceof Error ? err.message : "Not connected";
      scopes = REQUIRED_SCOPES.map((name) => ({ name, ok: false, detail: "No token connected" }));
      if (domain && clientId && hasClientSecret) {
        try {
          const oauth = await fetch(`https://${domain}/admin/oauth/access_token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: clientId,
              client_secret: (await getStoredShopifyClientSecret()) || process.env.SHOPIFY_CLIENT_SECRET || "",
            }),
          });
          if (oauth.ok) {
            const { access_token } = (await oauth.json()) as { access_token?: string };
            if (access_token) {
              const installRes = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": access_token },
                body: JSON.stringify({
                  query: "query { currentAppInstallation { accessScopes { handle } } }",
                }),
              });
              const installJson = (await installRes.json()) as {
                data?: { currentAppInstallation?: { accessScopes?: { handle: string }[] } };
              };
              installedScopes =
                installJson.data?.currentAppInstallation?.accessScopes?.map((s) => s.handle) ?? [];
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    const products = await fetchShopifyProducts({ first: 250 }).catch(() => []);
    const byCategory = Object.fromEntries(
      NAV_CATEGORY_SLUGS.map((slug) => [
        slug,
        products.filter((node) => productMatchesNavCategory(toCategoryMatchInput(node), slug)).length,
      ]),
    ) as Record<string, number>;

    const { count: pendingOrders } = await supabaseAdmin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .is("shopify_order_id", null)
      .neq("status", "cancelled");

    const scopesReady = scopes.length > 0 && scopes.every((s) => s.ok);
    const ordersScopeReady =
      scopes.find((s) => s.name === "read_orders")?.ok === true &&
      scopes.find((s) => s.name === "write_orders")?.ok === true;

    return {
      domain,
      clientId,
      hasClientSecret,
      connectError,
      installedScopes,
      needsOAuthInstall: installedScopes.length === 0,
      oauthRedirectUrl: shopifyAdminOAuthCallbackUrl(),
      tokenSource,
      hasToken: tokenSource !== "none",
      scopes,
      scopesReady,
      ordersScopeReady,
      storefrontProductCount: products.length,
      byCategory,
      pendingShopifyOrders: pendingOrders ?? 0,
      shopifyAppSettingsUrl: "https://admin.shopify.com/store/gharstoreessential/settings/apps/development",
      shopifyDevDashboardUrl: "https://dev.shopify.com/dashboard/225470476/apps/399134490625/settings",
      shopifyDevVersionsUrl: "https://dev.shopify.com/dashboard/225470476/apps/399134490625/versions",
      shopifyHeadlessCustomerApiUrl:
        "https://admin.shopify.com/store/gharstoreessential/headless/307797/customer_api",
      customerApiSetup: shopifyCustomerApiSetupValues(),
      requiredScopes: [...REQUIRED_SCOPES],
    };
  });

export const saveShopifyClientSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ secret: z.string().min(10) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await saveStoredShopifyClientSecret(data.secret);
    return { ok: true as const, message: "Client secret saved — ab Connect Shopify dabao" };
  });

export const saveShopifyAutomationToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ token: z.string().min(20) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await saveStoredShopifyAutomationToken(data.token);
    return { ok: true as const, message: "Automation token saved (CI/CD deploy ke liye)" };
  });

export const saveShopifyAdminToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ token: z.string().min(20) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await saveStoredShopifyAdminToken(data.token);
    const domain = shopifyStoreDomain();
    const scopes = await checkScopesWithToken(data.token.trim(), domain);
    const scopesReady = scopes.every((s) => s.ok);
    return {
      ok: true as const,
      scopes,
      scopesReady,
      message: scopesReady
        ? "Shopify connected! Ab 'Sync Everything' dabao."
        : "Token saved lekin kuch scopes missing hain — neeche checklist dekho aur app reinstall karo.",
    };
  });

export const disconnectShopifyAdminToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    await clearStoredShopifyAdminToken();
    return { ok: true as const };
  });

export const runFullShopifySync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const domain = shopifyStoreDomain();
    let scopesReady = false;
    try {
      const token = await resolveShopifyAdminAccessToken();
      const scopes = await checkScopesWithToken(token, domain);
      scopesReady = scopes.every((s) => s.ok);
    } catch {
      scopesReady = false;
    }

    if (!scopesReady) {
      return {
        ok: false as const,
        message: "Pehle Admin → Shopify Connect par sahi token save karo.",
        products: null,
        orders: null,
      };
    }

    const products = await publishAllProductsToHeadless();

    const { data: pending } = await supabaseAdmin
      .from("orders")
      .select("id, order_number")
      .is("shopify_order_id", null)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true })
      .limit(50);

    let ordersSynced = 0;
    let ordersFailed = 0;
    const orderErrors: string[] = [];

    for (const o of pending ?? []) {
      try {
        await syncOrderToShopifyById(o.id);
        ordersSynced++;
      } catch (err) {
        ordersFailed++;
        orderErrors.push(`${o.order_number}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    let inboundSync = { inbound: { checked: 0, updated: 0, cancelled: 0, errors: [] as string[] }, outbound: { checked: 0, pushed: 0, errors: [] as string[] } };
    let webhooks = { address: "", created: [] as string[], skipped: [] as string[] };
    try {
      webhooks = await ensureShopifyOrderWebhooks(appPublicOrigin());
    } catch (err) {
      orderErrors.push(`Webhooks: ${err instanceof Error ? err.message : "setup failed"}`);
    }
    try {
      inboundSync = await syncAllOrderStatusesWithShopify(100);
    } catch (err) {
      orderErrors.push(`Inbound sync: ${err instanceof Error ? err.message : "failed"}`);
    }

    const parts = [products.ok ? products.message : products.message];
    if (pending?.length) parts.push(`Orders pushed: ${ordersSynced}, failed: ${ordersFailed}`);
    if (inboundSync.inbound.updated || inboundSync.outbound.pushed) {
      parts.push(
        `Status sync: ${inboundSync.inbound.updated} from Shopify, ${inboundSync.outbound.pushed} cancels pushed to Shopify`,
      );
    }
    if (webhooks.created.length) parts.push(`Webhooks registered: ${webhooks.created.join(", ")}`);

    return {
      ok: products.ok && ordersFailed === 0,
      message: parts.join(" · "),
      products,
      orders: { synced: ordersSynced, failed: ordersFailed, errors: orderErrors.slice(0, 5), inbound: inboundSync },
    };
  });

export const pushCustomerApiUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const { join } = await import("node:path");
    const { spawnSync } = await import("node:child_process");
    const script = join(process.cwd(), "scripts", "push-customer-api-urls.mjs");
    const result = spawnSync(process.execPath, ["--env-file=.env", script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
    });

    const setup = shopifyCustomerApiSetupValues();
    if (result.status === 0) {
      return {
        ok: true as const,
        message: "Customer API URLs Shopify Admin mein set ho gaye!",
        setup,
      };
    }

    return {
      ok: false as const,
      message:
        "Auto-push nahi hua (Shopify login chahiye). Neeche Copy All dabao → Customer API page par paste karo → Save.",
      setup,
      log: (result.stderr || result.stdout || "").slice(-500),
    };
  });

export const openShopifyPageInBrave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ url: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { openInBrave } = await import("../../scripts/brave-browser.mjs");
    const opened = openInBrave(data.url);
    return {
      ok: opened,
      message: opened ? "Brave browser mein khola" : "Brave nahi mila — link manually kholo",
    };
  });

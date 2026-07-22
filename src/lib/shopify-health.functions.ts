import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchShopifyProducts } from "@/integrations/shopify/storefront";
import { productMatchesNavCategory, toCategoryMatchInput, NAV_CATEGORY_SLUGS } from "@/lib/category-map";
import { resolveShopifyAdminAccessToken } from "@/integrations/shopify/admin-auth";
import { shopifyStoreDomain } from "@/integrations/shopify/config";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Admin access required");
}

type AdminScopeCheck = { name: string; ok: boolean; detail: string };

async function checkAdminScopes(token: string, domain: string): Promise<AdminScopeCheck[]> {
  async function gql(query: string) {
    const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query }),
    });
    const json = (await res.json()) as { errors?: { message: string }[] };
    return json.errors?.[0]?.message ?? null;
  }

  const checks: AdminScopeCheck[] = [];
  const productsErr = await gql("query { products(first: 1) { edges { node { id } } } }");
  checks.push({
    name: "read_products",
    ok: !productsErr,
    detail: productsErr ?? "OK",
  });

  const pubErr = await gql("query { publications(first: 1) { edges { node { id } } } }");
  checks.push({
    name: "read_publications",
    ok: !pubErr,
    detail: pubErr ?? "OK",
  });

  const writeErr = await gql(
    `mutation { publishablePublish(id: "gid://shopify/Product/1", input: [{ publicationId: "gid://shopify/Publication/1" }]) { userErrors { message } } }`,
  );
  checks.push({
    name: "write_publications",
    ok: !writeErr || /invalid id|not found|does not exist/i.test(writeErr),
    detail: writeErr && !/invalid id|not found|does not exist/i.test(writeErr) ? writeErr : "OK",
  });

  return checks;
}

export const getShopifyStorefrontHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const products = await fetchShopifyProducts({ first: 250 });
    const byCategory = Object.fromEntries(
      NAV_CATEGORY_SLUGS.map((slug) => [
        slug,
        products.filter((node) => productMatchesNavCategory(toCategoryMatchInput(node), slug)).length,
      ]),
    ) as Record<string, number>;

    let adminScopes: AdminScopeCheck[] = [];
    try {
      const token = await resolveShopifyAdminAccessToken();
      const domain = shopifyStoreDomain();
      if (token && domain) adminScopes = await checkAdminScopes(token, domain);
    } catch {
      adminScopes = [{ name: "admin_token", ok: false, detail: "No valid Admin API token" }];
    }

    const scopesReady = adminScopes.every((s) => s.ok);

    return {
      storefrontProductCount: products.length,
      byCategory,
      adminScopes,
      scopesReady,
      manualFixUrl: "https://admin.shopify.com/store/gharstoreessential/products?selectedView=all",
      message:
        products.length === 0
          ? "Koi product Headless (gadgetvault) channel par nahi hai."
          : byCategory["kitchen-accessories"] === 0
            ? "Kitchen products Shopify mein hain lekin Headless channel par publish nahi hue — Sync chalao ya manually Headless checkbox lagao."
            : "Storefront sync theek lag raha hai.",
    };
  });

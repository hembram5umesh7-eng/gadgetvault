import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { shopifyAdminConfigured, shopifyAdminQuery } from "@/integrations/shopify/admin";
import { shopifyStoreDomain } from "@/integrations/shopify/config";
import { dropshipIndiaPortalUrl } from "@/lib/dropship-india-config";

async function getUserRoles(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const dbRoles = (data ?? []).map((r) => r.role as string);
  if (dbRoles.some((r) => r === "admin" || r === "sub_admin")) return dbRoles;

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  const meta = authUser.user?.app_metadata?.roles;
  if (Array.isArray(meta)) {
    const metaRoles = meta.filter((r): r is string => typeof r === "string");
    return [...new Set([...dbRoles, ...metaRoles])];
  }
  return dbRoles;
}

async function assertSuperAdmin(userId: string) {
  const roles = await getUserRoles(userId);
  if (!roles.includes("admin")) throw new Error("Forbidden: super admin only");
}

async function assertSubAdmin(userId: string) {
  const roles = await getUserRoles(userId);
  if (!roles.includes("sub_admin")) throw new Error("Forbidden: sub-admin only");
}

async function assertSubAdminOrAdmin(userId: string) {
  const roles = await getUserRoles(userId);
  if (!roles.includes("sub_admin") && !roles.includes("admin")) throw new Error("Forbidden");
}

export type ShopifyProductRow = {
  id: string;
  title: string;
  handle: string;
  status: string;
  createdAt: string;
  imageUrl: string | null;
  priceInr: number | null;
  alreadyClaimed: boolean;
  claimedByMe: boolean;
  pushedByName: string | null;
  pushedByEmail: string | null;
  pushedAt: string | null;
};

type ClaimRow = { shopify_product_id: string; pushed_by: string; created_at: string };

async function loadClaimPusherNames(claims: ClaimRow[]) {
  const userIds = [...new Set(claims.map((c) => c.pushed_by))];
  if (!userIds.length) return new Map<string, { name: string; email: string }>();

  const [{ data: profiles }, { data: authUsers }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds),
    supabaseAdmin.auth.admin.listUsers({ perPage: 500 }),
  ]);

  const map = new Map<string, { name: string; email: string }>();
  for (const uid of userIds) {
    const profile = profiles?.find((p) => p.id === uid);
    const authUser = authUsers.users.find((u) => u.id === uid);
    map.set(uid, {
      name: profile?.full_name ?? authUser?.user_metadata?.full_name ?? authUser?.email?.split("@")[0] ?? "Sub-admin",
      email: authUser?.email ?? "—",
    });
  }
  return map;
}

async function fetchRecentShopifyProducts(limit = 40, currentUserId?: string): Promise<ShopifyProductRow[]> {
  if (!shopifyAdminConfigured()) throw new Error("Shopify Admin not connected — admin ko Shopify Connect setup karna hoga");

  const data = await shopifyAdminQuery<{
    products: {
      edges: {
        node: {
          id: string;
          title: string;
          handle: string;
          status: string;
          createdAt: string;
          featuredImage: { url: string } | null;
          variants: { edges: { node: { price: string } }[] };
        };
      }[];
    };
  }>(
    `query RecentProducts($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id title handle status createdAt
            featuredImage { url }
            variants(first: 1) { edges { node { price } } }
          }
        }
      }
    }`,
    { first: limit },
  );

  const { data: claims } = await supabaseAdmin
    .from("product_push_log")
    .select("shopify_product_id, pushed_by, created_at");

  const claimRows = (claims ?? []) as ClaimRow[];
  const claimMap = new Map(claimRows.map((c) => [c.shopify_product_id, c]));
  const pusherNames = await loadClaimPusherNames(claimRows);

  return (data.products.edges ?? []).map(({ node }) => {
    const claim = claimMap.get(node.id);
    const pusher = claim ? pusherNames.get(claim.pushed_by) : null;
    return {
      id: node.id,
      title: node.title,
      handle: node.handle,
      status: node.status,
      createdAt: node.createdAt,
      imageUrl: node.featuredImage?.url ?? null,
      priceInr: node.variants.edges[0] ? Number(node.variants.edges[0].node.price) : null,
      alreadyClaimed: Boolean(claim),
      claimedByMe: Boolean(claim && currentUserId && claim.pushed_by === currentUserId),
      pushedByName: pusher?.name ?? null,
      pushedByEmail: pusher?.email ?? null,
      pushedAt: claim?.created_at ?? null,
    };
  });
}

const createSubAdminInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().min(1).max(120),
});

/** Super admin creates sub-admin (Dropship India push only). */
export const createSubAdminMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSubAdminInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const found = existing.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    let userId = found?.id;

    if (found) {
      const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", found.id);
      const roleList = (roles ?? []).map((r) => r.role).filter((r) => r !== "sub_admin");
      await supabaseAdmin.auth.admin.updateUserById(found.id, {
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
        app_metadata: { roles: [...new Set([...roleList, "user", "sub_admin"])] },
      });
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
        app_metadata: { roles: ["user", "sub_admin"] },
      });
      if (error || !created.user) throw new Error(error?.message ?? "Failed to create sub-admin");
      userId = created.user.id;
    }

    const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId!, role: "sub_admin" as never },
      { onConflict: "user_id,role" },
    );
    if (roleErr) throw new Error(`Sub-admin role save failed: ${roleErr.message}`);

    await supabaseAdmin.from("profiles").upsert({ id: userId!, full_name: data.fullName });

    return {
      success: true,
      userId,
      email: data.email,
      password: data.password,
      loginUrl: "/auth?redirect=/subadmin",
      portal: "Sub-Admin Portal",
    };
  });

export const removeSubAdminMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "sub_admin");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
    const appRoles = (roles ?? []).map((r) => r.role);
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      app_metadata: { roles: appRoles.length ? appRoles : ["user"] },
    });
    return { success: true };
  });

export const listSubAdminsWithStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "sub_admin");

    if (!roleRows?.length) return { subAdmins: [] as SubAdminRow[] };

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name");
    const { data: pushes } = await supabaseAdmin
      .from("product_push_log")
      .select("pushed_by, admin_live, created_at");

    const stats = new Map<string, { total: number; live: number; lastPush: string | null }>();
    for (const p of pushes ?? []) {
      const cur = stats.get(p.pushed_by) ?? { total: 0, live: 0, lastPush: null };
      cur.total += 1;
      if (p.admin_live) cur.live += 1;
      if (!cur.lastPush || p.created_at > cur.lastPush) cur.lastPush = p.created_at;
      stats.set(p.pushed_by, cur);
    }

    const subAdmins: SubAdminRow[] = roleRows.map((r) => {
      const authUser = authUsers.users.find((u) => u.id === r.user_id);
      const profile = profiles?.find((p) => p.id === r.user_id);
      const s = stats.get(r.user_id) ?? { total: 0, live: 0, lastPush: null };
      return {
        userId: r.user_id,
        email: authUser?.email ?? "—",
        fullName: profile?.full_name ?? authUser?.user_metadata?.full_name ?? "—",
        createdAt: r.created_at,
        pushCount: s.total,
        liveCount: s.live,
        lastPushAt: s.lastPush,
      };
    });

    return { subAdmins };
  });

export type SubAdminRow = {
  userId: string;
  email: string;
  fullName: string;
  createdAt: string;
  pushCount: number;
  liveCount: number;
  lastPushAt: string | null;
};

export const getSubAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSubAdmin(context.userId);

    const domain = shopifyStoreDomain();
    const dropshipPortal = dropshipIndiaPortalUrl();

    const { count: myPushes } = await supabaseAdmin
      .from("product_push_log")
      .select("id", { count: "exact", head: true })
      .eq("pushed_by", context.userId);

    const { count: pendingLive } = await supabaseAdmin
      .from("product_push_log")
      .select("id", { count: "exact", head: true })
      .eq("pushed_by", context.userId)
      .eq("admin_live", false);

    const { data: recent } = await supabaseAdmin
      .from("product_push_log")
      .select("*")
      .eq("pushed_by", context.userId)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      shopifyAdminUrl: null,
      dropshipIndiaUrl: dropshipPortal,
      myPushCount: myPushes ?? 0,
      pendingAdminLive: pendingLive ?? 0,
      recentPushes: recent ?? [],
    };
  });

export const listShopifyProductsForSubAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSubAdmin(context.userId);
    const products = await fetchRecentShopifyProducts(50, context.userId);
    return { products };
  });

const registerPushInput = z.object({
  shopifyProductId: z.string().min(10),
  title: z.string().min(1),
  handle: z.string().optional(),
  status: z.string().optional(),
  imageUrl: z.string().optional(),
  priceInr: z.number().optional(),
  notes: z.string().max(500).optional(),
});

/** Sub-admin registers a product they pushed via Dropship India. */
export const registerProductPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => registerPushInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertSubAdmin(context.userId);

    const { data: existing } = await supabaseAdmin
      .from("product_push_log")
      .select("pushed_by, shopify_product_title")
      .eq("shopify_product_id", data.shopifyProductId)
      .maybeSingle();

    if (existing && existing.pushed_by !== context.userId) {
      throw new Error(`Ye product pehle se kisi aur sub-admin ne register kiya hai: ${existing.shopify_product_title}`);
    }

    const row = {
      shopify_product_id: data.shopifyProductId,
      shopify_product_title: data.title,
      shopify_product_handle: data.handle ?? null,
      shopify_product_status: data.status ?? "DRAFT",
      shopify_image_url: data.imageUrl ?? null,
      shopify_price_inr: data.priceInr ?? null,
      pushed_by: context.userId,
      push_source: "dropship_india",
      admin_live: false,
      notes: data.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from("product_push_log").upsert(row, {
      onConflict: "shopify_product_id",
    });
    if (error) throw new Error(error.message);

    return { ok: true as const, message: `"${data.title}" register ho gaya — admin Shopify mein live karega` };
  });

export const listMyProductPushes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSubAdminOrAdmin(context.userId);

    const userId = context.userId;
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    let query = supabaseAdmin.from("product_push_log").select("*").order("created_at", { ascending: false }).limit(100);
    if (!isAdmin) query = query.eq("pushed_by", userId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { pushes: data ?? [] };
  });

export const listAllProductPushesForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);

    const { data: pushes, error } = await supabaseAdmin
      .from("product_push_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    const userIds = [...new Set((pushes ?? []).map((p) => p.pushed_by))];
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds);
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });

    const enriched = (pushes ?? []).map((p) => {
      const profile = profiles?.find((pr) => pr.id === p.pushed_by);
      const authUser = authUsers.users.find((u) => u.id === p.pushed_by);
      return {
        ...p,
        pusherName: profile?.full_name ?? authUser?.user_metadata?.full_name ?? authUser?.email ?? "—",
        pusherEmail: authUser?.email ?? "—",
      };
    });

    return { pushes: enriched };
  });

export const markProductPushLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ pushId: z.string().uuid(), live: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("product_push_log")
      .update({ admin_live: data.live, updated_at: new Date().toISOString() })
      .eq("id", data.pushId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getDropshipIndiaUrls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSubAdminOrAdmin(context.userId);
    return {
      /** Sub-admin opens this — own Dropship India login, no Shopify password */
      dropshipIndiaPortal: dropshipIndiaPortalUrl(),
      /** Server-side sync uses admin token — sub-admin never needs Shopify login */
      syncViaServer: true as const,
      storeDomain: shopifyStoreDomain(),
    };
  });

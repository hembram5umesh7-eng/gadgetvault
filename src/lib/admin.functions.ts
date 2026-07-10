import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path?.[0];
    if (field === "email") throw new Error("Enter a valid email address (e.g. supplier@company.com)");
    throw new Error(issue?.message ?? "Invalid input");
  }
  return result.data;
}

async function assertSuperAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!data?.some((r) => r.role === "admin")) throw new Error("Forbidden: super admin only");
}

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Forbidden");
}

const deleteProductInput = z.object({ productId: z.string().uuid() });

/** Delete product + variants. Past orders keep product_name snapshot (product_id set null). */
export const deleteAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => parseInput(deleteProductInput, input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, name")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product) throw new Error("Product not found");

    const { count: orderCount } = await supabaseAdmin
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", data.productId);

    await supabaseAdmin.from("product_variants").delete().eq("product_id", data.productId);
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.productId);
    if (error) throw new Error(error.message);

    return {
      ok: true as const,
      name: product.name,
      hadOrders: (orderCount ?? 0) > 0,
      message:
        (orderCount ?? 0) > 0
          ? `"${product.name}" deleted. ${orderCount} past order(s) still show product name in history.`
          : `"${product.name}" deleted.`,
    };
  });

const setupLoginInput = z.object({
  manufacturerId: z.string().uuid(),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8).max(72),
  fullName: z.string().min(1).max(120).optional(),
});

/** Create or reset supplier portal login with email + password. */
export const setupSupplierLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => parseInput(setupLoginInput, input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    const { data: mfr } = await supabaseAdmin.from("manufacturers").select("name").eq("id", data.manufacturerId).maybeSingle();
    if (!mfr) throw new Error("Supplier not found");

    const fullName = data.fullName?.trim() || mfr.name;
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const found = existing.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    let userId = found?.id;

    if (found) {
      const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", found.id);
      const roleList = (roles ?? []).map((r) => r.role).filter((r) => r !== "manufacturer");
      const appRoles = [...new Set([...roleList, "user", "manufacturer"])];
      await supabaseAdmin.auth.admin.updateUserById(found.id, {
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
        app_metadata: { roles: appRoles },
      });
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
        app_metadata: { roles: ["user", "manufacturer"] },
      });
      if (error || !created.user) throw new Error(error?.message ?? "Failed to create supplier login");
      userId = created.user.id;
    }

    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId!, role: "manufacturer" },
      { onConflict: "user_id,role" },
    );

    await supabaseAdmin.from("profiles").upsert({
      id: userId!,
      full_name: fullName,
    });

    const { error: mErr } = await supabaseAdmin
      .from("manufacturers")
      .update({ user_id: userId!, contact_email: data.email })
      .eq("id", data.manufacturerId);
    if (mErr) throw new Error(mErr.message);

    return {
      success: true,
      userId,
      email: data.email,
      password: data.password,
      loginUrl: "/auth?redirect=/partner",
      portal: "Supplier Dashboard",
    };
  });

const linkInput = z.object({
  manufacturerId: z.string().uuid(),
  email: z.string().email(),
});

export const linkSupplierUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => parseInput(linkInput, input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (listErr) throw new Error(listErr.message);
    const user = users.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!user) throw new Error("No user found with that email. Ask them to sign up first.");

    await supabaseAdmin.from("user_roles").upsert(
      { user_id: user.id, role: "manufacturer" },
      { onConflict: "user_id,role" },
    );

    const roles = ["user", "manufacturer"];
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { roles },
    });

    const { error: mErr } = await supabaseAdmin
      .from("manufacturers")
      .update({ user_id: user.id, contact_email: data.email })
      .eq("id", data.manufacturerId);
    if (mErr) throw new Error(mErr.message);

    return { success: true, userId: user.id };
  });

const createStaffInput = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8).max(72),
  fullName: z.string().min(1).max(120),
});

export const createStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => parseInput(createStaffInput, input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const found = existing.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    let userId = found?.id;

    if (found) {
      await supabaseAdmin.auth.admin.updateUserById(found.id, {
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
        app_metadata: { roles: ["user", "staff"] },
      });
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
        app_metadata: { roles: ["user", "staff"] },
      });
      if (error || !created.user) throw new Error(error?.message ?? "Failed to create staff user");
      userId = created.user.id;
    }

    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId!, role: "staff" },
      { onConflict: "user_id,role" },
    );

    await supabaseAdmin.from("profiles").upsert({
      id: userId!,
      full_name: data.fullName,
    });

    return {
      success: true,
      userId,
      email: data.email,
      password: data.password,
      loginUrl: "/auth?redirect=/staff",
      portal: "Worker Portal",
    };
  });

const removeStaffInput = z.object({ userId: z.string().uuid() });

export const removeStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => parseInput(removeStaffInput, input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Cannot remove your own admin access here");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "staff");

    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
    const roleList = (roles ?? []).map((r) => r.role);
    const appRoles = roleList.length ? roleList : ["user"];
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      app_metadata: { roles: appRoles },
    });

    return { success: true };
  });

export const listStaffMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at")
      .eq("role", "staff");

    if (!roleRows?.length) return { staff: [] as { userId: string; email: string; fullName: string; createdAt: string }[] };

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name");

    const staff = roleRows.map((r) => {
      const authUser = authUsers.users.find((u) => u.id === r.user_id);
      const profile = profiles?.find((p) => p.id === r.user_id);
      return {
        userId: r.user_id,
        email: authUser?.email ?? "—",
        fullName: profile?.full_name ?? authUser?.user_metadata?.full_name ?? "—",
        createdAt: r.created_at,
      };
    });

    return { staff };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const submitInput = z.object({
  productId: z.string().min(1),
  productSlug: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().min(10).max(2000),
});

export const submitProductReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => submitInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await supabaseAdmin
      .from("product_reviews")
      .upsert(
        {
          product_id: data.productId,
          product_slug: data.productSlug,
          user_id: context.userId,
          rating: data.rating,
          title: data.title?.trim() || null,
          body: data.body.trim(),
          approved: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_slug,user_id" },
      )
      .select("id, rating, title, body, created_at")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true as const, review: row };
  });

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Forbidden");
}

export const listReviewsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaffOrAdmin(context.userId);
    const { data: reviews } = await supabaseAdmin
      .from("product_reviews")
      .select("id, product_id, user_id, rating, title, body, approved, created_at, products(name, slug)")
      .order("created_at", { ascending: false })
      .limit(200);

    const userIds = [...new Set((reviews ?? []).map((r) => r.user_id))];
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    return {
      reviews: (reviews ?? []).map((r) => ({
        ...r,
        authorName: nameMap.get(r.user_id) ?? "Customer",
        productName: (r.products as { name?: string; slug?: string } | null)?.name ?? "Product",
        productSlug: (r.products as { name?: string; slug?: string } | null)?.slug ?? "",
      })),
    };
  });

const modInput = z.object({ id: z.string().uuid() });

export const deleteReviewAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => modInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const { error } = await supabaseAdmin.from("product_reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const toggleReviewApproved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), approved: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("product_reviews")
      .update({ approved: data.approved, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

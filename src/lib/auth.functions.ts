import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkRateLimit } from "@/lib/rate-limit";
import { attachReferralOnSignup } from "@/lib/referral.functions";

const registerInput = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  referralCode: z.string().trim().max(20).optional(),
});

async function findUserByEmail(email: string) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) break;
    page++;
  }
  return null;
}

async function ensureShopperProfile(userId: string, fullName: string) {
  await supabaseAdmin.from("profiles").upsert(
    { id: userId, full_name: fullName },
    { onConflict: "id" },
  );
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "user")
    .maybeSingle();
  if (!role) {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "user" });
  }
}

/** Create customer account with email auto-confirmed (no email verification block). */
export const registerCustomer = createServerFn({ method: "POST" })
  .inputValidator((input) => registerInput.parse(input))
  .handler(async ({ data }) => {
    const req = getRequest();
    const ip = req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req?.headers.get("x-real-ip") || "client";
    checkRateLimit(`register:${ip}`, 8, 60_000);
    checkRateLimit(`register-email:${data.email.trim().toLowerCase()}`, 5, 60_000);

    const email = data.email.trim().toLowerCase();
    const fullName = data.fullName.trim();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (!error && created.user) {
      await ensureShopperProfile(created.user.id, fullName);
      await attachReferralOnSignup(created.user.id, data.referralCode);
      return { ok: true as const, message: "Account created successfully" };
    }

    const msg = (error?.message ?? "").toLowerCase();
    const alreadyExists =
      msg.includes("already") || msg.includes("registered") || msg.includes("exists") || msg.includes("duplicate");

    if (!alreadyExists) {
      throw new Error(error?.message ?? "Could not create account");
    }

    const existing = await findUserByEmail(email);
    if (!existing) {
      throw new Error("This email is already registered. Try signing in.");
    }

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      password: data.password,
      user_metadata: { full_name: fullName },
    });
    if (updErr) throw new Error(updErr.message);

    await ensureShopperProfile(existing.id, fullName);
    await attachReferralOnSignup(existing.id, data.referralCode);
    return { ok: true as const, message: "Account ready — you can sign in now", repaired: true };
  });

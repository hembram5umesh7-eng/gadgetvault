import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isShopperAccount } from "@/lib/auth-session";

const visitInput = z.object({
  sessionKey: z.string().min(8).max(64),
  path: z.string().max(200).default("/"),
});

/** Record one visit per browser session (rate-limited, no PII). */
export const recordSiteVisit = createServerFn({ method: "POST" })
  .inputValidator((input) => visitInput.parse(input))
  .handler(async ({ data, context }) => {
    checkRateLimit(`visit:${data.sessionKey}`, 30, 60_000);
    const path = data.path.startsWith("/") ? data.path.slice(0, 200) : "/";
    await supabaseAdmin.from("site_visits").insert({
      session_key: data.sessionKey,
      path,
      user_id: context?.userId ?? null,
    });
    return { ok: true as const };
  });

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Forbidden");
}

function istDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  }
  return days;
}

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaffOrAdmin(context.userId);

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [
      { data: visits },
      { data: orders },
      { data: profiles },
      { data: roleRows },
      { count: productCount },
    ] = await Promise.all([
      supabaseAdmin.from("site_visits").select("session_key,visited_at").gte("visited_at", since.toISOString()),
      supabaseAdmin.from("orders").select("total,created_at,status").gte("created_at", since.toISOString()),
      supabaseAdmin.from("profiles").select("id,created_at"),
      supabaseAdmin.from("user_roles").select("user_id,role"),
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }),
    ]);

    const roleMap: Record<string, string[]> = {};
    (roleRows ?? []).forEach((r: { user_id: string; role: string }) => {
      (roleMap[r.user_id] ??= []).push(r.role);
    });
    const shopperIds = new Set(
      (profiles ?? [])
        .filter((p: { id: string }) => isShopperAccount(roleMap[p.id] ?? ["user"]))
        .map((p: { id: string }) => p.id),
    );

    const days7 = lastNDays(7);
    const daily = days7.map((date) => ({
      date,
      visitors: 0,
      orders: 0,
      revenue: 0,
      signups: 0,
    }));
    const dayIndex = Object.fromEntries(daily.map((d, i) => [d.date, i]));

    const visitorsByDay: Record<string, Set<string>> = {};
    for (const v of visits ?? []) {
      const day = istDayKey(v.visited_at);
      if (!visitorsByDay[day]) visitorsByDay[day] = new Set();
      visitorsByDay[day].add(v.session_key);
      const idx = dayIndex[day];
      if (idx !== undefined) daily[idx].visitors = visitorsByDay[day].size;
    }

    for (const o of orders ?? []) {
      const day = istDayKey(o.created_at);
      const idx = dayIndex[day];
      if (idx !== undefined) {
        daily[idx].orders += 1;
        if (!["cancelled", "refunded"].includes(o.status)) {
          daily[idx].revenue += Number(o.total);
        }
      }
    }

    for (const p of profiles ?? []) {
      if (!shopperIds.has(p.id)) continue;
      const day = istDayKey(p.created_at);
      const idx = dayIndex[day];
      if (idx !== undefined) daily[idx].signups += 1;
    }

    const today = daily[daily.length - 1];
    const totalRevenue = (orders ?? [])
      .filter((o) => !["cancelled", "refunded"].includes(o.status))
      .reduce((s, o) => s + Number(o.total), 0);

    const todayVisitors = visitorsByDay[today.date]?.size ?? 0;

    return {
      today: {
        visitors: todayVisitors,
        orders: today.orders,
        revenue: today.revenue,
        signups: today.signups,
      },
      last7Days: daily,
      totals: {
        products: productCount ?? 0,
        customers: shopperIds.size,
        orders: orders?.length ?? 0,
        revenue30d: totalRevenue,
        visitors30d: new Set((visits ?? []).map((v) => v.session_key)).size,
      },
    };
  });

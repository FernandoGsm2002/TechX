import webPush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas

export async function POST() {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "Missing VAPID keys" }, { status: 500 });
  }

  webPush.setVapidDetails(
    "mailto:soporte@techx.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's organization and last notification time
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const orgId = profile.organization_id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (supabase as any)
    .from("organizations")
    .select("last_deuda_notif_at, name, currency_symbol")
    .eq("id", orgId)
    .single() as { data: { last_deuda_notif_at: string | null; name: string | null; currency_symbol: string | null } | null };

  // Throttle: skip if last notification was within the 6h window
  if (org?.last_deuda_notif_at) {
    const elapsed = Date.now() - new Date(org.last_deuda_notif_at).getTime();
    if (elapsed < INTERVAL_MS) {
      const nextInMinutes = Math.ceil((INTERVAL_MS - elapsed) / 60000);
      return NextResponse.json({ notified: false, reason: "too_soon", next_check_in_minutes: nextInMinutes });
    }
  }

  // Query pending debts from all three sources
  const [ticketsRes, salesRes, serviciosRes] = await Promise.allSettled([
    supabase
      .from("tickets")
      .select("customer_id, final_amount, quote_amount, customers(full_name)")
      .eq("payment_status", "fiado")
      .eq("status", "entregado")
      .eq("organization_id", orgId)
      .not("customer_id", "is", null),

    supabase
      .from("sales")
      .select("customer_id, total_amount, customer_name")
      .eq("payment_status", "fiado")
      .eq("organization_id", orgId)
      .not("customer_id", "is", null),

    supabase
      .from("otros_servicios")
      .select("customer_id, price, customers(full_name)")
      .eq("payment_status", "fiado")
      .eq("status", "entregado")
      .eq("organization_id", orgId)
      .not("customer_id", "is", null),
  ]);

  // Aggregate by customer_id
  const byCustomer = new Map<string, { name: string; total: number }>();

  const add = (customerId: string, name: string, amount: number) => {
    const prev = byCustomer.get(customerId) ?? { name, total: 0 };
    byCustomer.set(customerId, { name: prev.name || name, total: prev.total + amount });
  };

  if (ticketsRes.status === "fulfilled" && !ticketsRes.value.error) {
    for (const row of ticketsRes.value.data ?? []) {
      if (!row.customer_id) continue;
      const name = (row.customers as { full_name: string } | null)?.full_name ?? "Cliente";
      add(row.customer_id, name, Number(row.final_amount ?? row.quote_amount ?? 0));
    }
  }

  if (salesRes.status === "fulfilled" && !salesRes.value.error) {
    for (const row of (salesRes.value.data ?? []) as { customer_id: string | null; total_amount: number; customer_name: string | null }[]) {
      if (!row.customer_id) continue;
      add(row.customer_id, row.customer_name ?? "Cliente", Number(row.total_amount ?? 0));
    }
  }

  if (serviciosRes.status === "fulfilled" && !serviciosRes.value.error) {
    for (const row of (serviciosRes.value.data ?? []) as { customer_id: string | null; price: number | null; customers: { full_name: string } | null }[]) {
      if (!row.customer_id) continue;
      const name = row.customers?.full_name ?? "Cliente";
      add(row.customer_id, name, Number(row.price ?? 0));
    }
  }

  // Always update the timestamp so we respect the interval even with no debts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("organizations")
    .update({ last_deuda_notif_at: new Date().toISOString() })
    .eq("id", orgId);

  if (byCustomer.size === 0) {
    return NextResponse.json({ notified: false, reason: "no_debts", next_check_in_minutes: 360 });
  }

  const totalClientes = byCustomer.size;
  const totalMonto = [...byCustomer.values()].reduce((s, e) => s + e.total, 0);
  const symbol = org?.currency_symbol ?? "S/";
  const montoStr = `${symbol} ${totalMonto.toFixed(2)}`;

  const body =
    totalClientes === 1
      ? `${[...byCustomer.values()][0].name} tiene un saldo pendiente de ${montoStr}.`
      : `${totalClientes} clientes tienen un saldo total pendiente de ${montoStr}.`;

  const title = "💰 Deudas pendientes por cobrar";

  // Get admin subscriptions
  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", orgId)
    .in("role", ["admin", "superadmin"]);

  if (!adminProfiles || adminProfiles.length === 0) {
    return NextResponse.json({ notified: false, reason: "no_admins", next_check_in_minutes: 360 });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", adminProfiles.map((p) => p.id));

  if (!subs || subs.length === 0) {
    return NextResponse.json({ notified: false, reason: "no_subscriptions", next_check_in_minutes: 360 });
  }

  const payload = JSON.stringify({
    title,
    body,
    url: "/clientes",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
  });

  let sentCount = 0;
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );

  return NextResponse.json({ notified: true, count: sentCount, debtors: totalClientes, next_check_in_minutes: 360 });
}

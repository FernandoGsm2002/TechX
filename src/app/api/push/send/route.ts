import webPush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Set VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    "mailto:soporte@techx.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("VAPID keys are missing for web-push.");
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Validate authentication (must be an internal call from an authenticated user)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, title, body, url = "/" } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
    }

    // 1. Get all admin users in the organization except the one sending it
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", organizationId)
      .in("role", ["admin", "superadmin"]) // Only admins/superadmins get these notifications
      .neq("id", user.id); // don't notify the person who triggered it

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, count: 0, reason: "No admins found or only sender." });
    }

    const targetUserIds = profiles.map((p) => p.id);

    // 2. Fetch their push subscriptions
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (subsError) throw subsError;
    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, count: 0, reason: "No active subscriptions." });
    }

    // 3. Send notifications
    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: "/icons/icon-192x192.png", // PWA Icon
      badge: "/icons/icon-192x192.png" // Notification badge
    });
    
    let sentCount = 0;
    const sendPromises = subs.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webPush.sendNotification(pushSubscription, payload);
        sentCount++;
      } catch (err: any) {
        // Remove expired subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("WebPush Error:", err);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return NextResponse.json({ success: true, count: sentCount });
  } catch (error: any) {
    console.error("Send Push Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

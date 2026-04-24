import webPush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Set VAPID keys on every request to ensure serverless environments read the right env vars
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:soporte@techx.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } else {
    console.error("VAPID keys are missing for web-push in API route.");
    return NextResponse.json({ error: "Server Configuration Error: Missing VAPID Keys." }, { status: 500 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Validate authentication (must be an internal call from an authenticated user)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, title, body, url = "/", targetUserId } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
    }

    // 1. Determine target users — specific user OR all admins in org
    let targetUserIds: string[];
    if (targetUserId) {
      // Sending to a specific user (e.g., a technician for collection alert)
      targetUserIds = [targetUserId];
    } else {
      // Default: broadcast to all admins in the org
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", organizationId)
        .in("role", ["admin", "superadmin"]);
      targetUserIds = (profiles ?? []).map((p) => p.id);
    }

    // Kept for compat with original return
    const profiles = targetUserId ? [{ id: targetUserId }] : null;

    if (targetUserIds.length === 0) {
      return NextResponse.json({ success: true, count: 0, reason: "No target users found." });
    }
    void profiles; // unused after refactor above

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

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscription = await req.json();

    // 1. Check if the user's profile exists to get the organization_id
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
    
    if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

    // 2. Upsert the push subscription
    const subData = {
      user_id: user.id,
      organization_id: profile.organization_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    };

    // upsert by endpoint (it's unique)
    const { error } = await supabase.from("push_subscriptions").upsert(subData, { onConflict: "endpoint" });

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Subscribe Push Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

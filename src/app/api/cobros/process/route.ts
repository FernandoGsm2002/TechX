import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Authenticate the caller using the session cookie
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { taskId, paymentMethod } = await req.json();
    if (!taskId || !paymentMethod) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // 2. Load the collection task using the anon client (respects RLS — technician can read own tasks)
    const { data: task, error: taskError } = await supabase
      .from("collection_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    // 3. Authorization: the task must be assigned to the calling user
    if (task.assigned_to !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // 4. Status check: only pending tasks can be processed
    if (task.status !== "pending") {
      return NextResponse.json({ error: "Esta tarea ya fue procesada" }, { status: 409 });
    }

    // 5. Use service_role client to bypass RLS and update the source record
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();
    const paymentUpdate = { payment_status: "pagado", payment_method: paymentMethod, paid_at: now };

    if (task.fiado_source === "ticket") {
      const { error } = await serviceSupabase
        .from("tickets")
        .update(paymentUpdate)
        .eq("id", task.fiado_id);
      if (error) throw error;
    } else if (task.fiado_source === "pos") {
      const { error } = await serviceSupabase
        .from("sales")
        .update(paymentUpdate)
        .eq("id", task.fiado_id);
      if (error) throw error;
    } else if (task.fiado_source === "servicio") {
      const { error } = await serviceSupabase
        .from("otros_servicios")
        .update({ ...paymentUpdate, paid: true })
        .eq("id", task.fiado_id);
      if (error) throw error;
    } else {
      throw new Error(`fiado_source desconocido: ${task.fiado_source}`);
    }

    // 6. Mark the collection task as completed
    const { error: updateError } = await serviceSupabase
      .from("collection_tasks")
      .update({ status: "completed", payment_method: paymentMethod, paid_at: now })
      .eq("id", taskId);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("[/api/cobros/process]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

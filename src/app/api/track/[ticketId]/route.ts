import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Public endpoint — uses service role to bypass RLS.
// Only returns safe, non-sensitive ticket fields.
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  if (!ticketId || ticketId.length < 10) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ticket, error } = await (supabase as any)
    .from("tickets")
    .select(`
      id,
      ticket_number,
      status,
      updated_at,
      device_details,
      organization_id,
      organizations ( name, phone, logo_url )
    `)
    .eq("id", ticketId)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
  }

  // Return ONLY safe public fields — never expose: customer, price, notes, lock_code, technician
  return NextResponse.json({
    ticket_number:  ticket.ticket_number ?? ticket.id.slice(0, 8).toUpperCase(),
    status:         ticket.status,
    updated_at:     ticket.updated_at,
    device_brand:   ticket.device_details?.brand ?? null,
    device_model:   ticket.device_details?.model ?? null,
    org_name:       ticket.organizations?.name ?? "Taller",
    org_phone:      ticket.organizations?.phone ?? null,
    org_logo:       ticket.organizations?.logo_url ?? null,
  });
}

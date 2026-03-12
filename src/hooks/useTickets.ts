import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { TicketStatus } from "@/types/domain";

const supabase = createClient();

// ── Row type mirrors actual DB columns ────────────────────────────────────────

export interface TicketRow {
  id: string;
  organization_id: string;
  customer_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  status: TicketStatus;
  device_details: Record<string, unknown>;
  checklist_entrada: Record<string, unknown>;
  reported_issue: string | null;
  diagnosis: string | null;
  // quote_amount deprecated in UI — kept for DB backward compat
  quote_amount: number | null;
  final_amount: number | null;
  signature_url: string | null;
  received_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  // Intake fields
  power_on: boolean | null;
  has_lock: boolean | null;
  lock_type: string | null;
  lock_code: string | null;
  intake_notes: string | null;
  payment_status: "pagado" | "fiado" | "parcial" | string | null;
  payment_method: string | null;
  paid_at: string | null;
  // Guest (walk-in) customer support
  guest_name:  string | null;
  guest_phone: string | null;
  // Warranty claim support
  parent_ticket_id:  string | null;
  is_warranty_claim: boolean;
  // Warranty days override (0 = use org default)
  warranty_days: number | null;
}

export type TicketWithRelations = TicketRow & {
  customers: { full_name: string; phone: string | null; document_id: string | null } | null;
  profiles: { full_name: string | null } | null;
  ticket_items: { unit_price: number; quantity: number }[];
};

// ── Queries ───────────────────────────────────────────────────────────────────

interface UseTicketsOptions {
  role?:   string | null;
  userId?: string | null;
}

export function useTickets(statusFilter?: TicketStatus, opts: UseTicketsOptions = {}) {
  const { role, userId } = opts;
  return useQuery({
    queryKey: ["tickets", statusFilter, role, userId],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("*, customers(full_name, phone), profiles!tickets_assigned_to_fkey(full_name), ticket_items(unit_price, quantity)")
        .order("created_at", { ascending: false });

      const isTecnico = role === "tecnico";
      
      // Strict privacy rule: técnicos ONLY see their own assigned tickets OR tickets they created.
      // Admins see all org tickets.
      if (isTecnico && userId) {
        query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (statusFilter) query = query.eq("status", statusFilter as any);

      const { data, error } = await query;
      if (error) throw error;
      return data as TicketWithRelations[];
    },
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["tickets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          customers(*),
          profiles!tickets_assigned_to_fkey(full_name, avatar_url),
          ticket_items(*, inventory(name, sku)),
          ticket_history(*, profiles!ticket_history_changed_by_fkey(full_name)),
          ticket_images(*),
          guarantees(*)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export type CreateTicketPayload = Pick<
  TicketRow,
  | "organization_id"
  | "customer_id"
  | "device_details"
  | "reported_issue"
  | "final_amount"
  | "power_on"
  | "has_lock"
  | "lock_type"
  | "lock_code"
  | "intake_notes"
> & {
  status: TicketStatus;
  // Guest (walk-in) support
  guest_name?:   string | null;
  guest_phone?:  string | null;
  // Per-ticket warranty override (days)
  warranty_days?: number | null;
};

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTicketPayload) => {
      // Auto-assign to current user so técnicos can see their own tickets
      const { data: { user } } = await supabase.auth.getUser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from("tickets")
        .insert({ 
          ...payload, 
          assigned_to: user?.id ?? null,
          created_by: user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as TicketRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket creado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
      payment_status,
      payment_method,
      warranty_days,
    }: {
      id:              string;
      status:          TicketStatus;
      notes?:          string;
      payment_status?: string;
      payment_method?: string;
      warranty_days?:  number;
    }) => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .select("status, organization_id")
        .eq("id", id)
        .single();
      if (error) throw error;

      const updatePayload: Record<string, unknown> = { status };

      // 'entregado' = entregado al cliente — el trigger trg_set_delivered_at ya pone delivered_at
      if (status === "entregado") {
        if (payment_status) updatePayload.payment_status = payment_status;
        if (payment_method)  updatePayload.payment_method = payment_method;
        // paid_at solo si el cobro es inmediato (pagado). Fiado = sin paid_at aún
        if (payment_status === "pagado") {
          updatePayload.paid_at = new Date().toISOString();
        }
        if (warranty_days != null) updatePayload.warranty_days = warranty_days;
      }

      const { error: updateErr } = await supabase
        .from("tickets")
        .update(updatePayload)
        .eq("id", id);
      if (updateErr) throw updateErr;

      // Si se entrega con dias de garantia, crear/actualizar garantia
      if (status === "entregado" && warranty_days != null && warranty_days > 0) {
        const orgId = (ticket as { organization_id: string }).organization_id;
        const startDate = new Date().toISOString().slice(0, 10);
        const endDate   = new Date(Date.now() + warranty_days * 86_400_000).toISOString().slice(0, 10);
        await supabase
          .from("guarantees")
          .upsert({
            organization_id: orgId,
            ticket_id:       id,
            start_date:      startDate,
            end_date:        endDate,
            is_active:       true,
            warranty_type:   "reparacion",
            source:          "ticket",
          }, { onConflict: "ticket_id" });
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("ticket_history").insert({
        ticket_id:       id,
        organization_id: (ticket as { organization_id: string }).organization_id,
        status_from:     (ticket as { status: TicketStatus }).status,
        status_to:       status,
        changed_by:      user?.id,
        notes,
      } as any);

    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["tickets", id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["garantias"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      toast.success("Estado actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Storage: upload intake photo ──────────────────────────────────────────────

export async function uploadIntakePhoto(
  ticketId: string,
  file: File,
  orgId: string
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${orgId}/${ticketId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("ticket-intake-photos")
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data } = supabase.storage
    .from("ticket-intake-photos")
    .getPublicUrl(path);

  return data.publicUrl;
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { notifyAdmins } from "@/lib/notifyAdmins";
import { useDebounce } from "@/hooks/useDebounce";
import type { TicketStatus } from "@/types/domain";
import { STALE_TIME } from "@/lib/queryConfig";

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
  parts_amount: number;          // suma de ticket_items, mantenida por trigger DB
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
  // Número secuencial de ticket (auto-asignado por DB trigger)
  ticket_number: number | null;
}

export type TicketWithRelations = TicketRow & {
  customers: { full_name: string; phone: string | null; document_id: string | null } | null;
  profiles: { full_name: string | null } | null;
  ticket_items: { unit_price: number; quantity: number; add_to_total: boolean | null }[];
};

// ── IMEI/Serial search hook ────────────────────────────────────────────────────

/**
 * Busca tickets filtrando por texto libre en:
 *  - ticket_number
 *  - guest_name / customer name
 *  - device_details->>'imei'
 *  - device_details->>'serial'
 *  - device_details->>'brand' + model
 * Incluye debounce de 400ms para no disparar queries en cada keystroke.
 */
export function useTicketSearch(rawQuery: string, opts: { role?: string | null; userId?: string | null } = {}) {
  const q = useDebounce(rawQuery.trim(), 400);
  const { role, userId } = opts;

  return useQuery({
    queryKey: ["ticket-search", q, role, userId],
    queryFn: async () => {
      if (!q) return [];
      const supabase = createClient();

      let query = supabase
        .from("tickets")
        .select("*, customers(full_name, phone), profiles!tickets_assigned_to_fkey(full_name), ticket_items(unit_price, quantity, add_to_total)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (role === "tecnico" && userId) {
        query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
      }

      // Número numérico exacto
      const asNum = parseInt(q, 10);
      if (!isNaN(asNum)) {
        // busca por ticket_number O por texto en device_details
        query = query.or(
          `ticket_number.eq.${asNum},` +
          `device_details->>imei.ilike.%${q}%,` +
          `device_details->>serial.ilike.%${q}%,` +
          `device_details->>brand.ilike.%${q}%,` +
          `guest_name.ilike.%${q}%`
        );
      } else {
        query = query.or(
          `device_details->>imei.ilike.%${q}%,` +
          `device_details->>serial.ilike.%${q}%,` +
          `device_details->>brand.ilike.%${q}%,` +
          `device_details->>model.ilike.%${q}%,` +
          `guest_name.ilike.%${q}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TicketWithRelations[];
    },
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}

// ── Queries ───────────────────────────────────────────────────────────────────

interface UseTicketsOptions {
  role?:   string | null;
  userId?: string | null;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}

export function useTicketsStats(orgId: string | undefined | null, role?: string | null, userId?: string | null) {
  return useQuery({
    queryKey: ["tickets-stats", orgId, role, userId],
    staleTime: STALE_TIME.MEDIUM,
    queryFn: async () => {
      if (!orgId) return null;
      
      const isTecnico = role === "tecnico";
      const uId = isTecnico && userId ? userId : null;

      // @ts-expect-error - RPC no tipado en types locales todavía
      const { data, error } = await supabase.rpc("get_ticket_stats", {
        p_org_id: orgId,
        p_user_id: uId,
      });

      if (error) throw error;
      return data as {
        total: number;
        recibido: number;
        en_proceso: number;
        completado: number;
        entregado: number;
        fallido: number;
        pendientes: number;
        entregados_mes: number;
        pendientes_cobro: number;
        avg_repair_days: number | null;
        avg_ticket_value: number | null;
      };
    },
    enabled: !!orgId,
  });
}

export function useTickets(statusFilter?: TicketStatus, opts: UseTicketsOptions = {}) {
  const { role, userId, page = 0, pageSize = 500, startDate, endDate } = opts;
  return useQuery({
    queryKey: ["tickets", statusFilter, role, userId, page, pageSize, startDate, endDate],
    staleTime: STALE_TIME.MEDIUM,
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("*, customers(full_name, phone), profiles!tickets_assigned_to_fkey(full_name), ticket_items(unit_price, quantity, add_to_total)", { count: 'exact' })
        .order("created_at", { ascending: false });

      const isTecnico = role === "tecnico";
      
      // Strict privacy rule: técnicos ONLY see their own assigned tickets OR tickets they created.
      // Admins see all org tickets.
      if (isTecnico && userId) {
        query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (statusFilter) query = query.eq("status", statusFilter as any);

      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate + "T23:59:59.999Z");
      }

      // Pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        data: data as TicketWithRelations[],
        count: count ?? 0,
      };
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
  guest_name?:    string | null;
  guest_phone?:   string | null;
  warranty_days?:  number | null;
  warranty_notes?: string | null;
  /** Trabajo realizado / diagnóstico técnico (opcional al crear) */
  diagnosis?:     string | null;
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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket creado");
      const dev = data.device_details as Record<string, unknown>;
      const device = [String(dev?.brand ?? ""), String(dev?.model ?? "")].filter(Boolean).join(" ") || "Equipo";
      const issue  = String(data.reported_issue ?? "").slice(0, 45);
      notifyAdmins(
        data.organization_id,
        "🔧 Nuevo Ticket",
        `${device}${issue ? ` — ${issue}` : ""}`,
        `/tickets/${data.id}`
      ).catch(() => {});
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Generic field update (price, diagnosis, etc.) ────────────────────────────

export function useUpdateTicket(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fields: Partial<Pick<TicketRow, "final_amount" | "diagnosis">>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("tickets")
        .update(fields)
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets", ticketId] });
      toast.success("Ticket actualizado");
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
        .select("status, organization_id, device_details, final_amount")
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = ticket as any;
      return {
        organization_id: t.organization_id as string,
        status,
        device_details:  t.device_details  as Record<string, unknown> | null,
        final_amount:    t.final_amount    as number | null,
      };
    },
    onSuccess: (data, { id }) => {
      qc.invalidateQueries({ queryKey: ["tickets", id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["garantias"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      toast.success("Estado actualizado");
      
      if (data?.organization_id) {
        const dev    = data.device_details;
        const device = dev
          ? [String(dev.brand ?? ""), String(dev.model ?? "")].filter(Boolean).join(" ") || "Equipo"
          : "Equipo";
        const statusLabels: Record<string, string> = {
          recibido:    "recibido",
          en_proceso:  "en proceso",
          completado:  "completado ✓",
          entregado:   "entregado",
          fallido:     "fallido",
        };
        const body = data.status === "entregado" && data.final_amount
          ? `${device} entregado — +${data.final_amount} cobrado`
          : `${device} → ${statusLabels[data.status] ?? data.status}`;
        notifyAdmins(data.organization_id, "🔧 Ticket", body, `/tickets/${id}`).catch(() => {});
      }
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

  const { error: uploadError } = await supabase.storage
    .from("ticket-intake-photos")
    .upload(path, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("ticket-intake-photos")
    .getPublicUrl(path);

  const publicUrl = data.publicUrl;

  // Registrar en ticket_images para que aparezca en el ticket detail
  const { error: insertError } = await supabase
    .from("ticket_images")
    .insert({
      ticket_id: ticketId,
      image_url: publicUrl,
      image_type: "entrada" as const,   // matches DB enum: entrada | salida | proceso
      organization_id: orgId,
    });

  if (insertError) {
    console.error("Error registrando imagen:", insertError);
    // No lanzar error — la foto ya está subida al storage
  }

  return publicUrl;
}

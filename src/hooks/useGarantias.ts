/**
 * useGarantias — lógica completa del sistema de garantías
 * Cubre: tickets de reparación + otros servicios.
 * El trigger en BD crea la garantía automáticamente al entregar.
 * Este hook gestiona: lectura, búsqueda por IMEI/cliente, claims y anulaciones.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createClient() as any;

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface GarantiaRow {
  id:               string;
  organization_id:  string;
  ticket_id:        string | null;
  servicio_id:      string | null;
  source:           "ticket" | "servicio";
  warranty_type:    string;
  start_date:       string;        // date ISO
  end_date:         string;        // date ISO
  is_active:        boolean;
  claim_count:      number;
  notes:            string | null;
  voided_reason:    string | null;
  voided_by:        string | null;
  voided_at:        string | null;
  created_at:       string;
  updated_at:       string;
}

export interface GarantiaExtended extends GarantiaRow {
  days_remaining:   number;        // días restantes (negativo = vencida)
  is_valid:         boolean;       // true si vigente y activa
  // Joined
  ticket?: {
    id: string;
    status: string;
    device_details: Record<string, unknown>;
    guest_name: string | null;
    guest_phone: string | null;
    customer_id: string | null;
    customers?: { full_name: string; phone: string | null } | null;
    parent_ticket_id: string | null;
    is_warranty_claim: boolean;
  } | null;
  servicio?: {
    id: string;
    tags: string[];
    device_brand: string | null;
    device_model: string | null;
    imei: string | null;
    status: string;
    guest_name: string | null;
    customers?: { full_name: string; phone: string | null } | null;
  } | null;
}

const KEY = "garantias";

const GUARANTEE_SELECT = `
  *,
  ticket:tickets!guarantees_ticket_id_fkey (
    id, status, device_details, guest_name, guest_phone,
    customer_id, parent_ticket_id, is_warranty_claim,
    customers ( full_name, phone )
  ),
  servicio:otros_servicios!guarantees_servicio_id_fkey (
    id, tags, device_brand, device_model, imei, status,
    guest_name,
    customers ( full_name, phone )
  )
`;

// ── Hook principal — lista todas las garantías ────────────────────────────────

export function useGarantias(filter: "all" | "active" | "expired" | "voided" = "all") {
  const { org } = useOrganization();

  return useQuery({
    queryKey: [KEY, org?.id, filter],
    enabled: !!org?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<GarantiaExtended[]> => {
      let q = db()
        .from("guarantees")
        .select(GUARANTEE_SELECT)
        .eq("organization_id", org!.id)
        .order("end_date", { ascending: true });

      if (filter === "active")  q = q.eq("is_active", true).gte("end_date", new Date().toISOString().slice(0, 10));
      if (filter === "expired") q = q.eq("is_active", true).lt("end_date",  new Date().toISOString().slice(0, 10));
      if (filter === "voided")  q = q.eq("is_active", false);

      const { data, error } = await q;
      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return ((data ?? []) as GarantiaRow[]).map((g): GarantiaExtended => {
        const endDate = new Date(g.end_date);
        endDate.setHours(0, 0, 0, 0);
        const msDay   = 1000 * 60 * 60 * 24;
        const daysRem = Math.round((endDate.getTime() - today.getTime()) / msDay);
        return {
          ...(g as unknown as GarantiaExtended),
          days_remaining: daysRem,
          is_valid:       g.is_active && daysRem >= 0,
        };
      });
    },
  });
}

// ── Buscar garantía por IMEI (para cuando llega el cliente) ──────────────────

export function useGarantiaByImei(imei: string) {
  const { org } = useOrganization();

  return useQuery({
    queryKey: [KEY, "imei", org?.id, imei],
    enabled: !!org?.id && imei.trim().length >= 5,
    staleTime: 10_000,
    queryFn: async (): Promise<GarantiaExtended[]> => {
      // Buscar por IMEI en tickets (device_details->>'imei')
      const { data: ticketData, error: ticketErr } = await db()
        .from("guarantees")
        .select(GUARANTEE_SELECT)
        .eq("organization_id", org!.id)
        .eq("source", "ticket");

      if (ticketErr) throw ticketErr;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const filtered = ((ticketData ?? []) as GarantiaRow[]).filter((g: any) => {
        const deviceImei = g.ticket?.device_details?.imei ?? "";
        return deviceImei.toLowerCase().includes(imei.toLowerCase());
      });

      return filtered.map((g): GarantiaExtended => {
        const endDate = new Date(g.end_date);
        endDate.setHours(0, 0, 0, 0);
        const msDay   = 1000 * 60 * 60 * 24;
        const daysRem = Math.round((endDate.getTime() - today.getTime()) / msDay);
        return {
          ...(g as unknown as GarantiaExtended),
          days_remaining: daysRem,
          is_valid:       g.is_active && daysRem >= 0,
        };
      });
    },
  });
}

// ── Garantía de un ticket específico ─────────────────────────────────────────

export function useGarantiaByTicket(ticketId: string) {
  return useQuery({
    queryKey: [KEY, "ticket", ticketId],
    enabled: !!ticketId,
    staleTime: 15_000,
    queryFn: async (): Promise<GarantiaExtended | null> => {
      const { data, error } = await db()
        .from("guarantees")
        .select(GUARANTEE_SELECT)
        .eq("ticket_id", ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(data.end_date);
      endDate.setHours(0, 0, 0, 0);
      const msDay   = 1000 * 60 * 60 * 24;
      const daysRem = Math.round((endDate.getTime() - today.getTime()) / msDay);

      return {
        ...(data as unknown as GarantiaExtended),
        days_remaining: daysRem,
        is_valid:       data.is_active && daysRem >= 0,
      };
    },
  });
}

// ── Garantía de un otro_servicio específico ───────────────────────────────────

export function useGarantiaByServicio(servicioId: string) {
  return useQuery({
    queryKey: [KEY, "servicio", servicioId],
    enabled: !!servicioId,
    staleTime: 15_000,
    queryFn: async (): Promise<GarantiaExtended | null> => {
      const { data, error } = await db()
        .from("guarantees")
        .select(GUARANTEE_SELECT)
        .eq("servicio_id", servicioId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(data.end_date);
      endDate.setHours(0, 0, 0, 0);
      const msDay   = 1000 * 60 * 60 * 24;
      const daysRem = Math.round((endDate.getTime() - today.getTime()) / msDay);

      return {
        ...(data as unknown as GarantiaExtended),
        days_remaining: daysRem,
        is_valid:       data.is_active && daysRem >= 0,
      };
    },
  });
}

// ── Historial de tickets del mismo IMEI ──────────────────────────────────────
// Util para ver si un equipo es reincidente

export function useTicketsByImei(imei: string, excludeTicketId?: string) {
  const { org } = useOrganization();

  return useQuery({
    queryKey: ["tickets_by_imei", org?.id, imei],
    enabled: !!org?.id && imei.trim().length >= 5,
    queryFn: async () => {
      const { data, error } = await db()
        .from("tickets")
        .select(`
          id, status, created_at, reported_issue, device_details,
          customers ( full_name, phone ),
          guarantees ( end_date, is_active, claim_count )
        `)
        .eq("organization_id", org!.id)
        .containedBy("device_details", { imei })
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback: textSearch si containedBy no funciona con jsonb
        const { data: d2, error: e2 } = await db()
          .from("tickets")
          .select(`
            id, status, created_at, reported_issue, device_details,
            customers ( full_name, phone ),
            guarantees ( end_date, is_active, claim_count )
          `)
          .eq("organization_id", org!.id)
          .order("created_at", { ascending: false });
        if (e2) throw e2;
        return ((d2 ?? []) as any[]).filter((t: any) => {
          const tImei = String(t.device_details?.imei ?? "");
          return tImei === imei && t.id !== excludeTicketId;
        });
      }

      return ((data ?? []) as any[]).filter((t: any) => t.id !== excludeTicketId);
    },
  });
}

// ── Crear ticket de garantia (hijo del original) ──────────────────────────────

interface ClaimWarrantyPayload {
  parentTicketId: string;
  orgId:          string;
  guaranteeId:    string;
  reportedIssue:  string;
  assignedTo?:    string | null;
}

export function useClaimWarranty() {
  const qc = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (p: ClaimWarrantyPayload) => {
      // 1. Obtener el ticket padre para copiar info del dispositivo
      const { data: parent, error: pErr } = await db()
        .from("tickets")
        .select("organization_id, customer_id, device_details, guest_name, guest_phone, final_amount")
        .eq("id", p.parentTicketId)
        .single();
      if (pErr) throw pErr;

      // 2. Crear el ticket hijo marcado como garantia
      const { data: newTicket, error: tErr } = await supabase
        .from("tickets")
        .insert({
          organization_id:    p.orgId,
          customer_id:        parent.customer_id,
          guest_name:         parent.guest_name,
          guest_phone:        parent.guest_phone,
          device_details:     parent.device_details,
          reported_issue:     p.reportedIssue,
          status:             "recibido",
          final_amount:       0,          // garantia = sin costo
          payment_status:     "pagado",   // pero sin cobro real
          is_warranty_claim:  true,
          parent_ticket_id:   p.parentTicketId,
          assigned_to:        p.assignedTo ?? null,
        } as any)
        .select()
        .single();
      if (tErr) throw tErr;

      // 3. Incrementar claim_count en la garantia
      const { error: gErr } = await db()
        .from("guarantees")
        .update({ claim_count: db().rpc("increment_claim_count_placeholder") })
        .eq("id", p.guaranteeId);

      // Fallback manual si rpc no existe
      if (gErr) {
        const { data: g } = await db().from("guarantees").select("claim_count").eq("id", p.guaranteeId).single();
        await db().from("guarantees").update({ claim_count: (g?.claim_count ?? 0) + 1 }).eq("id", p.guaranteeId);
      }

      return newTicket;
    },
    onSuccess: (newTicket) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(`Ticket de garantia creado: ${(newTicket as any)?.id?.slice(0, 8)}…`);
    },
    onError: (err: Error) => toast.error("Error al crear ticket de garantia: " + err.message),
  });
}

// ── Anular garantia (admin only) ──────────────────────────────────────────────

interface VoidGuaranteePayload {
  id:     string;
  reason: string;
  userId: string;
}

export function useVoidGuarantee() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (p: VoidGuaranteePayload) => {
      const { error } = await db()
        .from("guarantees")
        .update({
          is_active:     false,
          voided_reason: p.reason,
          voided_by:     p.userId,
          voided_at:     new Date().toISOString(),
        })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Garantia anulada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Reactivar garantia ────────────────────────────────────────────────────────

export function useReactivateGuarantee() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db()
        .from("guarantees")
        .update({
          is_active:     true,
          voided_reason: null,
          voided_by:     null,
          voided_at:     null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Garantia reactivada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Estadisticas de garantias para el dashboard ───────────────────────────────

export function useGarantiasStats() {
  const { org } = useOrganization();

  return useQuery({
    queryKey: [KEY, "stats", org?.id],
    enabled: !!org?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);

      const { data, error } = await db()
        .from("guarantees")
        .select("is_active, end_date, claim_count")
        .eq("organization_id", org!.id);

      if (error) throw error;

      const rows = (data ?? []) as { is_active: boolean; end_date: string; claim_count: number }[];

      return {
        total:     rows.length,
        vigentes:  rows.filter(r => r.is_active && r.end_date >= today).length,
        vencidas:  rows.filter(r => r.is_active && r.end_date < today).length,
        anuladas:  rows.filter(r => !r.is_active).length,
        reclamos:  rows.reduce((s, r) => s + r.claim_count, 0),
        porVencer: rows.filter(r => {
          if (!r.is_active) return false;
          const days = Math.round((new Date(r.end_date).getTime() - new Date(today).getTime()) / 86400000);
          return days >= 0 && days <= 7;
        }).length,
      };
    },
  });
}

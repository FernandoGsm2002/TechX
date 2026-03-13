/**
 * Hook para el módulo "Otros Servicios"
 * (desbloqueos, flash, FRP, MDM, verificación de cuenta, etc.)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { notifyAdmins } from "@/lib/notifyAdmins";
import type { Database } from "@/lib/supabase/database.types";

type OS = Database["public"]["Tables"]["otros_servicios"]["Row"];
export type OtroServicioRow = OS;

export type CreateOtroServicioPayload = {
  organization_id:  string;
  device_brand?:    string | null;
  device_model?:    string | null;
  imei?:            string | null;
  serial?:          string | null;
  tags:             string[];
  description?:     string | null;
  has_pin?:         boolean;
  pin_code?:        string | null;
  provider?:        string | null;
  status?:          string;
  warranty_days?:   number;
  warranty_notes?:  string | null;
  customer_id?:     string | null;
  guest_name?:      string | null;
  guest_phone?:     string | null;
  ticket_id?:       string | null;
  price:            number;
  paid?:            boolean;
  payment_method?:  string | null;
  assigned_to?:     string | null;
  internal_notes?:  string | null;
  created_by?:      string | null;
};

export type UpdateOtroServicioPayload = Partial<Omit<CreateOtroServicioPayload, 'organization_id' | 'created_by'>> & { id: string };

const KEY = "otros_servicios";

// ── Detalle (un solo registro) ────────────────────────────────────────────────

export function useOtroServicio(id: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: [KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("otros_servicios")
        .select(`
          *,
          customers(id, full_name, phone),
          assigned_profile:profiles!otros_servicios_assigned_to_fkey(id, full_name)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as OtroServicioRow & Record<string, unknown>;
    },
  });
}

// ── Cambio de estado (igual a useUpdateTicketStatus) ─────────────────────────

export function useUpdateOtroServicioStatus() {
  const qc = useQueryClient();
  const supabase = createClient();
  const { org } = useOrganization();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      payment_method,
      payment_status,
      warranty_days,
    }: {
      id:              string;
      status:          string;
      payment_method?: string;
      payment_status?: string;
      warranty_days?:  number;
    }) => {
      const payload: Record<string, unknown> = { status };

      if (status === "entregado") {
        // delivered_at es seteado automáticamente por el trigger trg_set_servicio_delivered_at
        if (payment_status) payload.payment_status = payment_status;
        if (payment_method) payload.payment_method = payment_method;
        // paid=true solo si realmente ya pagó; fiado = aún pendiente de cobro
        payload.paid = payment_status === "pagado";
        if (warranty_days != null) payload.warranty_days = warranty_days;
      }

      const { error } = await supabase
        .from("otros_servicios")
        .update(payload)
        .eq("id", id);
      if (error) throw error;

      // Crear garantía si aplica
      if (status === "entregado" && warranty_days != null && warranty_days > 0 && org?.id) {
        const start = new Date().toISOString().slice(0, 10);
        const end   = new Date(Date.now() + warranty_days * 86_400_000).toISOString().slice(0, 10);
        await supabase.from("guarantees").upsert({
          organization_id: org.id,
          ticket_id:       null,
          servicio_id:     id,
          start_date:      start,
          end_date:        end,
          is_active:       true,
          warranty_type:   "servicio",
          source:          "otro_servicio",
        }, { onConflict: "servicio_id" });
      }
    },
    onSuccess: (_, { id, status }) => {
      qc.invalidateQueries({ queryKey: [KEY, id] });
      qc.invalidateQueries({ queryKey: [KEY, org?.id] });
      qc.invalidateQueries({ queryKey: ["garantias"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      if (org?.id) {
        notifyAdmins(org.id, "Servicio Actualizado", `Servicio ID ${id.substring(0, 6)} ha cambiado a ${status}.`).catch(() => {});
      }
    },
  });
}


export function useOtrosServicios() {
  const { org, role, userId } = useOrganization();
  const supabase = createClient();

  return useQuery({
    queryKey: [KEY, org?.id],
    enabled: !!org?.id,
    queryFn: async () => {
      let q = supabase
        .from("otros_servicios")
        .select(`
          *,
          customers(id, full_name, phone),
          assigned_profile:profiles!otros_servicios_assigned_to_fkey(id, full_name)
        `)
        .eq("organization_id", org!.id)
        .order("created_at", { ascending: false });

      // técnico ve todos (no filtramos por assigned_to ya que los servicios son compartidos)
      // Si se desea restringir, descomentar:
      // if (role === "tecnico") {
      //   q = q.or(`assigned_to.eq.${userId},assigned_to.is.null`);
      // }

      const { data, error } = await q;
      if (error) throw error;
      return data as (OtroServicioRow & {
        customers: { id: string; full_name: string; phone: string | null } | null;
        assigned_profile: { id: string; full_name: string } | null;
      })[];
    },
  });
}

// ── Crear ──────────────────────────────────────────────────────────────────────

export function useCreateOtroServicio() {
  const qc = useQueryClient();
  const supabase = createClient();
  const { org } = useOrganization();

  return useMutation({
    mutationFn: async (payload: CreateOtroServicioPayload) => {
      const { data, error } = await supabase
        .from("otros_servicios")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as OtroServicioRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, org?.id] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
    },
  });
}

// ── Actualizar ────────────────────────────────────────────────────────────────

export function useUpdateOtroServicio() {
  const qc = useQueryClient();
  const supabase = createClient();
  const { org } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, ...rawPayload }: UpdateOtroServicioPayload) => {
      // Strip protected fields and undefined values to avoid PostgREST 400
      const { ...payload } = rawPayload;
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined)
      );
      const { data, error } = await supabase
        .from("otros_servicios")
        .update(cleanPayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as OtroServicioRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, org?.id] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      qc.invalidateQueries({ queryKey: ["garantias"] });
    },
  });
}

// ── Eliminar ──────────────────────────────────────────────────────────────────

export function useDeleteOtroServicio() {
  const qc = useQueryClient();
  const supabase = createClient();
  const { org } = useOrganization();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("otros_servicios")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, org?.id] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
    },
  });
}

// ── Stats (para dashboard) ────────────────────────────────────────────────────

export function useOtrosServiciosStats() {
  const { org } = useOrganization();
  const supabase = createClient();

  return useQuery({
    queryKey: ["otros_servicios_stats", org?.id],
    enabled: !!org?.id,
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data, error } = await supabase
        .from("otros_servicios")
        .select("status, price, paid, created_at, delivered_at")
        .eq("organization_id", org!.id);

      if (error) throw error;

      const thisMonth = (data ?? []).filter(r => r.created_at >= startOfMonth);

      return {
        total:           data?.length ?? 0,
        thisMonth:       thisMonth.length,
        pendientes:      (data ?? []).filter(r => r.status === "pendiente").length,
        completados:     (data ?? []).filter(r => r.status === "completado" || r.status === "entregado").length,
        ingresosMes:     (data ?? [])
          .filter(r => r.status === "entregado" && r.paid && r.delivered_at && r.delivered_at >= startOfMonth)
          .reduce((s, r) => s + (r.price ?? 0), 0),
      };
    },
  });
}

// ── Tags: la UI ahora usa entrada libre (SimpleTagInput)
// Los tags anteriores se mantienen solo como referencia para migraciones
export const PREDEFINED_TAGS: { value: string; label: string; group: string }[] = [];
export const TAG_GROUPS: string[] = [];


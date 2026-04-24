import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClienteTicketItem {
  id: string;
  type: "ticket";
  date: string;
  description: string;
  device: string;
  status: string;
  amount: number;
  payment_status: string | null;
  payment_method: string | null;
}

export interface ClienteServicioItem {
  id: string;
  type: "servicio";
  date: string;
  description: string;
  amount: number;
  payment_status: string | null;
  payment_method: string | null;
}

export interface ClienteSaleItem {
  id: string;
  type: "venta";
  date: string;
  description: string;
  amount: number;
  payment_status: string | null;
  payment_method: string | null;
}

export type ClienteHistoryItem =
  | ClienteTicketItem
  | ClienteServicioItem
  | ClienteSaleItem;

export interface ClienteAccountingSummary {
  totalGastado: number;
  totalPagado: number;
  totalPendiente: number;
  totalTickets: number;
  totalServicios: number;
  totalVentas: number;
  items: ClienteHistoryItem[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useClienteHistory(customerId: string | null) {
  return useQuery({
    queryKey: ["cliente-history", customerId],
    enabled: !!customerId,
    staleTime: 60_000,
    queryFn: async (): Promise<ClienteAccountingSummary> => {
      if (!customerId) throw new Error("No customerId");

      const [ticketsRes, serviciosRes, salesRes] = await Promise.all([
        supabase
          .from("tickets")
          .select("id, created_at, status, final_amount, parts_amount, payment_status, payment_method, device_details, reported_issue")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),

        supabase
          .from("otros_servicios")
          .select("id, created_at, tags, description, price, paid, payment_method")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),

        supabase
          .from("sales")
          .select("id, created_at, total_amount, notes, payment_status, payment_method")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false }),
      ]);

      if (ticketsRes.error) throw ticketsRes.error;
      if (serviciosRes.error) throw serviciosRes.error;
      // Sales may not have customer_id — ignore error gracefully
      const salesData = salesRes.data ?? [];

      const ticketItems: ClienteTicketItem[] = (ticketsRes.data ?? []).map((t) => {
        const d = (t.device_details ?? {}) as Record<string, string>;
        return {
          id: t.id,
          type: "ticket",
          date: t.created_at,
          description: t.reported_issue ?? "Reparación",
          device: [d.brand, d.model].filter(Boolean).join(" ") || "Dispositivo",
          status: t.status,
          amount: (t.final_amount ?? 0) + (t.parts_amount ?? 0),
          payment_status: t.payment_status,
          payment_method: t.payment_method,
        };
      });

      const servicioItems: ClienteServicioItem[] = (
        (serviciosRes.data ?? []) as { id: string; created_at: string; tags?: string[]; description?: string | null; price?: number; paid?: boolean; payment_method?: string | null }[]
      ).map((s) => ({
        id: s.id,
        type: "servicio",
        date: s.created_at,
        description: s.description ?? (s.tags?.join(", ")) ?? "Servicio",
        amount: s.price ?? 0,
        payment_status: s.paid ? "pagado" : "fiado",
        payment_method: s.payment_method ?? null,
      }));

      const saleItems: ClienteSaleItem[] = (
        (salesRes.data ?? []) as { id: string; created_at: string; total_amount?: number; notes?: string | null; payment_status?: string | null; payment_method?: string | null }[]
      ).map((s) => ({
        id: s.id,
        type: "venta",
        date: s.created_at,
        description: s.notes ?? "Venta POS",
        amount: s.total_amount ?? 0,
        payment_status: s.payment_status ?? null,
        payment_method: s.payment_method ?? null,
      }));

      const items: ClienteHistoryItem[] = [
        ...ticketItems,
        ...servicioItems,
        ...saleItems,
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const totalGastado = items.reduce((s, i) => s + i.amount, 0);
      const totalPagado  = items
        .filter((i) => i.payment_status === "pagado")
        .reduce((s, i) => s + i.amount, 0);

      return {
        totalGastado,
        totalPagado,
        totalPendiente: totalGastado - totalPagado,
        totalTickets: ticketItems.length,
        totalServicios: servicioItems.length,
        totalVentas: saleItems.length,
        items,
      };
    },
  });
}

// ── Top Clientes (for dashboard) ──────────────────────────────────────────────

export interface TopClienteRow {
  customer_id: string;
  full_name: string;
  total_gastado: number;
  total_trabajos: number;
  desglose: {
    tickets: number;      ticket_amount: number;
    servicios: number;    servicio_amount: number;
    ventas: number;       venta_amount: number;
  };
}

export function useTopClientes(limit = 5) {
  return useQuery({
    queryKey: ["top-clientes", limit],
    queryFn: async (): Promise<TopClienteRow[]> => {
      const [ticketsRes, serviciosRes, salesRes] = await Promise.allSettled([
        supabase
          .from("tickets")
          .select("customer_id, final_amount, parts_amount, customers!inner(full_name)")
          .not("customer_id", "is", null),
        supabase
          .from("otros_servicios")
          .select("customer_id, price, customers!inner(full_name)")
          .not("customer_id", "is", null),
        supabase
          .from("sales")
          .select("customer_id, total_amount, customer_name")
          .not("customer_id", "is", null),
      ]);

      type Entry = { name: string; ticket_total: number; ticket_count: number; servicio_total: number; servicio_count: number; venta_total: number; venta_count: number };
      const map = new Map<string, Entry>();

      const ensure = (id: string, name: string): Entry => {
        if (!map.has(id)) map.set(id, { name, ticket_total: 0, ticket_count: 0, servicio_total: 0, servicio_count: 0, venta_total: 0, venta_count: 0 });
        return map.get(id)!;
      };

      if (ticketsRes.status === "fulfilled" && !ticketsRes.value.error) {
        for (const row of ticketsRes.value.data ?? []) {
          if (!row.customer_id) continue;
          const name = (row.customers as { full_name: string } | null)?.full_name ?? "Cliente";
          const e = ensure(row.customer_id, name);
          e.ticket_total += (row.final_amount ?? 0) + (row.parts_amount ?? 0);
          e.ticket_count += 1;
        }
      }

      if (serviciosRes.status === "fulfilled" && !serviciosRes.value.error) {
        for (const row of (serviciosRes.value.data ?? []) as { customer_id: string; price: number; customers: { full_name: string } | null }[]) {
          if (!row.customer_id) continue;
          const name = row.customers?.full_name ?? "Cliente";
          const e = ensure(row.customer_id, name);
          e.servicio_total += row.price ?? 0;
          e.servicio_count += 1;
        }
      }

      if (salesRes.status === "fulfilled" && !salesRes.value.error) {
        for (const row of (salesRes.value.data ?? []) as { customer_id: string | null; total_amount: number; customer_name: string | null }[]) {
          if (!row.customer_id) continue;
          const e = ensure(row.customer_id, row.customer_name ?? "Cliente");
          e.venta_total += row.total_amount ?? 0;
          e.venta_count += 1;
        }
      }

      return [...map.entries()]
        .map(([id, v]) => ({
          customer_id: id,
          full_name: v.name,
          total_gastado: v.ticket_total + v.servicio_total + v.venta_total,
          total_trabajos: v.ticket_count + v.servicio_count + v.venta_count,
          desglose: {
            tickets: v.ticket_count,           ticket_amount: v.ticket_total,
            servicios: v.servicio_count,       servicio_amount: v.servicio_total,
            ventas: v.venta_count,             venta_amount: v.venta_total,
          },
        }))
        .sort((a, b) => b.total_gastado - a.total_gastado)
        .slice(0, limit);
    },
  });
}

// ── Top Técnicos (for dashboard) ─────────────────────────────────────────────

export interface TopTecnicoRow {
  technician_id: string;
  full_name: string;
  tickets_completados: number;
  ingresos_generados: number;
  operaciones_totales: number;
  desglose: {
    tickets: number;    ticket_amount: number;
    servicios: number;  servicio_amount: number;
    ventas: number;     venta_amount: number;
  };
}

export function useTopTecnicos(limit = 5) {
  return useQuery({
    queryKey: ["top-tecnicos", limit],
    queryFn: async (): Promise<TopTecnicoRow[]> => {
      const [ticketsRes, serviciosRes, salesRes] = await Promise.allSettled([
        supabase
          .from("tickets")
          .select("assigned_to, final_amount, parts_amount, profiles!tickets_assigned_to_fkey(full_name)")
          .not("assigned_to", "is", null)
          .in("status", ["completado", "entregado"]),
        supabase
          .from("otros_servicios")
          .select("assigned_to, price, profiles!otros_servicios_assigned_to_fkey(full_name)")
          .not("assigned_to", "is", null)
          .in("status", ["completado", "entregado"]),
        supabase
          .from("sales")
          .select("created_by, total_amount, profiles!sales_created_by_fkey(full_name)")
          .not("created_by", "is", null),
      ]);

      type Entry = { name: string; ticket_total: number; ticket_count: number; servicio_total: number; servicio_count: number; venta_total: number; venta_count: number };
      const map = new Map<string, Entry>();

      const ensure = (id: string, name: string): Entry => {
        if (!map.has(id)) map.set(id, { name, ticket_total: 0, ticket_count: 0, servicio_total: 0, servicio_count: 0, venta_total: 0, venta_count: 0 });
        return map.get(id)!;
      };

      if (ticketsRes.status === "fulfilled" && !ticketsRes.value.error) {
        for (const row of ticketsRes.value.data ?? []) {
          if (!row.assigned_to) continue;
          const name = (row.profiles as { full_name: string | null } | null)?.full_name ?? "Técnico";
          const e = ensure(row.assigned_to, name);
          e.ticket_total += (row.final_amount ?? 0) + (row.parts_amount ?? 0);
          e.ticket_count += 1;
        }
      }

      if (serviciosRes.status === "fulfilled" && !serviciosRes.value.error) {
        for (const row of (serviciosRes.value.data ?? []) as { assigned_to: string | null; price: number | null; profiles: { full_name: string | null } | null }[]) {
          if (!row.assigned_to) continue;
          const name = row.profiles?.full_name ?? "Técnico";
          const e = ensure(row.assigned_to, name);
          e.servicio_total += row.price ?? 0;
          e.servicio_count += 1;
        }
      }

      if (salesRes.status === "fulfilled" && !salesRes.value.error) {
        for (const row of (salesRes.value.data ?? []) as { created_by: string | null; total_amount: number | null; profiles: { full_name: string | null } | null }[]) {
          if (!row.created_by) continue;
          const name = (row.profiles as { full_name: string | null } | null)?.full_name ?? "Técnico";
          const e = ensure(row.created_by, name);
          e.venta_total += row.total_amount ?? 0;
          e.venta_count += 1;
        }
      }

      return [...map.entries()]
        .map(([id, v]) => ({
          technician_id: id,
          full_name: v.name,
          tickets_completados: v.ticket_count,
          ingresos_generados: v.ticket_total + v.servicio_total + v.venta_total,
          operaciones_totales: v.ticket_count + v.servicio_count + v.venta_count,
          desglose: {
            tickets: v.ticket_count,     ticket_amount: v.ticket_total,
            servicios: v.servicio_count, servicio_amount: v.servicio_total,
            ventas: v.venta_count,       venta_amount: v.venta_total,
          },
        }))
        .sort((a, b) => b.ingresos_generados - a.ingresos_generados)
        .slice(0, limit);
    },
  });
}

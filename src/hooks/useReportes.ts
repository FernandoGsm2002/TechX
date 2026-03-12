// useReportes.ts — Hooks para reportes de ventas, tickets e ingresos por período
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ── Date Range Helpers ─────────────────────────────────────────────────────────

export type DatePreset = "today" | "yesterday" | "week" | "month" | "custom";

export function getDateRange(preset: DatePreset, customFrom?: Date, customTo?: Date) {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "custom":
      return {
        from: customFrom ? startOfDay(customFrom) : startOfMonth(now),
        to:   customTo   ? endOfDay(customTo)     : endOfDay(now),
      };
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SaleReportRow {
  id:             string;
  created_at:     string;
  customer_name:  string | null;
  payment_method: string;
  payment_status: string;
  total_amount:   number;
  seller_name:    string | null;
  items_count:    number;
  items_summary:  string; // "Bateria x2, Pantalla x1"
}

export interface TicketReportRow {
  id:             string;
  created_at:     string;
  customer_name:  string | null;
  device:         string;
  status:         string;
  payment_status: string;
  payment_method: string | null;
  final_amount:   number | null;
  technician:     string | null;
}

export interface ServicioReportRow {
  id:             string;
  order_number:   string;
  created_at:     string;
  customer_name:  string | null;
  description:    string;
  status:         string;
  payment_status: string | null;
  price:          number | null;
}

export interface ReportSummary {
  total_sales_revenue:    number;
  total_ticket_revenue:   number;
  total_servicio_revenue: number;
  total_revenue:          number;
  sales_count:            number;
  tickets_count:          number;
  servicios_count:        number;
  pending_collection:     number; // fiados
}

// ── useReporteSales ────────────────────────────────────────────────────────────

export function useReporteSales(from: Date, to: Date) {
  return useQuery({
    queryKey: ["reporte-sales", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id, created_at, customer_name, payment_method, payment_status, total_amount,
          profiles!sales_created_by_fkey ( full_name ),
          sale_items (
            quantity, unit_price,
            inventory ( name )
          )
        `)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as any[]).map((s) => {
        const items = (s.sale_items ?? []) as { quantity: number; unit_price: number; inventory: { name: string } | null }[];
        const summary = items.map((i) => `${i.inventory?.name ?? "?"} x${i.quantity}`).join(", ");
        return {
          id:             s.id,
          created_at:     s.created_at,
          customer_name:  s.customer_name,
          payment_method: s.payment_method,
          payment_status: s.payment_status,
          total_amount:   Number(s.total_amount),
          seller_name:    s.profiles?.full_name ?? null,
          items_count:    items.length,
          items_summary:  summary,
        } as SaleReportRow;
      });
    },
    staleTime: 60_000,
  });
}

// ── useReporteTickets ──────────────────────────────────────────────────────────

export function useReporteTickets(from: Date, to: Date) {
  return useQuery({
    queryKey: ["reporte-tickets", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id, created_at, status, payment_status, payment_method, final_amount,
          device_details,
          customers ( full_name ),
          guest_name,
          profiles!tickets_assigned_to_fkey ( full_name )
        `)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as any[]).map((t) => {
        const dd = t.device_details ?? {};
        const device = [dd.brand, dd.model].filter(Boolean).join(" ") || "—";
        return {
          id:             t.id,
          created_at:     t.created_at,
          customer_name:  t.customers?.full_name ?? t.guest_name ?? null,
          device,
          status:         t.status,
          payment_status: t.payment_status ?? "—",
          payment_method: t.payment_method,
          final_amount:   t.final_amount ? Number(t.final_amount) : null,
          technician:     t.profiles?.full_name ?? null,
        } as TicketReportRow;
      });
    },
    staleTime: 60_000,
  });
}

// ── useReporteServicios ────────────────────────────────────────────────────────

export function useReporteServicios(from: Date, to: Date) {
  return useQuery({
    queryKey: ["reporte-servicios", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("otros_servicios")
        .select(`
          id, order_number, created_at, description, status, payment_status, price,
          customers ( full_name ),
          guest_name
        `)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as any[]).map((s) => ({
        id:             s.id,
        order_number:   s.order_number,
        created_at:     s.created_at,
        customer_name:  s.customers?.full_name ?? s.guest_name ?? null,
        description:    s.description,
        status:         s.status,
        payment_status: s.payment_status,
        price:          s.price ? Number(s.price) : null,
      } as ServicioReportRow));
    },
    staleTime: 60_000,
  });
}

// ── useReporteSummary ──────────────────────────────────────────────────────────

export function useReporteSummary(from: Date, to: Date) {
  const sales    = useReporteSales(from, to);
  const tickets  = useReporteTickets(from, to);
  const servicios = useReporteServicios(from, to);

  const isLoading = sales.isLoading || tickets.isLoading || servicios.isLoading;

  const summary: ReportSummary = {
    total_sales_revenue:    (sales.data ?? []).filter(s => s.payment_status === "pagado").reduce((a, s) => a + s.total_amount, 0),
    total_ticket_revenue:   (tickets.data ?? []).filter(t => t.payment_status === "pagado").reduce((a, t) => a + (t.final_amount ?? 0), 0),
    total_servicio_revenue: (servicios.data ?? []).filter(s => s.payment_status === "pagado").reduce((a, s) => a + (s.price ?? 0), 0),
    get total_revenue()    { return this.total_sales_revenue + this.total_ticket_revenue + this.total_servicio_revenue; },
    sales_count:            (sales.data ?? []).length,
    tickets_count:          (tickets.data ?? []).length,
    servicios_count:        (servicios.data ?? []).length,
    pending_collection:
      (sales.data ?? []).filter(s => s.payment_status === "fiado").reduce((a, s) => a + s.total_amount, 0) +
      (tickets.data ?? []).filter(t => t.payment_status === "fiado").reduce((a, t) => a + (t.final_amount ?? 0), 0) +
      (servicios.data ?? []).filter(s => s.payment_status === "fiado").reduce((a, s) => a + (s.price ?? 0), 0),
  };

  return { summary, isLoading, sales, tickets, servicios };
}

// ── Reporte export helper ──────────────────────────────────────────────────────

export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatDateForExport(date: Date) {
  return format(date, "yyyy-MM-dd");
}

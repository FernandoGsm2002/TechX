// useIngresosChart.ts — Ingresos agrupados por fuente, con soporte de periodo y filtro por técnico
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  format, startOfDay, endOfDay,
  subDays, eachDayOfInterval,
  startOfMonth, endOfMonth,
  startOfHour, addHours, eachHourOfInterval,
} from "date-fns";
import { es } from "date-fns/locale";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

export type ChartPeriod = "day" | "week" | "month";

export interface ChartPoint {
  date:      string; // label visible "1 abr", "Lun", "14:00", …
  isoDate:   string; // key único
  tickets:   number;
  pos:       number;
  servicios: number;
  total:     number;
}

export function useIngresosChart(period: ChartPeriod = "month", technicianId?: string) {
  return useQuery({
    queryKey: ["ingresos-chart", period, technicianId ?? "all"],
    queryFn: async (): Promise<ChartPoint[]> => {
      const now   = new Date();

      // ── Range & grouping ──────────────────────────────────────────────────────
      let start: Date;
      let end: Date;
      let groupByHour = false;

      if (period === "day") {
        start = startOfDay(now);
        end   = endOfDay(now);
        groupByHour = true;
      } else if (period === "week") {
        start = startOfDay(subDays(now, 6));
        end   = endOfDay(now);
      } else {
        // month
        start = startOfMonth(now);
        end   = endOfMonth(now);
      }

      // ── Build initial map ─────────────────────────────────────────────────────
      const map: Record<string, ChartPoint> = {};

      if (groupByHour) {
        // Every 2 hours from 00:00 to 22:00
        const hours = eachHourOfInterval({ start, end }).filter((h) => h.getHours() % 2 === 0);
        for (const h of hours) {
          const key = format(h, "yyyy-MM-dd HH:mm");
          map[key] = {
            date:      format(h, "HH:mm", { locale: es }),
            isoDate:   key,
            tickets: 0, pos: 0, servicios: 0, total: 0,
          };
        }
      } else {
        const days = eachDayOfInterval({ start, end: period === "week" ? now : end });
        for (const d of days) {
          const key = format(d, "yyyy-MM-dd");
          map[key] = {
            date:      period === "week"
              ? format(d, "EEE d", { locale: es })
              : format(d, "d MMM", { locale: es }),
            isoDate:   key,
            tickets: 0, pos: 0, servicios: 0, total: 0,
          };
        }
      }

      // ── Queries ───────────────────────────────────────────────────────────────
      let ticketsQ = supabase
        .from("tickets")
        .select("paid_at, final_amount, quote_amount, parts_amount")
        .eq("payment_status", "pagado")
        .gte("paid_at", start.toISOString())
        .lte("paid_at", end.toISOString());

      let salesQ = supabase
        .from("sales")
        .select("paid_at, total_amount")
        .eq("payment_status", "pagado")
        .is("voided_at", null)
        .gte("paid_at", start.toISOString())
        .lte("paid_at", end.toISOString());

      let serviciosQ = supabase
        .from("otros_servicios")
        .select("delivered_at, price")
        .eq("status", "entregado")
        .eq("paid", true)
        .gte("delivered_at", start.toISOString())
        .lte("delivered_at", end.toISOString());

      // Filter by technician if provided
      if (technicianId) {
        ticketsQ   = ticketsQ.eq("assigned_to", technicianId);
        salesQ     = salesQ.eq("created_by", technicianId);
        serviciosQ = serviciosQ.eq("created_by", technicianId);
      }

      const [ticketsRes, salesRes, serviciosRes] = await Promise.all([ticketsQ, salesQ, serviciosQ]);

      // ── Aggregate into map ────────────────────────────────────────────────────
      function getKey(isoTimestamp: string): string | null {
        if (!isoTimestamp) return null;
        if (groupByHour) {
          const d = new Date(isoTimestamp);
          // Round down to nearest 2-hour slot
          const slotHour = Math.floor(d.getHours() / 2) * 2;
          const slotDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), slotHour);
          return format(slotDate, "yyyy-MM-dd HH:mm");
        }
        return isoTimestamp.slice(0, 10);
      }

      for (const t of (ticketsRes.data ?? []) as { paid_at: string; final_amount: number | null; quote_amount: number | null; parts_amount: number }[]) {
        const key = getKey(t.paid_at);
        if (key && map[key]) {
          const amt = Number(t.final_amount ?? t.quote_amount ?? 0) + Number(t.parts_amount ?? 0);
          map[key].tickets += amt;
          map[key].total   += amt;
        }
      }

      for (const s of (salesRes.data ?? []) as { paid_at: string; total_amount: number }[]) {
        const key = getKey(s.paid_at);
        if (key && map[key]) {
          map[key].pos   += Number(s.total_amount);
          map[key].total += Number(s.total_amount);
        }
      }

      for (const s of (serviciosRes.data ?? []) as { delivered_at: string; price: number | null }[]) {
        const key = getKey(s.delivered_at);
        if (key && map[key]) {
          map[key].servicios += Number(s.price ?? 0);
          map[key].total     += Number(s.price ?? 0);
        }
      }

      return Object.values(map);
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}

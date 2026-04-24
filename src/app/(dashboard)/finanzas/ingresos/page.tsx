"use client";

import React, { useState } from "react";
import {
  faArrowTrendUp, faDollarSign, faTicket, faStore,
  faMagnifyingGlass, faChevronRight, faCalendar, faBagShopping,
  faWallet, faLockOpen, faCalendarDays, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useFinanzasStats } from "@/hooks/useGastos";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { downloadCSV, INGRESOS_CSV_HEADERS } from "@/lib/exportUtils";
// ── Types ─────────────────────────────────────────────────────────────────────

type IncomeSource = "ticket" | "pos" | "servicio";

interface IncomeRow {
  id:             string;
  source:         IncomeSource;
  description:    string;        // customer name / device OR "Venta POS"
  detail:         string;        // device model OR items summary
  amount:         number;
  date:           string;        // ISO
  payment_method: string | null;
  author_name:    string | null;
  parts_amount:   number;        // solo tickets: suma de repuestos
  parts_summary:  string;        // solo tickets: "Batería ×1, Pantalla ×1"
}

// ── Hook: combined income ─────────────────────────────────────────────────────

function useIngresos(start: string, end: string) {
  return useQuery({
    queryKey: ["ingresos", start, end],
    queryFn: async (): Promise<IncomeRow[]> => {
      const supabase = createClient();

      // ── 1. Tickets pagados ──
      const { data: ticketData } = await supabase
        .from("tickets")
        .select(`id, final_amount, quote_amount, parts_amount, delivered_at, paid_at, updated_at, device_details, payment_status, payment_method,
          customers ( full_name ),
          profiles!tickets_assigned_to_fkey ( full_name ),
          ticket_items ( unit_price, quantity, inventory(name) )`)
        .eq("payment_status", "pagado")
        .gte("paid_at", start)
        .lte("paid_at", end)
        .order("paid_at", { ascending: false });

      type TicketRow = {
        id: string; final_amount: number | null; quote_amount: number | null; parts_amount: number | null;
        paid_at: string | null; delivered_at: string | null; updated_at: string;
        device_details: Record<string, string> | null; payment_method: string | null;
        customers: { full_name: string } | null;
        profiles: { full_name: string | null } | null;
        ticket_items: { unit_price: number; quantity: number; inventory: { name: string } | null }[];
      };
      const ticketRows: IncomeRow[] = ((ticketData ?? []) as TicketRow[])
        .map((t) => {
          const base         = Number(t.final_amount ?? t.quote_amount ?? 0);
          const parts_amount = Number(t.parts_amount ?? 0);
          const items = t.ticket_items ?? [];
          const parts_summary = items
            .filter(i => i.inventory?.name)
            .map(i => `${i.inventory!.name} ×${i.quantity}`)
            .join(", ");
          return {
            id:             t.id,
            source:         "ticket" as IncomeSource,
            description:    t.customers?.full_name ?? "Sin cliente",
            detail:         [t.device_details?.brand, t.device_details?.model].filter(Boolean).join(" ") || "Reparación",
            amount:         base + parts_amount,
            date:           t.paid_at ?? t.delivered_at ?? t.updated_at,
            payment_method: t.payment_method,
            author_name:    t.profiles?.full_name ?? "Admin",
            parts_amount,
            parts_summary,
          };
        });

      // ── 2. Ventas POS (Pagadas) ──
      const { data: posData } = await supabase
        .from("sales")
        .select(`
          id, total_amount, created_at, paid_at, customer_name, payment_status, payment_method, notes,
          profiles!sales_created_by_fkey ( full_name ),
          sale_items (
            quantity,
            inventory ( name, brand )
          )
        `)
        .eq("payment_status", "pagado")
        .is("voided_at", null)
        .gte("paid_at", start)
        .lte("paid_at", end)
        .order("paid_at", { ascending: false });

      type PosRow = {
        id: string; total_amount: number; paid_at: string | null; created_at: string;
        customer_name: string | null; payment_method: string | null; notes: string | null;
        profiles: { full_name: string | null } | null;
        sale_items: { quantity: number; inventory: { name: string; brand: string | null } | null }[];
      };
      const posRows: IncomeRow[] = ((posData ?? []) as PosRow[])
        .map((s) => {
        const itemsSummary = (s.sale_items ?? [])
          .map((si) => `${[si.inventory?.brand, si.inventory?.name].filter(Boolean).join(" ")} ×${si.quantity}`)
          .join(" · ");
        return {
          id:             s.id,
          source:         "pos" as IncomeSource,
          description:    s.customer_name ?? "Venta POS",
          detail:         itemsSummary || s.notes || "Venta de productos",
          amount:         Number(s.total_amount),
          date:           s.paid_at ?? s.created_at,
          payment_method: s.payment_method,
          author_name:    s.profiles?.full_name ?? "Admin",
          parts_amount:   0,
          parts_summary:  "",
        };
      });

      // ── 3. Otros Servicios entregados en el mes ──
      const { data: serviciosData } = await supabase
        .from("otros_servicios")
        .select(`
          id, price, delivered_at, updated_at, created_at, tags,
          guest_name, payment_method, payment_status,
          customers ( full_name ),
          profiles!otros_servicios_created_by_fkey ( full_name )
        `)
        .eq("status", "entregado")
        .eq("paid", true)
        .gte("delivered_at", start)
        .lte("delivered_at", end)
        .order("delivered_at", { ascending: false });

      type ServicioRow = {
        id: string; price: number | null; delivered_at: string | null; updated_at: string; created_at: string;
        tags: string[] | null; guest_name: string | null; payment_method: string | null;
        customers: { full_name: string } | null;
        profiles: { full_name: string | null } | null;
      };
      const servicioRows: IncomeRow[] = ((serviciosData ?? []) as ServicioRow[])
        .map((s) => ({
          id:             s.id,
          source:         "servicio" as IncomeSource,
          description:    s.customers?.full_name ?? s.guest_name ?? "Sin registro",
          detail:         (s.tags ?? []).slice(0, 2).join(" · ") || "Servicio especial",
          amount:         Number(s.price ?? 0),
          date:           s.delivered_at ?? s.updated_at ?? s.created_at,
          payment_method: s.payment_method,
          author_name:    s.profiles?.full_name ?? "Admin",
          parts_amount:   0,
          parts_summary:  "",
        }));

      // Combine and sort by date desc
      return [...ticketRows, ...posRows, ...servicioRows].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
  });
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, colorClass, loading }: {
  label: string; value: string; sub?: string;
  icon: IconDefinition; colorClass: string; loading: boolean;
}) {
  const textColor = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-muted-foreground';
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1 overflow-hidden transition-all hover:border-primary/50">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <FaIcon icon={icon} size={11} className={`shrink-0 ${textColor}`} />
        <span className="truncate">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <p className="font-bold font-mono text-lg tracking-tight truncate" title={value}>{value}</p>
      )}
      {sub && !loading && (
        <p className="text-[10px] text-muted-foreground truncate" title={sub}>{sub}</p>
      )}
    </div>
  );
}

// ── Source Badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: IncomeSource }) {
  if (source === "ticket") return (
    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1">
      <FaIcon icon={faTicket} size={10} /> Reparacion
    </Badge>
  );
  if (source === "servicio") return (
    <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/30 gap-1">
      <FaIcon icon={faLockOpen} size={10} /> Servicio
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1">
      <FaIcon icon={faStore} size={10} /> POS
    </Badge>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IngresosPage() {
  const { formatCurrency } = useOrganization();
  // Modo mensual (offset) vs rango custom
  const [monthOffset, setMonthOffset] = useState(0);
  // Rango custom
  const today = new Date().toISOString().slice(0, 10);
  const [rangeMode, setRangeMode]   = useState(false);
  const [rangeFrom, setRangeFrom]   = useState(today);
  const [rangeTo,   setRangeTo]     = useState(today);

  // Calcular start/end según el modo
  const refMonth = subMonths(new Date(), monthOffset);
  const start = rangeMode
    ? startOfDay(new Date(rangeFrom + "T00:00:00")).toISOString()
    : startOfMonth(refMonth).toISOString();
  const end = rangeMode
    ? endOfDay(new Date(rangeTo + "T00:00:00")).toISOString()
    : endOfMonth(refMonth).toISOString();

  const { data: stats, isLoading: loadingStats } = useFinanzasStats(
    { start, end }
  );
  const [search, setSearch]                      = useState("");
  const [sourceFilter, setSourceFilter]          = useState<"all" | IncomeSource>("all");

  const { data: rows = [], isLoading } = useIngresos(start, end);

  const fmt = formatCurrency;

  // Per-source totals
  const ticketTotal   = rows.filter((r) => r.source === "ticket").reduce((s, r) => s + r.amount, 0);
  const posTotal      = rows.filter((r) => r.source === "pos").reduce((s, r) => s + r.amount, 0);
  const servicioTotal = rows.filter((r) => r.source === "servicio").reduce((s, r) => s + r.amount, 0);
  const totalMes      = ticketTotal + posTotal + servicioTotal;

  const monthLabel = rangeMode
    ? `${rangeFrom} → ${rangeTo}`
    : format(refMonth, "MMMM yyyy", { locale: es });

  // Filter
  let filtered = rows;
  if (sourceFilter !== "all") filtered = filtered.filter((r) => r.source === sourceFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((r) =>
      r.description.toLowerCase().includes(q) ||
      r.detail.toLowerCase().includes(q)
    );
  }

  const columns: DataColumn<IncomeRow>[] = [
    {
      key: "description",
      header: "Origen",
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SourceBadge source={row.source} />
            <p className="font-medium text-sm">{row.description}</p>
          </div>
          <p className="text-xs text-muted-foreground">{row.detail}</p>
          {row.parts_amount > 0 && row.parts_summary && (
            <p className="text-[10px] text-amber-400/80 truncate" title={row.parts_summary}>
              {row.parts_summary}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "date",
      header: "Fecha",
      className: "hidden sm:table-cell",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.date), "dd MMM yyyy", { locale: es })}
        </span>
      ),
    },
    {
      key: "payment_method",
      header: "Pago",
      className: "hidden md:table-cell",
      cell: (row) => row.payment_method ? (
        <span className="text-xs capitalize text-muted-foreground">{row.payment_method}</span>
      ) : (
        <span className="text-xs text-muted-foreground/40">—</span>
      ),
    },
    {
      key: "author_name",
      header: "Responsable",
      className: "hidden md:table-cell",
      cell: (row) => (
        <span className="text-xs font-medium text-muted-foreground">
          {row.author_name}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Ingreso",
      cell: (row) => (
        row.source === "ticket" && row.parts_amount > 0 ? (
          <div className="space-y-0.5 text-right">
            <p className="text-[10px] text-muted-foreground">M.obra: {fmt(row.amount - row.parts_amount)}</p>
            <p className="text-[10px] text-amber-400/80">Repuestos: {fmt(row.parts_amount)}</p>
            <p className="font-mono text-sm font-semibold text-emerald-400">{fmt(row.amount)}</p>
          </div>
        ) : (
          <span className="font-mono text-sm font-semibold text-emerald-400">
            {fmt(row.amount)}
          </span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FaIcon icon={faArrowTrendUp} size={18} className="text-emerald-400" /> Ingresos
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Exportar CSV */}
          <button
            onClick={() =>
              downloadCSV(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filtered as any[],
                INGRESOS_CSV_HEADERS,
                `ingresos-${rangeMode ? rangeFrom : format(refMonth, "yyyy-MM", { locale: es })}.csv`
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
          >
            <FaIcon icon={faDollarSign} size={12} />
            Exportar CSV
          </button>

          {/* Rango custom */}
          {rangeMode ? (
            <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/5 rounded-lg px-2 py-1">
              <FaIcon icon={faCalendarDays} size={12} className="text-emerald-400 shrink-0" />
              <input
                type="date"
                value={rangeFrom}
                max={rangeTo}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="text-xs bg-transparent border-none outline-none text-foreground w-[108px]"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <input
                type="date"
                value={rangeTo}
                min={rangeFrom}
                onChange={(e) => setRangeTo(e.target.value)}
                className="text-xs bg-transparent border-none outline-none text-foreground w-[108px]"
              />
              <button
                onClick={() => setRangeMode(false)}
                className="text-muted-foreground hover:text-foreground ml-1"
                title="Volver a vista mensual"
              >
                <FaIcon icon={faXmark} size={12} />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => { setRangeMode(true); setRangeFrom(today); setRangeTo(today); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                title="Seleccionar rango de fechas"
              >
                <FaIcon icon={faCalendarDays} size={12} />
                Rango
              </button>
              {/* Month navigator */}
              <div className="flex items-center gap-2 border border-border rounded-lg px-2 py-1">
                <button
                  className="size-7 flex items-center justify-center hover:text-foreground text-muted-foreground transition-colors"
                  onClick={() => setMonthOffset((m: number) => m + 1)}
                >
                  <FaIcon icon={faChevronRight} size={12} className="rotate-180" />
                </button>
                <span className="text-xs font-medium capitalize min-w-[90px] text-center">
                  <FaIcon icon={faCalendar} size={11} className="inline mr-1 opacity-60" />
                  {monthOffset === 0 ? "Este mes" : format(refMonth, "MMM yyyy", { locale: es })}
                </span>
                <button
                  className="size-7 flex items-center justify-center hover:text-foreground text-muted-foreground transition-colors disabled:opacity-30"
                  onClick={() => setMonthOffset((m: number) => Math.max(0, m - 1))}
                  disabled={monthOffset === 0}
                >
                  <FaIcon icon={faChevronRight} size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total del mes"
          value={fmt(totalMes)}
          sub={`${rows.length} registros`}
          icon={faArrowTrendUp}
          colorClass="bg-emerald-500/20 text-emerald-400"
          loading={isLoading}
        />
        <StatCard
          label="De reparaciones"
          value={fmt(ticketTotal)}
          sub="labor + repuestos"
          icon={faTicket}
          colorClass="bg-blue-500/20 text-blue-400"
          loading={isLoading}
        />
        <StatCard
          label="De ventas POS"
          value={fmt(posTotal)}
          sub="punto de venta"
          icon={faStore}
          colorClass="bg-emerald-500/20 text-emerald-400"
          loading={isLoading}
        />
        <StatCard
          label="Otros servicios"
          value={fmt(servicioTotal)}
          sub="desbloqueos y software"
          icon={faLockOpen}
          colorClass="bg-violet-500/20 text-violet-400"
          loading={isLoading}
        />
        <StatCard
          label="Por Cobrar (Fiados)"
          value={fmt(stats?.porCobrar ?? 0)}
          sub="deudas pendientes"
          icon={faWallet}
          colorClass="bg-orange-500/20 text-orange-400"
          loading={loadingStats}
        />
      </div>

      {/* ── Source filter tabs ── */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all",      label: "Todos",      icon: faBagShopping,  count: rows.length },
          { value: "ticket",   label: "Reparaciones", icon: faTicket, count: rows.filter((r) => r.source === "ticket").length },
          { value: "pos",      label: "POS",        icon: faStore,        count: rows.filter((r) => r.source === "pos").length },
          { value: "servicio", label: "Servicios",  icon: faLockOpen,        count: rows.filter((r) => r.source === "servicio").length },
        ].map(({ value, label, icon, count }) => (
          <button
            key={value}
            onClick={() => setSourceFilter(value as "all" | IncomeSource)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              sourceFilter === value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <FaIcon icon={icon} size={12} />
            {label}
            <span className={`text-[10px] font-bold ${sourceFilter === value ? "opacity-80" : "opacity-50"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <FaIcon icon={faMagnifyingGlass} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por cliente, dispositivo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Table ── */}
      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder=""
        searchKeys={[]}
        emptyMessage={
          search
            ? `Sin resultados para "${search}"`
            : `Sin ingresos en ${monthLabel}`
        }
        emptyIcon={<FaIcon icon={faArrowTrendUp} size={28} className="opacity-30" />}
      />
    </div>
  );
}

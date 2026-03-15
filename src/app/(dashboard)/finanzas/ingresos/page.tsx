"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp, DollarSign, Clock, TicketCheck, Store,
  Search, ChevronRight, Calendar, ShoppingBag, Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useFinanzasStats } from "@/hooks/useGastos";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { downloadCSV, INGRESOS_CSV_HEADERS } from "@/lib/exportUtils";

// ── Types ─────────────────────────────────────────────────────────────────────

import { Ghost } from "lucide-react";

type IncomeSource = "ticket" | "pos" | "servicio";

interface IncomeRow {
  id:           string;
  source:       IncomeSource;
  description:  string;        // customer name / device OR "Venta POS"
  detail:       string;        // device model OR items summary
  amount:       number;
  date:         string;        // ISO
  payment_method: string | null;
  author_name:  string | null;
}

// ── Hook: combined income ─────────────────────────────────────────────────────

function useIngresos(monthOffset = 0) {
  return useQuery({
    queryKey: ["ingresos", monthOffset],
    queryFn: async (): Promise<IncomeRow[]> => {
      const supabase = createClient();
      const now   = new Date();
      const ref   = subMonths(now, monthOffset);
      const start = startOfMonth(ref).toISOString();
      const end   = endOfMonth(ref).toISOString();

      // ── 1. Tickets pagados ──
      const { data: ticketData } = await supabase
        .from("tickets")
        .select(`id, final_amount, quote_amount, delivered_at, paid_at, updated_at, device_details, payment_status, payment_method,
          customers ( full_name ),
          profiles!tickets_assigned_to_fkey ( full_name ),
          ticket_items ( unit_price, quantity )`)
        .eq("payment_status", "pagado")
        .gte("paid_at", start)
        .lte("paid_at", end)
        .order("paid_at", { ascending: false });

      const ticketRows: IncomeRow[] = ((ticketData ?? []) as any[])
        .map((t) => {
          const base   = Number(t.final_amount ?? t.quote_amount ?? 0);
          const extras = (t.ticket_items ?? []).reduce(
            (s: number, i: { unit_price: number; quantity: number }) =>
              s + Number(i.unit_price) * Number(i.quantity), 0
          );
          return {
            id:      t.id,
            source:  "ticket" as IncomeSource,
            description: t.customers?.full_name ?? "Sin cliente",
            detail:  [t.device_details?.brand, t.device_details?.model].filter(Boolean).join(" ") || "Reparación",
            amount:  base + extras,
            date:    t.paid_at ?? t.delivered_at ?? t.updated_at,
            payment_method: t.payment_method,
            author_name: t.profiles?.full_name ?? "Admin",
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
        .gte("paid_at", start)
        .lte("paid_at", end)
        .order("paid_at", { ascending: false });

      const posRows: IncomeRow[] = ((posData ?? []) as any[])
        .map((s) => {
        const itemsSummary = (s.sale_items ?? [])
          .map((si: any) => `${[si.inventory?.brand, si.inventory?.name].filter(Boolean).join(" ")} ×${si.quantity}`)
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

      const servicioRows: IncomeRow[] = ((serviciosData ?? []) as any[])
        .map((s) => ({
          id:             s.id,
          source:         "servicio" as IncomeSource,
          description:    s.customers?.full_name ?? s.guest_name ?? "Sin registro",
          detail:         (s.tags ?? []).slice(0, 2).join(" · ") || "Servicio especial",
          amount:         Number(s.price ?? 0),
          date:           s.delivered_at ?? s.updated_at ?? s.created_at,
          payment_method: s.payment_method,
          author_name:    s.profiles?.full_name ?? "Admin",
        }));

      // Combine and sort by date desc
      return [...ticketRows, ...posRows, ...servicioRows].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
  });
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, colorClass, loading }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; colorClass: string; loading: boolean;
}) {
  const textColor = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-muted-foreground';
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1 overflow-hidden transition-all hover:border-primary/50">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Icon className={`size-3.5 shrink-0 ${textColor}`} />
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
      <TicketCheck className="size-2.5" /> Reparacion
    </Badge>
  );
  if (source === "servicio") return (
    <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/30 gap-1">
      <Ghost className="size-2.5" /> Servicio
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1">
      <Store className="size-2.5" /> POS
    </Badge>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IngresosPage() {
  const { formatCurrency } = useOrganization();
  const { data: stats, isLoading: loadingStats } = useFinanzasStats();
  const [monthOffset, setMonthOffset]            = useState(0);
  const [search, setSearch]                      = useState("");
  const [sourceFilter, setSourceFilter]          = useState<"all" | IncomeSource>("all");

  const { data: rows = [], isLoading } = useIngresos(monthOffset);

  const fmt = formatCurrency;

  // Per-source totals
  const ticketTotal   = rows.filter((r) => r.source === "ticket").reduce((s, r) => s + r.amount, 0);
  const posTotal      = rows.filter((r) => r.source === "pos").reduce((s, r) => s + r.amount, 0);
  const servicioTotal = rows.filter((r) => r.source === "servicio").reduce((s, r) => s + r.amount, 0);
  const totalMes      = ticketTotal + posTotal + servicioTotal;
  const rowCount    = rows.length;
  const avg         = rowCount > 0 ? totalMes / rowCount : 0;

  // Month label
  const refMonth  = subMonths(new Date(), monthOffset);
  const monthLabel = format(refMonth, "MMMM yyyy", { locale: es });

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
        <span className="font-mono text-sm font-semibold text-emerald-400">
          + {fmt(row.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="size-5 text-emerald-400" /> Ingresos
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Exportar CSV */}
          <button
            onClick={() =>
              downloadCSV(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                filtered as any[],
                INGRESOS_CSV_HEADERS,
                `ingresos-${format(refMonth, "yyyy-MM", { locale: es })}.csv`
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
          >
            <DollarSign className="size-3.5" />
            Exportar CSV
          </button>

          {/* Month navigator */}
          <div className="flex items-center gap-2 border border-border rounded-lg px-2 py-1">
            <Button
              variant="ghost" size="icon" className="size-7"
              onClick={() => setMonthOffset((m) => m + 1)}
            >
              <ChevronRight className="size-4 rotate-180" />
            </Button>
            <span className="text-xs font-medium capitalize min-w-[90px] text-center">
              <Calendar className="size-3 inline mr-1 opacity-60" />
              {monthOffset === 0 ? "Este mes" : format(refMonth, "MMM yyyy", { locale: es })}
            </span>
            <Button
              variant="ghost" size="icon" className="size-7"
              onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
              disabled={monthOffset === 0}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total del mes"
          value={fmt(totalMes)}
          sub={`${rowCount} registros`}
          icon={TrendingUp}
          colorClass="bg-emerald-500/20 text-emerald-400"
          loading={isLoading}
        />
        <StatCard
          label="De reparaciones"
          value={fmt(ticketTotal)}
          sub="tickets entregados"
          icon={TicketCheck}
          colorClass="bg-blue-500/20 text-blue-400"
          loading={isLoading}
        />
        <StatCard
          label="De ventas POS"
          value={fmt(posTotal)}
          sub="punto de venta"
          icon={Store}
          colorClass="bg-emerald-500/20 text-emerald-400"
          loading={isLoading}
        />
        <StatCard
          label="Otros servicios"
          value={fmt(servicioTotal)}
          sub="desbloqueos y software"
          icon={Ghost}
          colorClass="bg-violet-500/20 text-violet-400"
          loading={isLoading}
        />
        <StatCard
          label="Por Cobrar (Fiados)"
          value={fmt(stats?.porCobrar ?? 0)}
          sub="deudas pendientes"
          icon={Wallet}
          colorClass="bg-orange-500/20 text-orange-400"
          loading={loadingStats}
        />
      </div>

      {/* ── Source filter tabs ── */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all",      label: "Todos",      icon: ShoppingBag,  count: rows.length },
          { value: "ticket",   label: "Reparaciones", icon: TicketCheck, count: rows.filter((r) => r.source === "ticket").length },
          { value: "pos",      label: "POS",        icon: Store,        count: rows.filter((r) => r.source === "pos").length },
          { value: "servicio", label: "Servicios",  icon: Ghost,        count: rows.filter((r) => r.source === "servicio").length },
        ].map(({ value, label, icon: Icon, count }) => (
          <button
            key={value}
            onClick={() => setSourceFilter(value as "all" | IncomeSource)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              sourceFilter === value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
            <span className={`text-[10px] font-bold ${sourceFilter === value ? "opacity-80" : "opacity-50"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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
        emptyIcon={<TrendingUp className="size-8 opacity-30" />}
      />
    </div>
  );
}

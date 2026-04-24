"use client";

import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  faArrowTrendUp, faCashRegister, faTicket, faLockOpen,
  faCalendarDays, faXmark, faChevronRight, faCalendar,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import { useOrganization } from "@/contexts/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface PaidTicket {
  id: string;
  ticket_number: number | null;
  device_details: Record<string, string | undefined>;
  final_amount: number | null;
  parts_amount: number;
  paid_at: string | null;
  payment_method: string | null;
  customers: { full_name: string } | null;
}

interface PaidSale {
  id: string;
  total_amount: number;
  paid_at: string | null;
  payment_method: string | null;
  customer_name: string | null;
  customers: { full_name: string } | null;
  sale_items: { quantity: number; inventory: { name: string } | null }[];
}

interface PaidServicio {
  id: string;
  service_type: string | null;
  price: number | null;
  delivered_at: string | null;
  payment_method: string | null;
  customers: { full_name: string } | null;
}

interface MyIncomeSummary {
  tickets: PaidTicket[];
  sales: PaidSale[];
  servicios: PaidServicio[];
}

// ── Hook de datos ──────────────────────────────────────────────────────────────

function useMyIncome(userId: string | null | undefined, start: string, end: string) {
  return useQuery<MyIncomeSummary>({
    queryKey: ["mis-ingresos", userId, start, end],
    enabled: !!userId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;

      const [tRes, sRes, svRes] = await Promise.all([
        db.from("tickets")
          .select("id, ticket_number, device_details, final_amount, parts_amount, paid_at, payment_method, customers(full_name)")
          .eq("payment_status", "pagado")
          .eq("assigned_to", userId)
          .gte("paid_at", start)
          .lte("paid_at", end),

        db.from("sales")
          .select("id, total_amount, paid_at, payment_method, customer_name, customers(full_name), sale_items(quantity, inventory(name))")
          .eq("payment_status", "pagado")
          .is("voided_at", null)
          .or(`created_by.eq.${userId},paid_by.eq.${userId}`)
          .gte("paid_at", start)
          .lte("paid_at", end),

        db.from("otros_servicios")
          .select("id, service_type, price, delivered_at, payment_method, customers(full_name)")
          .eq("status", "entregado")
          .eq("paid", true)
          .eq("created_by", userId)
          .gte("delivered_at", start)
          .lte("delivered_at", end),
      ]);

      return {
        tickets:   (tRes.data  ?? []) as PaidTicket[],
        sales:     (sRes.data  ?? []) as PaidSale[],
        servicios: (svRes.data ?? []) as PaidServicio[],
      };
    },
    staleTime: 5 * 60_000,
  });
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, loading }: {
  label: string; value: string; icon: IconDefinition; color: string; loading: boolean;
}) {
  const textColor = color.split(" ").find((c) => c.startsWith("text-")) ?? "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1 transition-all hover:border-primary/50">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <FaIcon icon={icon} size={13} className={`shrink-0 ${textColor}`} />
        <span className="truncate">{label}</span>
      </div>
      {loading ? <Skeleton className="h-6 w-20" /> : (
        <p className="font-bold font-mono text-lg tracking-tight truncate">{value}</p>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function paymentLabel(method: string | null) {
  const map: Record<string, string> = {
    efectivo: "Efectivo", transferencia: "Transf.", tarjeta: "Tarjeta",
  };
  return method ? (map[method] ?? method) : "—";
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MisIngresosPage() {
  const { role, userId, formatCurrency } = useOrganization();

  // Admins no deberían estar aquí
  if (role === "admin" || role === "superadmin") {
    redirect("/finanzas/ingresos");
  }

  // ── Período ──────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const [monthOffset, setMonthOffset] = useState(0);
  const [rangeMode,   setRangeMode]   = useState(false);
  const [rangeFrom,   setRangeFrom]   = useState(today);
  const [rangeTo,     setRangeTo]     = useState(today);

  const refMonth = subMonths(new Date(), monthOffset);
  const { start, end } = rangeMode
    ? {
        start: startOfDay(new Date(rangeFrom + "T00:00:00")).toISOString(),
        end:   endOfDay(new Date(rangeTo + "T00:00:00")).toISOString(),
      }
    : {
        start: startOfMonth(refMonth).toISOString(),
        end:   endOfMonth(refMonth).toISOString(),
      };

  const periodLabel = rangeMode
    ? `${rangeFrom} → ${rangeTo}`
    : format(refMonth, "MMMM yyyy", { locale: es });

  // ── Datos ─────────────────────────────────────────────────────────────────────
  const { data, isLoading } = useMyIncome(userId, start, end);

  const tickets   = data?.tickets   ?? [];
  const sales     = data?.sales     ?? [];
  const servicios = data?.servicios ?? [];

  const totalTickets   = tickets.reduce((s, t)  => s + Number(t.final_amount ?? 0) + Number(t.parts_amount ?? 0), 0);
  const totalSales     = sales.reduce((s, v)    => s + Number(v.total_amount), 0);
  const totalServicios = servicios.reduce((s, sv) => s + Number(sv.price ?? 0), 0);
  const totalGeneral   = totalTickets + totalSales + totalServicios;

  const fmt = formatCurrency;

  // ── Columnas ──────────────────────────────────────────────────────────────────

  const ticketCols: DataColumn<PaidTicket>[] = [
    {
      key: "ticket_number",
      header: "N°",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.ticket_number ?? row.id.slice(0, 6).toUpperCase()}
        </span>
      ),
    },
    {
      key: "device_details",
      header: "Dispositivo",
      primary: true,
      cell: (row) => {
        const d = row.device_details;
        return (
          <div>
            <p className="text-sm font-medium">{[d?.brand, d?.model].filter(Boolean).join(" ") || "—"}</p>
            <p className="text-xs text-muted-foreground">{row.customers?.full_name ?? "—"}</p>
          </div>
        );
      },
    },
    {
      key: "paid_at",
      header: "Cobrado",
      className: "hidden sm:table-cell",
      showOnMobile: false,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.paid_at ? format(new Date(row.paid_at), "dd MMM, HH:mm", { locale: es }) : "—"}
        </span>
      ),
    },
    {
      key: "payment_method",
      header: "Método",
      className: "hidden md:table-cell",
      showOnMobile: false,
      cell: (row) => (
        <Badge variant="outline" className="text-[10px]">{paymentLabel(row.payment_method)}</Badge>
      ),
    },
    {
      key: "final_amount",
      header: "Monto",
      cell: (row) => (
        <span className="font-mono text-sm font-semibold text-emerald-400">
          {fmt(Number(row.final_amount ?? 0) + Number(row.parts_amount ?? 0))}
        </span>
      ),
    },
  ];

  const salesCols: DataColumn<PaidSale>[] = [
    {
      key: "id",
      header: "#",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">#{row.id.slice(0, 6).toUpperCase()}</span>
      ),
    },
    {
      key: "sale_items",
      header: "Productos / Cliente",
      primary: true,
      cell: (row) => {
        const clientName = row.customers?.full_name ?? row.customer_name ?? null;
        const productos = row.sale_items?.map((i) => `${i.quantity}× ${i.inventory?.name ?? "Producto"}`).join(", ") || "—";
        return (
          <div>
            <p className="text-sm truncate max-w-[200px]">{productos}</p>
            {clientName && <p className="text-xs text-muted-foreground">{clientName}</p>}
          </div>
        );
      },
    },
    {
      key: "paid_at",
      header: "Cobrado",
      className: "hidden sm:table-cell",
      showOnMobile: false,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.paid_at ? format(new Date(row.paid_at), "dd MMM, HH:mm", { locale: es }) : "—"}
        </span>
      ),
    },
    {
      key: "payment_method",
      header: "Método",
      className: "hidden md:table-cell",
      showOnMobile: false,
      cell: (row) => (
        <Badge variant="outline" className="text-[10px]">{paymentLabel(row.payment_method)}</Badge>
      ),
    },
    {
      key: "total_amount",
      header: "Monto",
      cell: (row) => (
        <span className="font-mono text-sm font-semibold text-emerald-400">{fmt(Number(row.total_amount))}</span>
      ),
    },
  ];

  const serviciosCols: DataColumn<PaidServicio>[] = [
    {
      key: "service_type",
      header: "Servicio",
      primary: true,
      cell: (row) => (
        <div>
          <p className="text-sm font-medium">{row.service_type ?? "Servicio"}</p>
          <p className="text-xs text-muted-foreground">{row.customers?.full_name ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "delivered_at",
      header: "Entregado",
      className: "hidden sm:table-cell",
      showOnMobile: false,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.delivered_at ? format(new Date(row.delivered_at), "dd MMM, HH:mm", { locale: es }) : "—"}
        </span>
      ),
    },
    {
      key: "payment_method",
      header: "Método",
      className: "hidden md:table-cell",
      showOnMobile: false,
      cell: (row) => (
        <Badge variant="outline" className="text-[10px]">{paymentLabel(row.payment_method)}</Badge>
      ),
    },
    {
      key: "price",
      header: "Monto",
      cell: (row) => (
        <span className="font-mono text-sm font-semibold text-emerald-400">{fmt(Number(row.price ?? 0))}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FaIcon icon={faArrowTrendUp} size={18} className="text-emerald-400" />
          Mis Ingresos
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{periodLabel}</p>
      </div>

      {/* ── Selector de período ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {rangeMode ? (
          <div className="flex items-center gap-2 border border-primary/30 bg-primary/5 rounded-lg px-2 py-1.5">
            <FaIcon icon={faCalendarDays} size={12} className="text-primary shrink-0" />
            <input type="date" value={rangeFrom} max={rangeTo}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-foreground w-[108px]" />
            <span className="text-xs text-muted-foreground">→</span>
            <input type="date" value={rangeTo} min={rangeFrom}
              onChange={(e) => setRangeTo(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-foreground w-[108px]" />
            <button onClick={() => setRangeMode(false)} className="text-muted-foreground hover:text-foreground ml-1">
              <FaIcon icon={faXmark} size={12} />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => { setRangeMode(true); setRangeFrom(today); setRangeTo(today); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <FaIcon icon={faCalendarDays} size={12} /> Rango
            </button>
            <div className="flex items-center gap-1.5 border border-border rounded-lg px-2 py-1">
              <button className="size-7 flex items-center justify-center hover:text-foreground text-muted-foreground"
                onClick={() => setMonthOffset((m) => m + 1)}>
                <FaIcon icon={faChevronRight} size={12} className="rotate-180" />
              </button>
              <span className="text-xs font-medium capitalize min-w-[90px] text-center">
                <FaIcon icon={faCalendar} size={11} className="inline mr-1 opacity-60" />
                {monthOffset === 0 ? "Este mes" : format(refMonth, "MMM yyyy", { locale: es })}
              </span>
              <button
                className="size-7 flex items-center justify-center hover:text-foreground text-muted-foreground disabled:opacity-30"
                onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
                disabled={monthOffset === 0}>
                <FaIcon icon={faChevronRight} size={12} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Reparaciones"  value={fmt(totalTickets)}   icon={faTicket}       color="text-violet-400"  loading={isLoading} />
        <StatCard label="Ventas POS"    value={fmt(totalSales)}     icon={faCashRegister} color="text-emerald-400" loading={isLoading} />
        <StatCard label="Otros Serv."   value={fmt(totalServicios)} icon={faLockOpen}     color="text-cyan-400"    loading={isLoading} />
        <StatCard
          label="Total del período"
          value={fmt(totalGeneral)}
          icon={faArrowTrendUp}
          color="text-amber-400"
          loading={isLoading}
        />
      </div>

      {/* ── Tabla por fuente ── */}
      <Tabs defaultValue="tickets">
        <TabsList className="h-9">
          <TabsTrigger value="tickets" className="text-xs gap-1.5">
            <FaIcon icon={faTicket} size={12} />
            Reparaciones
            {tickets.length > 0 && (
              <span className="ml-1 bg-violet-500/20 text-violet-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {tickets.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pos" className="text-xs gap-1.5">
            <FaIcon icon={faCashRegister} size={12} />
            Ventas POS
            {sales.length > 0 && (
              <span className="ml-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {sales.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="servicios" className="text-xs gap-1.5">
            <FaIcon icon={faLockOpen} size={12} />
            Otros Serv.
            {servicios.length > 0 && (
              <span className="ml-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {servicios.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-4">
          {/* Resumen total tab */}
          <Card className="mb-3 border-violet-500/20 bg-violet-500/5">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm text-violet-400 font-semibold">
                Total reparaciones: {fmt(totalTickets)}
              </CardTitle>
            </CardHeader>
          </Card>
          <DataTable
            data={tickets}
            columns={ticketCols}
            isLoading={isLoading}
            searchKeys={["device_details", "customers"]}
            searchPlaceholder="Buscar por dispositivo o cliente..."
            emptyMessage="Sin reparaciones cobradas en este período"
            emptyIcon={<FaIcon icon={faTicket} size={28} className="text-muted-foreground/30" />}
          />
        </TabsContent>

        <TabsContent value="pos" className="mt-4">
          <Card className="mb-3 border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm text-emerald-400 font-semibold">
                Total ventas POS: {fmt(totalSales)}
              </CardTitle>
            </CardHeader>
          </Card>
          <DataTable
            data={sales}
            columns={salesCols}
            isLoading={isLoading}
            searchKeys={[]}
            searchPlaceholder="Buscar venta..."
            emptyMessage="Sin ventas POS en este período"
            emptyIcon={<FaIcon icon={faCashRegister} size={28} className="text-muted-foreground/30" />}
          />
        </TabsContent>

        <TabsContent value="servicios" className="mt-4">
          <Card className="mb-3 border-cyan-500/20 bg-cyan-500/5">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm text-cyan-400 font-semibold">
                Total otros servicios: {fmt(totalServicios)}
              </CardTitle>
            </CardHeader>
          </Card>
          <DataTable
            data={servicios}
            columns={serviciosCols}
            isLoading={isLoading}
            searchKeys={["service_type"]}
            searchPlaceholder="Buscar servicio..."
            emptyMessage="Sin otros servicios entregados en este período"
            emptyIcon={<FaIcon icon={faLockOpen} size={28} className="text-muted-foreground/30" />}
          />
        </TabsContent>
      </Tabs>

    </div>
  );
}

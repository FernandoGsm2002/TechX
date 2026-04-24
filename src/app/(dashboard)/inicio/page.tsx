"use client";

import React from "react";
import Link from "next/link";
import {
  faTicket, faUsers, faHandHoldingDollar, faArrowTrendUp,
  faTriangleExclamation, faClock, faCircleCheck, faArrowRight,
  faStore, faBagShopping, faTrophy, faWrench,
  faBolt, faBoxesStacked, faArrowTrendDown,
  faFileInvoiceDollar, faCashRegister, faGauge,
} from "@fortawesome/free-solid-svg-icons";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { TicketStatusBadge } from "@/components/ui-custom/TicketStatusBadge";
import { useTickets, useTicketsStats } from "@/hooks/useTickets";
import { useFinanzasStats } from "@/hooks/useGastos";
import { useSalesHistory, useLowStock } from "@/hooks/usePOS";
import { useTechnicianStats } from "@/hooks/useTechnicians";
import { useTopClientes, useTopTecnicos } from "@/hooks/useClienteHistory";
import { useIngresosChart, type ChartPeriod } from "@/hooks/useIngresosChart";
import { useOrganization } from "@/contexts/OrganizationContext";
import { UserAvatar } from "@/components/ui-custom/UserAvatar";
import type { DeviceDetails } from "@/types/domain";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

function ClientDate() {
  const [label, setLabel] = React.useState("");
  React.useEffect(() => {
    setLabel(format(new Date(), "EEEE dd 'de' MMMM", { locale: es }));
  }, []);
  return <span suppressHydrationWarning>{label}</span>;
}

// ── DashCard (mismo estilo que el original) ───────────────────────────────────

function DashCard({
  label, value, icon, color, href, loading,
}: {
  label: string; value: string | number;
  icon: IconDefinition; color: string; href?: string; loading?: boolean;
}) {
  const textColor = color.split(" ").find((c) => c.startsWith("text-")) ?? "text-muted-foreground";
  const content = (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1 overflow-hidden transition-all hover:border-primary/50">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <FaIcon icon={icon} size={12} className={`shrink-0 ${textColor}`} />
        <span className="truncate">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <p className="font-bold font-mono text-lg truncate">{value}</p>
      )}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── Section card wrapper ───────────────────────────────────────────────────────

function SectionCard({
  title, icon, iconClass, href, linkLabel, children, loading, skeletonH = 14,
}: {
  title: string; icon: IconDefinition; iconClass: string;
  href?: string; linkLabel?: string; children: React.ReactNode;
  loading?: boolean; skeletonH?: number;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <FaIcon icon={icon} size={13} className={iconClass} />
          {title}
        </h2>
        {href && linkLabel && (
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
            <Link href={href}>{linkLabel}</Link>
          </Button>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className={`h-${skeletonH} rounded-lg`} />
            ))
          : children}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { org, role, userId, formatCurrency } = useOrganization();
  const { data: ticketsResponse, isLoading: loadingTickets } = useTickets(undefined, { role, userId, page: 0, pageSize: 5 });
  const { data: ticketStats, isLoading: loadingTicketStats } = useTicketsStats(org?.id, role, userId);
  const tickets = ticketsResponse?.data ?? [];

  const { data: stats,          isLoading: loadingStats     } = useFinanzasStats();
  const { data: sales = []                                  } = useSalesHistory({ role, userId });
  const { data: lowStockItems = []                          } = useLowStock();

  const { data: techStats, isLoading: loadingTechStats } = useTechnicianStats(
    role === "tecnico" ? userId : null
  );
  const { data: topClientes = [], isLoading: loadingTopClientes } = useTopClientes(5);
  const { data: topTecnicos = [], isLoading: loadingTopTecnicos } = useTopTecnicos(5);

  const [chartPeriod, setChartPeriod] = React.useState<ChartPeriod>("month");
  const { data: chartData = [], isLoading: loadingChart } = useIngresosChart(chartPeriod);
  // Technician's own income chart (last 7 days)
  const { data: techChartData = [], isLoading: loadingTechChart } = useIngresosChart(
    "week",
    role === "tecnico" ? (userId ?? undefined) : undefined,
  );

  const isAdmin = role === "admin" || role === "superadmin";

  const activeTicketsCount = ticketStats?.pendientes ?? 0;
  const readyTicketsCount  = ticketStats?.completado ?? 0;
  const recentTickets = tickets;
  const recentSales   = sales.slice(0, 4);

  const fmt = formatCurrency;

  // Status breakdown para el widget
  const statusBreakdown = [
    { key: "recibido",   label: "Recibido",   colorClass: "bg-blue-500/80", count: ticketStats?.recibido ?? 0 },
    { key: "en_proceso", label: "En proceso", colorClass: "bg-amber-500/80", count: ticketStats?.en_proceso ?? 0 },
    { key: "completado", label: "Completado", colorClass: "bg-emerald-500/80", count: ticketStats?.completado ?? 0 },
    { key: "entregado",  label: "Entregado",  colorClass: "bg-slate-400/80", count: ticketStats?.entregado ?? 0 },
    { key: "fallido",    label: "Fallido",    colorClass: "bg-red-500/80", count: ticketStats?.fallido ?? 0 },
  ];
  const totalTickets = ticketStats?.total || 1;

  // Métricas operacionales
  const avgRepairDays = ticketStats?.avg_repair_days ?? null;
  const deliveryRate = totalTickets > 1 && ticketStats?.entregado
    ? Math.round((ticketStats.entregado / totalTickets) * 100)
    : 0;
  const avgTicketValue = ticketStats?.avg_ticket_value ?? null;

  // Margen operativo
  const ingresosTotal = stats?.totalIngresos ?? 0;
  const gastosTotal   = stats?.totalGastos   ?? 0;
  const margen = ingresosTotal > 0
    ? Math.max(0, Math.round(((ingresosTotal - gastosTotal) / ingresosTotal) * 100))
    : 0;

  // Donut: distribución de fuentes de ingreso (del mes actual)
  const srcTickets   = chartData.reduce((s, d) => s + d.tickets,   0);
  const srcPos       = chartData.reduce((s, d) => s + d.pos,       0);
  const srcServicios = chartData.reduce((s, d) => s + d.servicios, 0);
  const pieData = [
    { name: "Reparaciones", value: srcTickets,   color: "#8b5cf6" },
    { name: "POS",          value: srcPos,       color: "#10b981" },
    { name: "Servicios",    value: srcServicios, color: "#06b6d4" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold">Bienvenido 👋</h1>
        <p className="text-sm text-muted-foreground">
          {org?.name} · <ClientDate />
        </p>
      </div>

      {/* ── Alertas ── */}
      <div className="space-y-2">
        {readyTicketsCount > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <FaIcon icon={faCircleCheck} size={14} className="shrink-0" />
              <span><strong>{readyTicketsCount}</strong> ticket{readyTicketsCount !== 1 ? "s" : ""} listo{readyTicketsCount !== 1 ? "s" : ""} para entregar</span>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
              <Link href="/tickets">Ver <FaIcon icon={faArrowRight} size={12} className="ml-1" /></Link>
            </Button>
          </div>
        )}
        {lowStockItems.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <FaIcon icon={faTriangleExclamation} size={14} className="shrink-0" />
              <span><strong>{lowStockItems.length}</strong> producto{lowStockItems.length !== 1 ? "s" : ""} con stock bajo</span>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300">
              <Link href="/inventario">Ver <FaIcon icon={faArrowRight} size={12} className="ml-1" /></Link>
            </Button>
          </div>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loadingTickets || loadingTicketStats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : isAdmin ? (
          <>
            <DashCard label="Tickets activos"     value={activeTicketsCount}                                            icon={faTicket}           color="bg-blue-500/20 text-blue-400"       href="/tickets" />
            <DashCard label="Listos p/ entregar"  value={readyTicketsCount}                                             icon={faCircleCheck}      color="bg-emerald-500/20 text-emerald-400" href="/tickets" />
            <DashCard label="Ingresos del mes"    value={loadingStats ? "…" : fmt(stats?.totalIngresos ?? 0)}           icon={faArrowTrendUp}     color="bg-amber-500/20 text-amber-400"     href="/finanzas/ingresos"  loading={loadingStats} />
            <DashCard label="Por Cobrar (Fiados)" value={loadingStats ? "…" : fmt(stats?.porCobrar ?? 0)}               icon={faHandHoldingDollar} color="bg-orange-500/20 text-orange-400"   href="/fiados"             loading={loadingStats} />
          </>
        ) : (
          <>
            <DashCard label="Tickets activos"    value={activeTicketsCount}                                                                           icon={faTicket}            color="bg-blue-500/20 text-blue-400"       href="/tickets" />
            <DashCard label="Listos p/ entregar" value={readyTicketsCount}                                                                            icon={faCircleCheck}       color="bg-emerald-500/20 text-emerald-400"  href="/tickets" />
            <DashCard label="Por Cobrar"         value={loadingStats ? "…" : fmt(stats?.porCobrar ?? 0)}                                              icon={faHandHoldingDollar} color="bg-orange-500/20 text-orange-400"    href="/fiados"                loading={loadingStats} />
            <DashCard label="Mis ingresos (Mes)" value={loadingTechStats ? "…" : fmt((techStats?.monthRevenue ?? 0) + (techStats?.posRevenue ?? 0))} icon={faArrowTrendUp}      color="bg-amber-500/20 text-amber-400"     href="/finanzas/mis-ingresos" loading={loadingTechStats} />
          </>
        )}
      </div>

      {/* ── Métricas operacionales (admin only) ── */}
      {isAdmin && (
        <div className="grid grid-cols-3 gap-3">
          <DashCard
            label="Tiempo prom. reparación"
            value={avgRepairDays != null ? `${avgRepairDays}d` : "—"}
            icon={faClock}
            color="bg-sky-500/20 text-sky-400"
            loading={loadingTickets}
          />
          <DashCard
            label="Tasa de entrega"
            value={`${deliveryRate}%`}
            icon={faCircleCheck}
            color="bg-teal-500/20 text-teal-400"
            loading={loadingTickets}
          />
          <DashCard
            label="Ticket promedio"
            value={avgTicketValue != null ? fmt(avgTicketValue) : "—"}
            icon={faWrench}
            color="bg-indigo-500/20 text-indigo-400"
            loading={loadingTickets}
          />
        </div>
      )}

      {/* ── Chart: Ingresos (admin only) ── */}
      {isAdmin && (
        <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <FaIcon icon={faArrowTrendUp} size={13} className="text-emerald-400" />
              Ingresos
            </h2>
            <div className="flex items-center gap-2">
              {/* Period tabs */}
              {(["day", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    chartPeriod === p
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "day" ? "Hoy" : p === "week" ? "7 días" : "Mes"}
                </button>
              ))}
              <div className="w-px h-4 bg-border/50 mx-1" />
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-violet-500/70" />Rep.</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500/70" />POS</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-cyan-500/70" />Serv.</span>
              </div>
            </div>
          </div>
          <div className="p-3">
            {loadingChart ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTickets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gServicios" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "currentColor", opacity: 0.45 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "currentColor", opacity: 0.45 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v) => fmt(v).replace(/\s/g, "")}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4, color: "hsl(var(--foreground))" }}
                    formatter={(value, name) => [
                      fmt(Number(value ?? 0)),
                      name === "tickets" ? "Reparaciones" : name === "pos" ? "POS" : "Servicios",
                    ]}
                    cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="tickets"   stroke="#8b5cf6" strokeWidth={1.5} fill="url(#gTickets)"   dot={false} />
                  <Area type="monotone" dataKey="pos"        stroke="#10b981" strokeWidth={1.5} fill="url(#gPos)"       dot={false} />
                  <Area type="monotone" dataKey="servicios" stroke="#06b6d4" strokeWidth={1.5} fill="url(#gServicios)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ── Chart: Mis Ingresos (tecnico only) ── */}
      {!isAdmin && (
        <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <FaIcon icon={faArrowTrendUp} size={13} className="text-amber-400" />
              Mis Ingresos — Últimos 7 días
            </h2>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-violet-500/70" />Reparaciones</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500/70" />POS</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-cyan-500/70" />Servicios</span>
            </div>
          </div>
          <div className="p-3">
            {loadingTechChart ? (
              <Skeleton className="h-36 w-full rounded-lg" />
            ) : techChartData.every(d => d.total === 0) ? (
              <div className="h-36 flex items-center justify-center text-sm text-muted-foreground">
                Sin ingresos registrados esta semana
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={techChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tgTickets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="tgPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="tgServicios" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "currentColor", opacity: 0.45 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "currentColor", opacity: 0.45 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => fmt(v).replace(/\s/g, "")} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px", padding: "8px 12px" }}
                      labelStyle={{ fontWeight: 600, marginBottom: 4, color: "hsl(var(--foreground))" }}
                      formatter={(value, name) => [fmt(Number(value ?? 0)), name === "tickets" ? "Reparaciones" : name === "pos" ? "POS" : "Servicios"]}
                      cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                    />
                    <Area type="monotone" dataKey="tickets"   stroke="#8b5cf6" strokeWidth={1.5} fill="url(#tgTickets)"   dot={false} />
                    <Area type="monotone" dataKey="pos"       stroke="#10b981" strokeWidth={1.5} fill="url(#tgPos)"       dot={false} />
                    <Area type="monotone" dataKey="servicios" stroke="#06b6d4" strokeWidth={1.5} fill="url(#tgServicios)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                {/* Desglose */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/40">
                  {[
                    { label: "Reparaciones", value: techChartData.reduce((s, d) => s + d.tickets, 0),   color: "text-violet-400" },
                    { label: "POS",          value: techChartData.reduce((s, d) => s + d.pos, 0),       color: "text-emerald-400" },
                    { label: "Servicios",    value: techChartData.reduce((s, d) => s + d.servicios, 0), color: "text-cyan-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p className={`font-mono font-semibold text-sm ${color}`}>{fmt(value)}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Fila de widgets ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Widget 1: Estado de tickets */}
        <SectionCard title="Estado de Tickets" icon={faGauge} iconClass="text-primary" loading={loadingTickets} skeletonH={6}>
          <div className="space-y-2 pt-0.5">
            {statusBreakdown.map(({ key, label, colorClass, count }) => {
              const pct   = Math.round((count / (totalTickets === 1 ? 1 : totalTickets)) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-mono font-semibold">{count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${colorClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {totalTickets === 1 && ticketStats?.total === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Sin tickets aún</p>
            )}
          </div>
        </SectionCard>

        {/* Widget 2: Resumen financiero (solo admin) */}
        {isAdmin && (
          <SectionCard title="Resumen del Mes" icon={faArrowTrendUp} iconClass="text-emerald-400" href="/finanzas/ingresos" linkLabel="Detalle" loading={loadingStats || loadingChart} skeletonH={5}>
            <div className="space-y-2.5 pt-0.5">

              {/* Donut: fuentes de ingreso */}
              {pieData.length > 0 && (
                <div className="flex items-center gap-3 pb-1">
                  <ResponsiveContainer width={72} height={72}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={22}
                        outerRadius={34}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "10px",
                          padding: "4px 8px",
                        }}
                        formatter={(value) => [fmt(Number(value)), ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 flex-1 min-w-0">
                    {pieData.map((d) => {
                      const pct = ingresosTotal > 0 ? Math.round((d.value / ingresosTotal) * 100) : 0;
                      return (
                        <div key={d.name} className="flex items-center justify-between gap-1.5">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.color }} />
                            {d.name}
                          </span>
                          <span className="text-[10px] font-mono font-semibold shrink-0" style={{ color: d.color }}>
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FaIcon icon={faArrowTrendUp} size={10} className="text-emerald-400" /> Ingresos
                </span>
                <span className="font-mono font-semibold text-emerald-400">{fmt(ingresosTotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <FaIcon icon={faArrowTrendDown} size={10} className="text-red-400" /> Gastos
                </span>
                <span className="font-mono font-semibold text-red-400">{fmt(gastosTotal)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xs">
                <span className="font-semibold">Utilidad neta</span>
                <span className={`font-mono font-bold ${(ingresosTotal - gastosTotal) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(ingresosTotal - gastosTotal)}
                </span>
              </div>
              {ingresosTotal > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Margen operativo</span>
                    <span className="font-mono">{margen}%</span>
                  </div>
                  <Progress value={margen} className="h-1.5" />
                </div>
              )}
              {(stats?.porCobrar ?? 0) > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
                  <span className="text-[10px] text-amber-400 flex items-center gap-1.5">
                    <FaIcon icon={faHandHoldingDollar} size={10} /> Por cobrar
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">{fmt(stats!.porCobrar)}</span>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Widget 3: Acciones rápidas */}
        <SectionCard title="Acciones Rápidas" icon={faBolt} iconClass="text-primary">
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {[
              { label: "Nuevo Ticket",  href: "/tickets/new",        icon: faTicket,            text: "text-blue-400",   bg: "bg-blue-500/10",    border: "border-blue-500/20"    },
              { label: "Venta POS",     href: "/pos",                icon: faCashRegister,      text: "text-emerald-400",bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { label: "Nuevo Cliente", href: "/clientes",           icon: faUsers,             text: "text-purple-400", bg: "bg-purple-500/10",  border: "border-purple-500/20"  },
              ...(isAdmin ? [
                { label: "Ver Ingresos", href: "/finanzas/ingresos", icon: faFileInvoiceDollar, text: "text-amber-400",  bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
              ] : [
                { label: "Por Cobrar",   href: "/fiados",            icon: faHandHoldingDollar, text: "text-orange-400", bg: "bg-orange-500/10",  border: "border-orange-500/20"  },
              ]),
            ].map(({ label, href, icon, text, bg, border }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 p-2.5 rounded-lg border ${border} ${bg} hover:opacity-80 transition-opacity`}
              >
                <FaIcon icon={icon} size={13} className={text} />
                <span className="text-xs font-medium leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Tickets + POS + Stock ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Tickets Recientes */}
        <SectionCard title="Tickets Recientes" icon={faTicket} iconClass="text-blue-400" href="/tickets" linkLabel="Ver todos" loading={loadingTickets}>
          {recentTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
              <FaIcon icon={faTicket} size={22} className="opacity-20" />
              <p className="text-xs">Sin tickets aún</p>
            </div>
          ) : recentTickets.map((t) => {
            const d = (t.device_details ?? {}) as DeviceDetails;
            return (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-3 py-2 hover:bg-muted/30 transition-colors gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{t.customers?.full_name ?? t.guest_name ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{d.brand} {d.model}</p>
                </div>
                <TicketStatusBadge status={t.status} />
              </Link>
            );
          })}
        </SectionCard>

        {/* Ventas POS */}
        <SectionCard title="Ventas POS" icon={faStore} iconClass="text-violet-400" href="/pos" linkLabel="Ir al POS">
          {recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
              <FaIcon icon={faStore} size={22} className="opacity-20" />
              <p className="text-xs">Sin ventas aún</p>
            </div>
          ) : recentSales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-3 py-2 gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{sale.customer_name ?? "Venta directa"}</p>
                <p className="text-[10px] text-muted-foreground capitalize truncate">
                  {sale.payment_method} · {formatDistanceToNow(new Date(sale.created_at), { locale: es, addSuffix: true })}
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shrink-0">
                +{fmt(sale.total_amount)}
              </Badge>
            </div>
          ))}
        </SectionCard>

        {/* Stock Crítico */}
        <SectionCard title="Stock Crítico" icon={faBoxesStacked} iconClass="text-amber-400" href="/inventario" linkLabel="Ver todo">
          {lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
              <FaIcon icon={faCircleCheck} size={22} className="text-emerald-500/40" />
              <p className="text-xs">Todo el stock está bien</p>
            </div>
          ) : lowStockItems.slice(0, 5).map((item) => {
            const pct = item.min_stock > 0
              ? Math.min(100, Math.round((item.quantity / item.min_stock) * 100))
              : 0;
            return (
              <div key={item.id} className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-medium truncate flex-1">{item.name}</p>
                  <span className="text-[10px] font-mono text-amber-400 ml-2 shrink-0">{item.quantity}/{item.min_stock}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500/70 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </SectionCard>
      </div>

      {/* ── Top Clientes + Top Técnicos (admin only) ── */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Top Clientes */}
          <SectionCard title="Mejores Clientes" icon={faTrophy} iconClass="text-amber-400" href="/clientes" linkLabel="Ver todos" loading={loadingTopClientes} skeletonH={12}>
            {topClientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                <FaIcon icon={faUsers} size={22} className="opacity-20" />
                <p className="text-xs">Sin datos aún</p>
              </div>
            ) : topClientes.map((c, idx) => (
              <HoverCard key={c.customer_id} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 hover:bg-muted/20 transition-colors cursor-default">
                    <span className={`text-xs font-bold font-mono w-4 shrink-0 ${
                      idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-orange-700" : "text-muted-foreground"
                    }`}>#{idx + 1}</span>
                    <UserAvatar name={c.full_name} size="sm" shape="circle" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.total_trabajos} operaci{c.total_trabajos !== 1 ? "ones" : "ón"}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs bg-amber-500/10 text-amber-400 border-amber-500/30 shrink-0">
                      {fmt(c.total_gastado)}
                    </Badge>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent side="left" align="start" className="w-60 p-3">
                  <p className="text-xs font-semibold mb-2.5 text-muted-foreground flex items-center gap-1.5">
                    <FaIcon icon={faTrophy} size={11} className="text-amber-400" /> Desglose de ingresos
                  </p>
                  <div className="space-y-1.5 text-xs font-medium">
                    {c.desglose.tickets > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <FaIcon icon={faWrench} size={10} className="text-violet-400" /> Reparaciones ({c.desglose.tickets})
                        </span>
                        <span className="font-mono">{fmt(c.desglose.ticket_amount)}</span>
                      </div>
                    )}
                    {c.desglose.servicios > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <FaIcon icon={faBolt} size={10} className="text-cyan-400" /> Servicios ({c.desglose.servicios})
                        </span>
                        <span className="font-mono">{fmt(c.desglose.servicio_amount)}</span>
                      </div>
                    )}
                    {c.desglose.ventas > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <FaIcon icon={faBagShopping} size={10} className="text-emerald-400" /> Ventas POS ({c.desglose.ventas})
                        </span>
                        <span className="font-mono">{fmt(c.desglose.venta_amount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-border/50 pt-1.5 mt-1.5">
                      <span className="font-semibold">Total generado</span>
                      <span className="font-mono font-bold text-amber-400">{fmt(c.total_gastado)}</span>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </SectionCard>

          {/* Top Técnicos */}
          <SectionCard title="Mejores Técnicos" icon={faWrench} iconClass="text-blue-400" href="/perfil" linkLabel="Ver equipo" loading={loadingTopTecnicos} skeletonH={12}>
            {topTecnicos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                <FaIcon icon={faWrench} size={22} className="opacity-20" />
                <p className="text-xs">Sin técnicos aún</p>
              </div>
            ) : topTecnicos.map((t, idx) => {
              const pctOps = topTecnicos[0]?.operaciones_totales > 0
                ? Math.round((t.operaciones_totales / topTecnicos[0].operaciones_totales) * 100)
                : 0;
              return (
                <HoverCard key={t.technician_id} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div className="rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 hover:bg-muted/20 transition-colors cursor-default space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold font-mono w-4 shrink-0 ${
                          idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-orange-700" : "text-muted-foreground"
                        }`}>#{idx + 1}</span>
                        <UserAvatar name={t.full_name} size="sm" shape="circle" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.full_name}</p>
                          <p className="text-xs text-muted-foreground">{t.operaciones_totales} operaci{t.operaciones_totales !== 1 ? "ones" : "ón"} completadas</p>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs bg-blue-500/10 text-blue-400 border-blue-500/30 shrink-0">
                          {fmt(t.ingresos_generados)}
                        </Badge>
                      </div>
                      <div className="ml-7 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500/60 transition-all" style={{ width: `${pctOps}%` }} />
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent side="left" align="start" className="w-60 p-3">
                    <p className="text-xs font-semibold mb-2.5 text-muted-foreground flex items-center gap-1.5">
                      <FaIcon icon={faWrench} size={11} className="text-blue-400" /> Desglose de ingresos
                    </p>
                    <div className="space-y-1.5 text-xs font-medium">
                      {t.desglose.tickets > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <FaIcon icon={faWrench} size={10} className="text-violet-400" /> Reparaciones ({t.desglose.tickets})
                          </span>
                          <span className="font-mono">{fmt(t.desglose.ticket_amount)}</span>
                        </div>
                      )}
                      {t.desglose.servicios > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <FaIcon icon={faBolt} size={10} className="text-cyan-400" /> Servicios ({t.desglose.servicios})
                          </span>
                          <span className="font-mono">{fmt(t.desglose.servicio_amount)}</span>
                        </div>
                      )}
                      {t.desglose.ventas > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <FaIcon icon={faBagShopping} size={10} className="text-emerald-400" /> Ventas POS ({t.desglose.ventas})
                          </span>
                          <span className="font-mono">{fmt(t.desglose.venta_amount)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-border/50 pt-1.5 mt-1.5">
                        <span className="font-semibold">Total generado</span>
                        <span className="font-mono font-bold text-blue-400">{fmt(t.ingresos_generados)}</span>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </SectionCard>

        </div>
      )}
    </div>
  );
}

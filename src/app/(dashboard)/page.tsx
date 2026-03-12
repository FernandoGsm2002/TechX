"use client";

import React from "react";
import Link from "next/link";
import {
  faTicket, faUsers, faHandHoldingDollar, faArrowTrendUp,
  faTriangleExclamation, faClock, faCircleCheck, faArrowRight,
  faStore, faBagShopping, faBoxesStacked,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TicketStatusBadge } from "@/components/ui-custom/TicketStatusBadge";
import { useTickets } from "@/hooks/useTickets";
import { useClientes } from "@/hooks/useClientes";
import { useInventario } from "@/hooks/useInventario";
import { useFinanzasStats } from "@/hooks/useGastos";
import { useSalesHistory } from "@/hooks/usePOS";
import { useTechnicianStats } from "@/hooks/useTechnicians";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { DeviceDetails } from "@/types/domain";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// Low stock threshold
const LOW_STOCK = 5;

// ── DashCard ──────────────────────────────────────────────────────────────────

function DashCard({
  label, value, icon, color, href,
}: {
  label: string;
  value: string | number;
  icon: IconDefinition;
  color: string;
  href?: string;
}) {
  const textColor = color.split(' ').find(c => c.startsWith('text-')) || 'text-muted-foreground';
  const content = (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1 overflow-hidden transition-all hover:border-primary/50">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <FaIcon icon={icon} size={12} className={`shrink-0 ${textColor}`} />
        <span className="truncate">{label}</span>
      </div>
      <p className="font-bold font-mono text-lg truncate">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { org, role, userId, currencySymbol, formatCurrency } = useOrganization();
  const { data: tickets   = [], isLoading: loadingTickets } = useTickets(undefined, { role, userId });
  const { data: clientes  = [], isLoading: loadingClientes } = useClientes();
  const { data: inventario = [] }                            = useInventario();
  const { data: stats,          isLoading: loadingStats }   = useFinanzasStats();
  const { data: sales = [] }                                 = useSalesHistory({ role, userId });

  const { data: techStats, isLoading: loadingTechStats } = useTechnicianStats(
    role === "tecnico" ? userId : null
  );

  const isAdmin = role === "admin" || role === "superadmin";

  // Activos = en taller (no entregados ni fallidos)
  const activeTickets  = tickets.filter((t) => t.status !== "entregado" && t.status !== "fallido");
  // Listos para entregar = completados (equipo listo pero sin cobrar aún)
  const readyTickets   = tickets.filter((t) => t.status === "completado");
  const lowStock       = (inventario as { quantity: number }[]).filter((i) => i.quantity <= LOW_STOCK);
  const recentTickets  = [...tickets].slice(0, 4);
  const recentSales    = sales.slice(0, 3);

  const fmt = formatCurrency;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Bienvenido 👋</h1>
        <p className="text-sm text-muted-foreground">
          {org?.name} · {format(new Date(), "EEEE dd 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loadingTickets ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : isAdmin ? (
          <>
            <DashCard label="Tickets activos"      value={activeTickets.length}  icon={faTicket}       color="bg-blue-500/20 text-blue-400"      href="/tickets" />
            <DashCard label="Listos para entregar" value={readyTickets.length}   icon={faCircleCheck}  color="bg-emerald-500/20 text-emerald-400" href="/tickets" />
            <DashCard
              label="Ingresos del mes"
              value={loadingStats ? "…" : fmt(stats?.totalIngresos ?? 0)}
              icon={faArrowTrendUp}
              color="bg-amber-500/20 text-amber-400"
              href="/finanzas/ingresos"
            />
            <DashCard
              label="Por Cobrar (Fiados)"
              value={loadingStats ? "…" : fmt(stats?.porCobrar ?? 0)}
              icon={faHandHoldingDollar}
              color="bg-orange-500/20 text-orange-400"
              href="/fiados"
            />
          </>
        ) : (
          <>
            <DashCard label="Tickets activos"      value={activeTickets.length}  icon={faTicket}      color="bg-blue-500/20 text-blue-400"      href="/tickets" />
            <DashCard label="Listos para entregar" value={readyTickets.length}   icon={faCircleCheck} color="bg-emerald-500/20 text-emerald-400" href="/tickets" />
            <DashCard label="Clientes"             value={loadingClientes ? "…" : clientes.length} icon={faUsers} color="bg-purple-500/20 text-purple-400" href="/clientes" />
            <DashCard
              label="Mis ingresos (Mes)"
              value={loadingTechStats ? "…" : fmt((techStats?.monthRevenue ?? 0) + (techStats?.posRevenue ?? 0))}
              icon={faArrowTrendUp}
              color="bg-amber-500/20 text-amber-400"
            />
          </>
        )}
      </div>

      {/* ── Alerts ── */}
      <div className="space-y-2">
        {readyTickets.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <FaIcon icon={faCircleCheck} size={14} className="shrink-0" />
              <span><strong>{readyTickets.length}</strong> ticket{readyTickets.length !== 1 ? "s" : ""} listo{readyTickets.length !== 1 ? "s" : ""} para entregar</span>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
              <Link href="/tickets">Ver <FaIcon icon={faArrowRight} size={12} className="ml-1" /></Link>
            </Button>
          </div>
        )}
        {lowStock.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <FaIcon icon={faTriangleExclamation} size={14} className="shrink-0" />
              <span><strong>{lowStock.length}</strong> producto{lowStock.length !== 1 ? "s" : ""} con stock bajo (≤{LOW_STOCK})</span>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300">
              <Link href="/inventario">Ver <FaIcon icon={faArrowRight} size={12} className="ml-1" /></Link>
            </Button>
          </div>
        )}
      </div>

      {/* ── Two-column row: Recent tickets + Recent POS sales ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent tickets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <FaIcon icon={faTicket} size={13} className="text-muted-foreground" /> Tickets Recientes
            </h2>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href="/tickets">Ver todos</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {loadingTickets
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              : recentTickets.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2 rounded-xl border border-dashed border-border">
                  <FaIcon icon={faTicket} size={28} className="opacity-30" />
                  <p className="text-sm">Sin tickets aún</p>
                </div>
              )
              : recentTickets.map((t) => {
                const d = (t.device_details ?? {}) as DeviceDetails;
                return (
                  <Link
                    key={t.id}
                    href={`/tickets/${t.id}`}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <FaIcon icon={faClock} size={14} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.customers?.full_name ?? t.guest_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{d.brand} {d.model}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TicketStatusBadge status={t.status} />
                      <FaIcon icon={faArrowRight} size={12} className="text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>

        {/* Recent POS sales */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <FaIcon icon={faStore} size={13} className="text-muted-foreground" /> Ventas POS Recientes
            </h2>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href="/pos">Ir al POS</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {recentSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2 rounded-xl border border-dashed border-border">
                <FaIcon icon={faBagShopping} size={28} className="opacity-30" />
                <p className="text-sm">Sin ventas aún</p>
              </div>
            ) : recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-start justify-between rounded-xl border border-border/50 bg-card px-4 py-3 gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 shrink-0 mt-0.5">
                    <FaIcon icon={faStore} size={14} className="text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{sale.customer_name ?? "Venta directa"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {sale.items && sale.items.length > 0
                        ? sale.items
                            .map((it) => `${[it.brand, it.name].filter(Boolean).join(" ")} ×${it.quantity}`)
                            .join(" · ")
                        : sale.notes ?? "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 capitalize mt-0.5">
                      {sale.payment_method} · {formatDistanceToNow(new Date(sale.created_at), { locale: es, addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shrink-0">
                  + {fmt(sale.total_amount)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

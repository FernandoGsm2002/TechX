"use client";

import React, { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  faWrench, faBolt, faStore, faArrowTrendUp, faCircleCheck,
  faClock, faHandHoldingDollar, faTicket, faXmark, faFilter,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { UserAvatar } from "@/components/ui-custom/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useClienteHistory, type ClienteHistoryItem } from "@/hooks/useClienteHistory";
import { useOrganization } from "@/contexts/OrganizationContext";
import { TicketStatusBadge } from "@/components/ui-custom/TicketStatusBadge";
import type { CustomerRow } from "@/hooks/useClientes";

// ── Mini stat ─────────────────────────────────────────────────────────────────

function MiniStat({
  label, value, sub, colorClass,
}: {
  label: string; value: string; sub?: string; colorClass: string;
}) {
  return (
    <div className={`rounded-xl border p-3.5 space-y-0.5 ${colorClass}`}>
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Item type badge ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ClienteHistoryItem["type"] }) {
  if (type === "ticket") return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
      <FaIcon icon={faWrench} size={9} /> Reparación
    </span>
  );
  if (type === "servicio") return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-md">
      <FaIcon icon={faBolt} size={9} /> Servicio
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-md">
      <FaIcon icon={faStore} size={9} /> Venta POS
    </span>
  );
}

function PaymentBadge({ status }: { status: string | null }) {
  if (status === "pagado") return (
    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1">
      <FaIcon icon={faCircleCheck} size={9} /> Pagado
    </Badge>
  );
  if (status === "fiado") return (
    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1">
      <FaIcon icon={faHandHoldingDollar} size={9} /> Fiado
    </Badge>
  );
  if (status === "parcial") return (
    <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/30 gap-1">
      <FaIcon icon={faClock} size={9} /> Parcial
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
      Sin pago
    </Badge>
  );
}

// ── History item card ─────────────────────────────────────────────────────────

function HistoryCard({
  item, fmt,
}: {
  item: ClienteHistoryItem;
  fmt: (n: number) => string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-2.5 hover:border-border transition-colors">
      {/* Row 1: type + date */}
      <div className="flex items-center justify-between gap-2">
        <TypeBadge type={item.type} />
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(item.date), { locale: es, addSuffix: true })}
        </span>
      </div>

      {/* Row 2: description */}
      <div>
        <p className="text-sm font-medium leading-snug line-clamp-2">{item.description}</p>
        {item.type === "ticket" && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.device}</p>
        )}
      </div>

      {/* Row 3: amount + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PaymentBadge status={item.payment_status} />
          {item.type === "ticket" && (
            <TicketStatusBadge status={item.status as never} />
          )}
        </div>
        <span className={`font-mono font-bold text-sm ${item.payment_status === "fiado" ? "text-amber-400" : "text-emerald-400"}`}>
          {fmt(item.amount)}
        </span>
      </div>
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

interface ClienteDetailDrawerProps {
  customer: CustomerRow | null;
  open: boolean;
  onClose: () => void;
}

type FilterType = "all" | "ticket" | "servicio" | "venta";

export function ClienteDetailDrawer({
  customer, open, onClose,
}: ClienteDetailDrawerProps) {
  const { formatCurrency } = useOrganization();
  const { data, isLoading } = useClienteHistory(customer?.id ?? null);
  const [filter, setFilter] = useState<FilterType>("all");
  const fmt = formatCurrency;

  const filtered = filter === "all"
    ? (data?.items ?? [])
    : (data?.items ?? []).filter((i) => i.type === filter);

  const FILTERS: { value: FilterType; label: string }[] = [
    { value: "all",      label: "Todos" },
    { value: "ticket",   label: "Reparaciones" },
    { value: "servicio", label: "Servicios" },
    { value: "venta",    label: "Ventas" },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden"
      >
        {/* Header sticky — con safe area para notch iOS/Android */}
        <div
          className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-5 py-4 shrink-0"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)" }}
        >
          <SheetHeader className="gap-0">
            <SheetTitle asChild>
              <div className="flex items-center gap-3">
                <UserAvatar name={customer?.full_name} email={customer?.email} size="md" shape="circle" />
                <div className="min-w-0">
                  <p className="text-base font-bold truncate">{customer?.full_name ?? "Cliente"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {customer?.phone ?? customer?.email ?? "Sin contacto"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto shrink-0 size-8"
                  onClick={onClose}
                >
                  <FaIcon icon={faXmark} size={14} />
                </Button>
              </div>
            </SheetTitle>
          </SheetHeader>
        </div>

        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.5rem)" }}
        >

          {/* Accounting summary */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat
                  label="Total gastado"
                  value={fmt(data?.totalGastado ?? 0)}
                  sub={`${(data?.totalTickets ?? 0) + (data?.totalServicios ?? 0) + (data?.totalVentas ?? 0)} trabajos`}
                  colorClass="border-primary/30 bg-primary/5 text-primary"
                />
                <MiniStat
                  label="Total pagado"
                  value={fmt(data?.totalPagado ?? 0)}
                  colorClass="border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                />
                <MiniStat
                  label="Pendiente (fiados)"
                  value={fmt(data?.totalPendiente ?? 0)}
                  colorClass={`border-amber-500/30 bg-amber-500/5 ${(data?.totalPendiente ?? 0) > 0 ? "text-amber-400" : "text-muted-foreground"}`}
                />
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border/50 bg-card/60 p-3 items-center">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Tickets</p>
                    <p className="font-bold font-mono text-sm text-blue-400">{data?.totalTickets ?? 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Servicios</p>
                    <p className="font-bold font-mono text-sm text-cyan-400">{data?.totalServicios ?? 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Ventas</p>
                    <p className="font-bold font-mono text-sm text-violet-400">{data?.totalVentas ?? 0}</p>
                  </div>
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Filter tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <FaIcon icon={faFilter} size={11} className="text-muted-foreground" />
                {FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                      filter === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {label}
                    {value !== "all" && (
                      <span className="ml-1 opacity-60">
                        ({value === "ticket" ? data?.totalTickets : value === "servicio" ? data?.totalServicios : data?.totalVentas})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* History list */}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <FaIcon icon={faTicket} size={36} className="opacity-20" />
                  <p className="text-sm">Sin registros en esta categoría</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((item) => (
                    <HistoryCard key={`${item.type}-${item.id}`} item={item} fmt={fmt} />
                  ))}
                </div>
              )}

              {/* Notes */}
              {customer?.notes && (
                <>
                  <Separator className="opacity-50" />
                  <div className="rounded-xl bg-muted/30 border border-border/40 p-3.5">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notas del cliente</p>
                    <p className="text-sm">{customer.notes}</p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

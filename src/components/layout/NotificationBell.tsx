"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  faBell, faBox, faTriangleExclamation, faArrowDown, faArrowUp,
  faChevronRight, faClockRotateLeft, faHandHoldingDollar, faCircleCheck,
  faWrench, faTicket,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLowStockNotifications, useInventoryMovements } from "@/hooks/useInventoryMovements";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useFiados } from "@/hooks/useFiados";
import { useTickets, useTicketsStats } from "@/hooks/useTickets";
import { useOrganization } from "@/contexts/OrganizationContext";

//  Movement icon 

function MovIcon({ type }: { type: string }) {
  const isIn = ["entrada", "ticket_devolucion", "importacion"].includes(type);
  return isIn
    ? <FaIcon icon={faArrowDown} size={11} className="text-emerald-400" />
    : <FaIcon icon={faArrowUp} size={11} className="text-red-400" />;
}

//  Movement label 

const MOV_LABELS: Record<string, string> = {
  entrada:            "Entrada de stock",
  salida:             "Salida de stock",
  ajuste:             "Ajuste manual",
  venta:              "Venta",
  ticket_uso:         "Uso en ticket",
  ticket_devolucion:  "Devolución de ticket",
  importacion:        "Importación",
  auto:               "Cambio de stock",
};

const SOURCE_LABELS: Record<string, string> = {
  ticket:   "Reparación",
  pos:      "Venta POS",
  servicio: "Servicio",
};

//  Main component 

type Tab = "alerts" | "fiados" | "history";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab,  setTab]  = useState<Tab>("alerts");

  const { data: lowStock   = [] } = useLowStockNotifications();
  const { data: movements  = [] } = useInventoryMovements(undefined, 10);
  const { data: fiados     = [] } = useFiados();
  const { formatCurrency, role, userId, org } = useOrganization();
  const { data: readyTicketsResponse } = useTickets("completado", { role: role ?? undefined, userId: userId ?? undefined, page: 0, pageSize: 4 });
  const { data: ticketStats } = useTicketsStats(org?.id, role, userId);
  const { isSupported, isSubscribed, subscribeToPush } = usePushNotifications();

  const readyTickets = readyTicketsResponse?.data ?? [];
  const readyTicketsCount = ticketStats?.completado ?? 0;
  const alertCount   = lowStock.length + fiados.length + readyTicketsCount;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          aria-label="Notificaciones"
        >
          <FaIcon icon={faBell} size={15} />
          {alertCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center",
              "rounded-full bg-amber-500 text-[9px] font-bold text-white animate-pulse"
            )}>
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-1rem)] p-0 border-border/60 shadow-xl rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <FaIcon icon={faBell} size={12} className="text-muted-foreground" />
            <span className="text-xs font-semibold">Notificaciones</span>
          </div>
          {alertCount > 0 && (
            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-semibold">
              {alertCount} alerta{alertCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/40">
          {([
            { id: "alerts",  label: "Alertas",    icon: faTriangleExclamation, count: lowStock.length + readyTicketsCount },
            { id: "fiados",  label: "Por cobrar", icon: faHandHoldingDollar,   count: fiados.length },
            { id: "history", label: "Historial",  icon: faClockRotateLeft,     count: 0 },
          ] as { id: Tab; label: string; icon: typeof faBell; count: number }[]).map(({ id, label, icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 py-2 text-[10px] font-medium transition-colors",
                tab === id
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center justify-center gap-1">
                <FaIcon icon={icon} size={11} />
                {label}
                {count > 0 && (
                  <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1 rounded-full">
                    {count}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {isSupported && !isSubscribed && (
          <div className="bg-primary/10 px-4 py-2 border-b border-primary/20 flex items-center justify-between">
            <span className="text-[10px] text-primary font-medium">Activa alertas en 2do plano</span>
            <Button size="sm" variant="default" className="h-6 text-[10px] px-2" onClick={subscribeToPush}>
              Activar
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="max-h-72 overflow-y-auto">

          {/* ── TAB: Alertas (tickets listos + stock bajo) ── */}
          {tab === "alerts" && (
            readyTicketsCount === 0 && lowStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <FaIcon icon={faCircleCheck} size={28} className="text-emerald-500/30" />
                <p className="text-xs">Todo en orden, sin alertas</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">

                {/* Tickets completados (listos para entregar) */}
                {readyTicketsCount > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-emerald-500/5 border-b border-emerald-500/15">
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1.5">
                        <FaIcon icon={faWrench} size={9} />
                        {readyTicketsCount} ticket{readyTicketsCount !== 1 ? "s" : ""} listo{readyTicketsCount !== 1 ? "s" : ""} para entregar
                      </span>
                    </div>
                    {readyTickets.slice(0, 4).map((t) => {
                      const d = (t.device_details ?? {}) as Record<string, string>;
                      return (
                        <Link
                          key={t.id}
                          href={`/tickets/${t.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                            <FaIcon icon={faTicket} size={12} className="text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {t.customers?.full_name ?? t.guest_name ?? "Cliente sin nombre"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {[d.brand, d.model].filter(Boolean).join(" ") || "Dispositivo"}
                            </p>
                          </div>
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-full shrink-0">
                            Listo
                          </span>
                        </Link>
                      );
                    })}
                  </>
                )}

                {/* Stock bajo */}
                {lowStock.length > 0 && (
                  <>
                    {readyTicketsCount > 0 && (
                      <div className="px-4 py-1.5 bg-amber-500/5 border-b border-amber-500/15">
                        <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1.5">
                          <FaIcon icon={faTriangleExclamation} size={9} />
                          {lowStock.length} producto{lowStock.length !== 1 ? "s" : ""} con stock bajo
                        </span>
                      </div>
                    )}
                    {lowStock.slice(0, 5).map((item) => (
                      <Link
                        key={item.id}
                        href="/inventario"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="size-8 shrink-0 rounded-lg overflow-hidden border border-border/40 bg-muted/30">
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FaIcon icon={faBox} size={12} className="text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {[item.brand, item.name].filter(Boolean).join(" ")}
                          </p>
                          <p className={cn(
                            "text-[10px] font-mono font-semibold",
                            item.quantity === 0 ? "text-red-400" : "text-amber-400"
                          )}>
                            {item.quantity === 0 ? "Sin stock" : `${item.quantity} restantes`}
                            <span className="text-muted-foreground font-normal ml-1">
                              (mín. {item.min_stock})
                            </span>
                          </p>
                        </div>
                        <FaIcon icon={faTriangleExclamation} size={12} className={cn(
                          "shrink-0",
                          item.quantity === 0 ? "text-red-400" : "text-amber-400"
                        )} />
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )
          )}

          {/*  TAB: Fiados / Por cobrar  */}
          {tab === "fiados" && (
            fiados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <FaIcon icon={faCircleCheck} size={28} className="opacity-20" />
                <p className="text-xs">Sin cuentas por cobrar</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {fiados.map((f) => (
                  <Link
                    key={`${f.source}-${f.id}`}
                    href="/fiados"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <FaIcon icon={faHandHoldingDollar} size={13} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{f.description}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {SOURCE_LABELS[f.source] ?? f.source} · {f.detail}
                      </p>
                    </div>
                    <span className="text-xs font-bold font-mono text-amber-400 shrink-0">
                      {formatCurrency(f.amount)}
                    </span>
                  </Link>
                ))}
              </div>
            )
          )}

          {/*  TAB: Historial  */}
          {tab === "history" && (
            movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <FaIcon icon={faClockRotateLeft} size={28} className="opacity-20" />
                <p className="text-xs">Sin movimientos recientes</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {movements.map((m) => {
                  const isIn = m.quantity_delta > 0;
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                        isIn ? "bg-emerald-500/10" : "bg-red-500/10"
                      )}>
                        <MovIcon type={m.movement_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {m.inventory
                            ? [m.inventory.brand, m.inventory.name].filter(Boolean).join(" ")
                            : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {MOV_LABELS[m.movement_type] ?? m.movement_type} ·{" "}
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs font-bold font-mono shrink-0",
                        isIn ? "text-emerald-400" : "text-red-400"
                      )}>
                        {isIn ? "+" : ""}{m.quantity_delta}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 px-4 py-2.5 bg-muted/20">
          <Link
            href={tab === "fiados" ? "/fiados" : "/inventario"}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {tab === "fiados" ? "Ver todas las cuentas por cobrar" : "Ver inventario completo"}
            <FaIcon icon={faChevronRight} size={10} className="ml-0.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

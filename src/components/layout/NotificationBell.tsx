"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bell, Package, AlertTriangle, ArrowDown, ArrowUp, ChevronRight, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLowStockNotifications, useInventoryMovements } from "@/hooks/useInventoryMovements";

// ── Movement icon ─────────────────────────────────────────────────────────────

function MovIcon({ type }: { type: string }) {
  const isIn = ["entrada", "ticket_devolucion", "importacion"].includes(type);
  return isIn
    ? <ArrowDown className="size-3 text-emerald-400" />
    : <ArrowUp className="size-3 text-red-400" />;
}

// ── Movement label ────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab,  setTab]  = useState<"alerts" | "history">("alerts");

  const { data: lowStock = []   } = useLowStockNotifications();
  const { data: movements = []  } = useInventoryMovements(undefined, 10);

  const badgeCount = lowStock.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          aria-label="Notificaciones"
        >
          <Bell className="size-4" />
          {badgeCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center",
              "rounded-full bg-amber-500 text-[9px] font-bold text-white animate-pulse"
            )}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 border-border/60 shadow-xl rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">Notificaciones</span>
          </div>
          {badgeCount > 0 && (
            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-semibold">
              {badgeCount} alerta{badgeCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/40">
          {(["alerts", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 text-xs font-medium transition-colors",
                tab === t
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "alerts" ? (
                <span className="flex items-center justify-center gap-1.5">
                  <AlertTriangle className="size-3" />
                  Stock bajo
                  {badgeCount > 0 && (
                    <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1 rounded-full">
                      {badgeCount}
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <History className="size-3" /> Historial
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-72 overflow-y-auto">

          {/* ── TAB: Stock bajo ── */}
          {tab === "alerts" && (
            lowStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <Package className="size-8 opacity-20" />
                <p className="text-xs">Sin alertas de stock bajo</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {lowStock.map((item) => (
                  <Link
                    key={item.id}
                    href="/inventario"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="size-8 shrink-0 rounded-lg overflow-hidden border border-border/40 bg-muted/30">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="size-3.5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
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

                    <AlertTriangle className={cn(
                      "size-3.5 shrink-0",
                      item.quantity === 0 ? "text-red-400" : "text-amber-400"
                    )} />
                  </Link>
                ))}
              </div>
            )
          )}

          {/* ── TAB: Historial ── */}
          {tab === "history" && (
            movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <History className="size-8 opacity-20" />
                <p className="text-xs">Sin movimientos recientes</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {movements.map((m) => {
                  const isIn = m.quantity_delta > 0;
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                      {/* Arrow icon */}
                      <div className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                        isIn ? "bg-emerald-500/10" : "bg-red-500/10"
                      )}>
                        <MovIcon type={m.movement_type} />
                      </div>

                      {/* Info */}
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

                      {/* Delta */}
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
            href="/inventario"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver inventario completo <ChevronRight className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

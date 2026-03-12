"use client";

/**
 * InventoryMovementsDrawer
 * Panel lateral (Sheet) que muestra el historial de movimientos
 * de un ítem específico o del inventario completo.
 */

import React from "react";
import { History, ArrowDown, ArrowUp, Package, X } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useInventoryMovements } from "@/hooks/useInventoryMovements";

// ── Labels & Colors ───────────────────────────────────────────────────────────

const MOV_META: Record<string, { label: string; color: string; bg: string }> = {
  entrada:           { label: "Entrada",          color: "text-emerald-400", bg: "bg-emerald-500/10" },
  salida:            { label: "Salida",            color: "text-red-400",     bg: "bg-red-500/10"     },
  ajuste:            { label: "Ajuste",            color: "text-blue-400",    bg: "bg-blue-500/10"    },
  venta:             { label: "Venta",             color: "text-violet-400",  bg: "bg-violet-500/10"  },
  ticket_uso:        { label: "Uso en ticket",     color: "text-amber-400",   bg: "bg-amber-500/10"   },
  ticket_devolucion: { label: "Devolución",        color: "text-emerald-400", bg: "bg-emerald-500/10" },
  importacion:       { label: "Importación",       color: "text-blue-400",    bg: "bg-blue-500/10"    },
  auto:              { label: "Cambio de stock",   color: "text-muted-foreground", bg: "bg-muted/30"  },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  inventoryId?: string;
  itemName?:    string;
}

export function InventoryMovementsDrawer({ open, onOpenChange, inventoryId, itemName }: Props) {
  const { data: movements = [], isLoading } = useInventoryMovements(inventoryId, 50);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 py-4 border-b border-border/50 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <History className="size-4 text-primary" />
            Historial de movimientos
            {itemName && (
              <span className="text-muted-foreground font-normal">· {itemName}</span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <History className="size-10 opacity-20" />
              <p className="text-sm">Sin movimientos registrados</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {movements.map((m) => {
                const isIn = m.quantity_delta > 0;
                const meta = MOV_META[m.movement_type] ?? MOV_META.auto;

                return (
                  <div key={m.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    {/* Arrow icon */}
                    <div className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-xl mt-0.5",
                      isIn ? "bg-emerald-500/10" : "bg-red-500/10"
                    )}>
                      {isIn
                        ? <ArrowDown className="size-4 text-emerald-400" />
                        : <ArrowUp className="size-4 text-red-400" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Item name (only in global view) */}
                      {!inventoryId && m.inventory && (
                        <p className="text-xs font-semibold truncate">
                          {[m.inventory.brand, m.inventory.name].filter(Boolean).join(" ")}
                        </p>
                      )}

                      {/* Type badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 border-0", meta.color, meta.bg)}
                        >
                          {meta.label}
                        </Badge>
                        {m.reference_type && m.reference_type !== "auto" && (
                          <span className="text-[10px] text-muted-foreground/70 border border-border/40 px-1.5 py-0.5 rounded capitalize">
                            {m.reference_type}
                          </span>
                        )}
                      </div>

                      {/* Stock flow */}
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{m.quantity_before}</span>
                        <span>→</span>
                        <span className="font-mono font-semibold text-foreground">{m.quantity_after}</span>
                        <span>uds.</span>
                      </div>

                      {/* Notes */}
                      {m.notes && (
                        <p className="text-[10px] text-muted-foreground/70 italic truncate">{m.notes}</p>
                      )}

                      {/* Date */}
                      <p className="text-[10px] text-muted-foreground/50">
                        {format(new Date(m.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                        {" · "}
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>

                    {/* Delta badge */}
                    <span className={cn(
                      "text-sm font-bold font-mono shrink-0 mt-0.5",
                      isIn ? "text-emerald-400" : "text-red-400"
                    )}>
                      {isIn ? "+" : ""}{m.quantity_delta}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/40 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <span>{movements.length} movimiento{movements.length !== 1 ? "s" : ""}</span>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="size-3.5 mr-1" /> Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

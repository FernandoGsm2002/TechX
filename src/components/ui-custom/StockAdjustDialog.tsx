"use client";

/**
 * StockAdjustDialog
 * Permite seleccionar múltiples ítems de inventario y ajustar su stock
 * en un solo paso (aumentar o disminuir X unidades en cada ítem).
 *
 * Modos de ajuste:
 *  - individual: cada ítem tiene su propio delta
 *  - batch: aplica el mismo delta a todos los seleccionados
 */

import React, { useState, useMemo, useCallback } from "react";
import { Search, Minus, Plus, Package, Loader2, CheckCircle2, ArrowUpDown, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useInventario, type InventoryRow } from "@/hooks/useInventario";
import { useOrganization } from "@/contexts/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ItemDelta {
  item: InventoryRow;
  delta: number;
}

type AdjustMode = "add" | "subtract" | "set";

const MODE_CONFIG: Record<AdjustMode, { label: string; color: string; sign: number | null }> = {
  add:      { label: "+ Sumar",   color: "text-emerald-400 border-emerald-500/50 bg-emerald-500/10", sign: +1 },
  subtract: { label: "− Restar",  color: "text-red-400 border-red-500/50 bg-red-500/10",             sign: -1 },
  set:      { label: "= Fijar",   color: "text-blue-400 border-blue-500/50 bg-blue-500/10",           sign: null },
};

// ── Individual Item Row ───────────────────────────────────────────────────────

function ItemRow({
  item,
  selected,
  delta,
  mode,
  onToggle,
  onDelta,
}: {
  item:     InventoryRow;
  selected: boolean;
  delta:    number;
  mode:     AdjustMode;
  onToggle: () => void;
  onDelta:  (d: number) => void;
}) {
  const newQty = mode === "set"
    ? Math.max(0, delta)
    : Math.max(0, item.quantity + (MODE_CONFIG[mode].sign! * delta));

  const diff = newQty - item.quantity;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all cursor-pointer",
        selected
          ? "border-primary/50 bg-primary/5"
          : "border-border/40 bg-card/30 hover:border-border/70"
      )}
      onClick={onToggle}
    >
      {/* Checkbox visual */}
      <div className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-all",
        selected ? "bg-primary border-primary" : "border-border/60"
      )}>
        {selected && <CheckCircle2 className="size-3 text-primary-foreground" />}
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {[item.brand, item.name].filter(Boolean).join(" ")}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {item.model && <span>{item.model}</span>}
          {item.category && (
            <span className="bg-primary/10 text-primary/70 px-1 rounded">{item.category}</span>
          )}
        </div>
      </div>

      {/* Stock actual */}
      <div className="text-center shrink-0 w-12">
        <p className={cn(
          "text-sm font-bold font-mono",
          item.quantity <= 3 ? "text-red-400" : item.quantity <= 5 ? "text-amber-400" : ""
        )}>
          {item.quantity}
        </p>
        <p className="text-[10px] text-muted-foreground">actual</p>
      </div>

      {/* Arrow + New qty */}
      {selected && (
        <>
          <div className="text-muted-foreground/40 shrink-0">→</div>
          <div className="text-center shrink-0 w-12">
            <p className={cn(
              "text-sm font-bold font-mono",
              diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-muted-foreground"
            )}>
              {newQty}
            </p>
            {diff !== 0 && (
              <p className={cn(
                "text-[10px] font-mono",
                diff > 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {diff > 0 ? `+${diff}` : diff}
              </p>
            )}
          </div>
        </>
      )}

      {/* Per-item delta stepper (only in individual mode or when selected) */}
      {selected && (
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onDelta(Math.max(mode === "set" ? 0 : 1, delta - 1))}
            className="flex size-6 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <Minus className="size-3" />
          </button>
          <input
            type="number"
            min={mode === "set" ? 0 : 1}
            value={delta}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onDelta(isNaN(v) ? 0 : Math.max(0, v));
            }}
            className="w-10 text-center text-sm font-bold font-mono bg-transparent border border-border/50 rounded-md py-0.5 focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => onDelta(delta + 1)}
            className="flex size-6 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <Plus className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

interface StockAdjustDialogProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
}

export function StockAdjustDialog({ open, onOpenChange }: StockAdjustDialogProps) {
  const { org } = useOrganization();
  const { data: allItems = [], isLoading } = useInventario();
  const qc = useQueryClient();

  const [search,   setSearch]   = useState("");
  const [mode,     setMode]     = useState<AdjustMode>("add");
  const [deltas,   setDeltas]   = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchVal, setBatchVal] = useState(1);
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  // Filter items
  const filtered = useMemo(() => {
    if (!search.trim()) return allItems as InventoryRow[];
    const q = search.toLowerCase();
    return (allItems as InventoryRow[]).filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.brand ?? "").toLowerCase().includes(q) ||
      (i.model ?? "").toLowerCase().includes(q) ||
      (i.sku ?? "").toLowerCase().includes(q) ||
      (i.category ?? "").toLowerCase().includes(q)
    );
  }, [allItems, search]);

  const selectedItems = (allItems as InventoryRow[]).filter((i) => selected.has(i.id));

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setDeltas((d) => { const n = { ...d }; delete n[id]; return n; });
      } else {
        next.add(id);
        setDeltas((d) => ({ ...d, [id]: batchVal }));
      }
      return next;
    });
  }, [batchVal]);

  // Apply batch value to all selected
  const applyBatch = () => {
    const next: Record<string, number> = {};
    selected.forEach((id) => { next[id] = batchVal; });
    setDeltas(next);
  };

  const reset = () => {
    setSearch(""); setMode("add"); setDeltas({});
    setSelected(new Set()); setBatchVal(1); setDone(false);
  };

  const handleSave = async () => {
    if (!org?.id || selected.size === 0) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const adjustments = [...selected].map((id) => {
        const delta = deltas[id] ?? batchVal;
        const sign  = MODE_CONFIG[mode].sign;
        const finalDelta = mode === "set"
          ? -(((allItems as InventoryRow[]).find(i => i.id === id)?.quantity ?? 0) - delta)
          : (sign! * delta);
        return { item_id: id, delta: finalDelta };
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("bulk_adjust_stock", {
        p_organization_id: org.id,
        p_adjustments:     adjustments,
      });

      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["inventario"] });
      toast.success(`Stock actualizado en ${selected.size} ítem${selected.size !== 1 ? "s" : ""}`);
      setDone(true);
    } catch (err) {
      toast.error("Error al ajustar stock: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const n = selected.size;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-border/50 shrink-0 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/15">
              <ArrowUpDown className="size-5 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Ajuste masivo de stock</DialogTitle>
              <DialogDescription className="text-xs">
                Selecciona ítems y ajusta su cantidad en un solo paso
              </DialogDescription>
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex gap-2">
            {(Object.entries(MODE_CONFIG) as [AdjustMode, typeof MODE_CONFIG[AdjustMode]][]).map(([key, m]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex-1",
                  mode === key ? m.color : "border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Batch value + apply */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground shrink-0">
              {mode === "set" ? "Fijar cantidad a:" : `${mode === "add" ? "Sumar" : "Restar"} a todos:`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setBatchVal(Math.max(0, batchVal - 1))}
                className="flex size-7 items-center justify-center rounded-lg border border-border/50 hover:border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <Minus className="size-3" />
              </button>
              <input
                type="number"
                min={0}
                value={batchVal}
                onChange={(e) => setBatchVal(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-14 text-center text-sm font-bold font-mono bg-transparent border border-border/50 rounded-lg py-1 focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => setBatchVal(batchVal + 1)}
                className="flex size-7 items-center justify-center rounded-lg border border-border/50 hover:border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="size-3" />
              </button>
            </div>
            {n > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={applyBatch}>
                Aplicar a {n} seleccionado{n !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        </div>

        {/* ── Search ── */}
        <div className="px-6 pt-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-xs"
              placeholder="Buscar ítem por nombre, marca, modelo, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {n > 0 && (
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs text-primary font-medium">
                {n} ítem{n !== 1 ? "s" : ""} seleccionado{n !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => { setSelected(new Set()); setDeltas({}); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
              >
                <X className="size-3" /> Limpiar selección
              </button>
            </div>
          )}
        </div>

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1.5">
          {isLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <Package className="size-8 opacity-30" />
              <p className="text-sm">{search ? "Sin resultados" : "Sin ítems en inventario"}</p>
            </div>
          ) : (
            filtered.map((item) => (
              <ItemRow
                key={item.id}
                item={item as InventoryRow}
                selected={selected.has(item.id)}
                delta={deltas[item.id] ?? batchVal}
                mode={mode}
                onToggle={() => toggle(item.id)}
                onDelta={(d) => setDeltas((prev) => ({ ...prev, [item.id]: d }))}
              />
            ))
          )}
        </div>

        {/* ── Preview bar ── */}
        {n > 0 && !done && (
          <div className="px-6 py-3 border-t border-border/40 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Info className="size-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">
                Se {mode === "add" ? "sumará" : mode === "subtract" ? "restará" : "fijará"} el stock en:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedItems.map((item) => {
                  const delta = deltas[item.id] ?? batchVal;
                  const sign  = MODE_CONFIG[mode].sign;
                  const newQ  = mode === "set"
                    ? Math.max(0, delta)
                    : Math.max(0, item.quantity + sign! * delta);
                  const diff  = newQ - item.quantity;
                  return (
                    <span key={item.id} className="text-[10px] border border-border/40 rounded-full px-2 py-0.5 font-mono">
                      {item.name.slice(0, 12)}…
                      <span className={cn("ml-1 font-bold", diff >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {diff >= 0 ? `+${diff}` : diff}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Done state */}
        {done && (
          <div className="px-6 py-4 border-t border-border/40 shrink-0 flex items-center justify-between gap-3 bg-emerald-500/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">
                ¡Stock actualizado correctamente!
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset}>Otro ajuste</Button>
              <Button size="sm" onClick={() => { reset(); onOpenChange(false); }}>Finalizar</Button>
            </div>
          </div>
        )}

        {/* ── Footer actions ── */}
        {!done && (
          <div className="px-6 pb-5 pt-3 border-t border-border/40 flex items-center justify-between shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => { reset(); onOpenChange(false); }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={n === 0 || saving}
              className="gap-2 min-w-[140px]"
            >
              {saving
                ? <><Loader2 className="size-4 animate-spin" /> Aplicando...</>
                : <><ArrowUpDown className="size-4" /> Aplicar a {n} ítem{n !== 1 ? "s" : ""}</>
              }
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

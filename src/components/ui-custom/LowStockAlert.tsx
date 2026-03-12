"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X, ChevronRight, ShoppingCart, Wrench, Package } from "lucide-react";
import { useLowStock, type LowStockItem } from "@/hooks/usePOS";
import { Button } from "@/components/ui/button";

// ── Helpers ───────────────────────────────────────────────────────────────────

type Section = {
  tab:   string;
  label: string;
  icon:  React.ElementType;
  items: LowStockItem[];
};

function getSection(item_type: string): Omit<Section, "items"> {
  switch (item_type) {
    case "repuesto_propio":
      return { tab: "rep_propios", label: "Rep. Propios", icon: Wrench };
    case "repuesto_comprado":
      return { tab: "repuestos",   label: "Repuestos",    icon: Package };
    default:
      return { tab: "productos",   label: "Productos",    icon: ShoppingCart };
  }
}

const ITEM_TYPE_ORDER = ["producto", "repuesto_propio", "repuesto_comprado"];

// ── Component ─────────────────────────────────────────────────────────────────

export function LowStockAlert() {
  const { data: items = [] } = useLowStock();
  const [dismissed, setDismissed] = useState(false);

  if (items.length === 0 || dismissed) return null;

  // Group by item_type so each section shows its own link
  const groups = ITEM_TYPE_ORDER
    .map((type) => {
      const sectionItems = items.filter((i) => i.item_type === type);
      if (sectionItems.length === 0) return null;
      return { ...getSection(type), items: sectionItems } as Section;
    })
    .filter(Boolean) as Section[];

  const totalCount = items.length;

  return (
    <div className="relative rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex gap-3 items-start mb-4 animate-in fade-in slide-in-from-top-2 duration-300">

      {/* Icon */}
      <div className="size-8 flex items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
        <AlertTriangle className="size-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2.5">
        <p className="text-sm font-semibold text-amber-400">
          {totalCount} ítem{totalCount > 1 ? "s" : ""} con stock bajo (≤ 5)
        </p>

        {/* One group per section */}
        {groups.map((group) => {
          const shown  = group.items.slice(0, 4);
          const extras = group.items.length - shown.length;
          const Icon   = group.icon;

          return (
            <div key={group.tab} className="space-y-1.5">
              {/* Section label */}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400/70 uppercase tracking-wide">
                <Icon className="size-3 shrink-0" />
                <span>{group.label}</span>
              </div>

              {/* Item chips */}
              <div className="flex flex-wrap gap-1.5">
                {shown.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-400/90 border border-amber-500/20 rounded-md px-2 py-0.5"
                  >
                    <span className="truncate max-w-[140px]">
                      {[item.brand, item.name].filter(Boolean).join(" ")}
                    </span>
                    <span className="font-bold ml-0.5">×{item.quantity}</span>
                  </span>
                ))}
                {extras > 0 && (
                  <span className="text-[11px] text-muted-foreground self-center">
                    +{extras} más
                  </span>
                )}

                {/* Link to the exact inventory section */}
                <Link
                  href={`/inventario?tab=${group.tab}`}
                  className="inline-flex items-center gap-0.5 text-[11px] text-amber-400 hover:underline self-center ml-1"
                >
                  Ver <ChevronRight className="size-2.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dismiss */}
      <Button
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}

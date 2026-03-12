"use client";

import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useServicioHistory } from "@/hooks/useServicioHistory";
import { cn } from "@/lib/utils";

// ── Status labels (shared) ────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendiente:  { label: "Pendiente",           color: "bg-amber-500" },
  en_proceso: { label: "En Proceso",          color: "bg-blue-500" },
  completado: { label: "Listo para entregar", color: "bg-emerald-500" },
  entregado:  { label: "Entregado",           color: "bg-violet-500" },
  fallido:    { label: "Fallido",             color: "bg-red-500" },
  cancelado:  { label: "Cancelado",           color: "bg-gray-500" },
  // ticket aliases
  recibido:   { label: "Recibido",            color: "bg-slate-500" },
};

function getStatus(key: string | null) {
  if (!key) return { label: "—", color: "bg-muted" };
  return STATUS_LABELS[key] ?? { label: key, color: "bg-muted" };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ServicioHistoryTimelineProps {
  servicioId: string;
}

export function ServicioHistoryTimeline({ servicioId }: ServicioHistoryTimelineProps) {
  const { data: history = [], isLoading } = useServicioHistory(servicioId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-3 rounded-full mt-1 shrink-0" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Sin cambios de estado registrados aún.
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Línea vertical */}
      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/60" />

      {history.map((entry, i) => {
        const toStatus   = getStatus(entry.status_to);
        const isLast     = i === history.length - 1;

        return (
          <div key={entry.id} className="relative flex gap-3 pb-4">
            {/* Dot */}
            <div
              className={cn(
                "relative z-10 mt-1 size-2.5 rounded-full shrink-0 ring-2 ring-background",
                toStatus.color
              )}
            />

            {/* Content */}
            <div className={cn("flex-1 min-w-0", !isLast && "")}>
              {/* Status arrow */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {entry.status_from && (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {getStatus(entry.status_from).label}
                    </span>
                    <span className="text-muted-foreground/40 text-xs">→</span>
                  </>
                )}
                <span className="text-xs font-semibold text-foreground">
                  {toStatus.label}
                </span>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="size-2.5" />
                  {format(new Date(entry.created_at), "dd MMM, HH:mm", { locale: es })}
                </span>
                {entry.changer_name && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <User className="size-2.5" />
                    {entry.changer_name}
                  </span>
                )}
              </div>

              {/* Notes */}
              {entry.notes && (
                <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                  &ldquo;{entry.notes}&rdquo;
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

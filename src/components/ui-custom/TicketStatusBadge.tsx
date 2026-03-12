"use client";

import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

// ── Config ─────────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string }> = {
  recibido: {
    label: "Recibido",
    className: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  },
  en_proceso: {
    label: "En Proceso",
    className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  fallido: {
    label: "Fallido",
    className: "bg-red-500/20 text-red-300 border-red-500/30",
  },
  completado: {
    label: "Listo para entregar",
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  entregado: {
    label: "Entregado",
    className: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
};

/**
 * Estados terminales — una vez en estos estados no se puede cambiar a otro.
 * - fallido:   reparación no se pudo hacer / rechazada
 * - entregado: listo, cobrado y en manos del cliente
 */
export const TERMINAL_STATUSES: TicketStatus[] = ["fallido", "entregado"];

/**
 * Transiciones permitidas.
 * - recibido   → en_proceso | fallido | completado
 * - en_proceso → recibido   | fallido | completado
 * - completado → entregado   (abre diálogo de cobro + garantía)
 * - fallido    → (terminal)
 * - entregado  → (terminal)
 */
export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  recibido:   ["en_proceso", "completado", "fallido"],
  en_proceso: ["recibido",   "completado", "fallido"],
  fallido:    [],
  completado: ["entregado"],
  entregado:  [],
};

// ── Component ─────────────────────────────────────────────────────────────────

interface TicketStatusBadgeProps {
  status: TicketStatus | string;
  className?: string;
}

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const config =
    STATUS_CONFIG[status as TicketStatus] ?? { label: status, className: "" };
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium border", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

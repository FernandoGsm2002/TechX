import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

import { toast } from "sonner";

/**
 * useRealtimeTickets
 * Suscribe a cambios en la tabla `tickets` vía Supabase Realtime.
 * Muestra notificaciones locales cuando otros usuarios realizan acciones.
 */
export function useRealtimeTickets(orgId: string | undefined, userId: string | null = null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`realtime-tickets-${orgId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "tickets",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["tickets"] });
          if (payload.eventType === "UPDATE" && payload.new?.id) {
            qc.invalidateQueries({ queryKey: ["tickets", payload.new.id] });
          }
          qc.invalidateQueries({ queryKey: ["finanzas-stats"] });

          // Show foreground notification if made by another user
          const newRow = payload.new as any;
          if (newRow && (!newRow.created_by || newRow.created_by !== userId)) {
            if (payload.eventType === "INSERT") {
              toast.info(`Nuevo ticket recibido`, { description: `Estado: ${newRow.status}` });
            } else if (payload.eventType === "UPDATE") {
              // Ensure we don't spam toasts on every update unless status or amount changed
              const oldRow = payload.old as any;
              if (oldRow && oldRow.status !== newRow.status) {
                toast.info(`Ticket actualizado`, { description: `Nuevo estado: ${newRow.status}` });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, userId, qc]);
}

/**
 * useRealtimeOtrosServicios
 * Igual que useRealtimeTickets pero para otros_servicios.
 */
export function useRealtimeOtrosServicios(orgId: string | undefined, userId: string | null = null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`realtime-servicios-${orgId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "otros_servicios",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["otros_servicios"] });
          if (payload.eventType === "UPDATE" && payload.new?.id) {
            qc.invalidateQueries({ queryKey: ["otros_servicios", payload.new.id] });
          }
          qc.invalidateQueries({ queryKey: ["finanzas-stats"] });

          const newRow = payload.new as any;
          if (newRow && (!newRow.created_by || newRow.created_by !== userId)) {
            if (payload.eventType === "INSERT") {
              toast.info(`Nuevo servicio asignado`, { description: `ID: ${newRow.id.slice(0, 6)}` });
            } else if (payload.eventType === "UPDATE") {
              const oldRow = payload.old as any;
              if (oldRow && oldRow.status !== newRow.status) {
                toast.info(`Servicio actualizado`, { description: `Nuevo estado: ${newRow.status}` });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, userId, qc]);
}

/**
 * useRealtimeInventory
 * Para alertas de stock bajo en tiempo real.
 */
export function useRealtimeInventory(orgId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`realtime-inventory-${orgId}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "inventory",
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["inventario"] });
          qc.invalidateQueries({ queryKey: ["low-stock-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);
}

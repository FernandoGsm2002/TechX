import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * useRealtimeTickets
 * Suscribe a cambios en la tabla `tickets` vía Supabase Realtime.
 * Cuando un técnico cambia el estado de un ticket, el dashboard/lista
 * se actualiza automáticamente sin necesidad de refrescar.
 */
export function useRealtimeTickets(orgId: string | undefined) {
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
          // Invalidar queries relevantes cuando haya cualquier cambio
          qc.invalidateQueries({ queryKey: ["tickets"] });
          // Si es actualización de un ticket específico, invalidar ese también
          if (payload.eventType === "UPDATE" && payload.new?.id) {
            qc.invalidateQueries({ queryKey: ["tickets", payload.new.id] });
          }
          // Actualizar stats del dashboard
          qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);
}

/**
 * useRealtimeOtrosServicios
 * Igual que useRealtimeTickets pero para otros_servicios.
 */
export function useRealtimeOtrosServicios(orgId: string | undefined) {
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);
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

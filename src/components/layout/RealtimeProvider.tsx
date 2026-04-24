"use client";

/**
 * RealtimeProvider
 * Client component que activa las suscripciones de Supabase Realtime
 * para toda la sesión del dashboard. Al montar, empieza a escuchar
 * cambios en tickets, otros_servicios e inventario.
 */

import { useOrganization } from "@/contexts/OrganizationContext";
import { useRealtimeTickets, useRealtimeOtrosServicios, useRealtimeInventory, useRealtimeSales, useRealtimeCollectionTasks } from "@/hooks/useRealtime";

export function RealtimeProvider() {
  const { org, userId } = useOrganization();
  const orgId = org?.id;

  // Suscripciones en tiempo real — sin render visual propio
  useRealtimeTickets(orgId, userId);
  useRealtimeOtrosServicios(orgId, userId);
  useRealtimeInventory(orgId);
  useRealtimeSales(orgId);
  useRealtimeCollectionTasks(orgId);

  return null; // Invisible — solo efectos
}

"use client";

/**
 * RealtimeProvider
 * Client component que activa las suscripciones de Supabase Realtime
 * para toda la sesión del dashboard. Al montar, empieza a escuchar
 * cambios en tickets, otros_servicios e inventario.
 */

import { useOrganization } from "@/contexts/OrganizationContext";
import { useRealtimeTickets, useRealtimeOtrosServicios, useRealtimeInventory } from "@/hooks/useRealtime";

export function RealtimeProvider() {
  const { org } = useOrganization();
  const orgId = org?.id;

  // Suscripciones en tiempo real — sin render visual propio
  useRealtimeTickets(orgId);
  useRealtimeOtrosServicios(orgId);
  useRealtimeInventory(orgId);

  return null; // Invisible — solo efectos
}

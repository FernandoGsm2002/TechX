"use client";

import { useDeudaNotifications } from "@/hooks/useDeudaNotifications";

/**
 * Componente invisible que activa el ciclo de notificaciones
 * de deudas pendientes cada 6 horas.
 * Se monta en el dashboard layout junto a RealtimeProvider.
 */
export function DeudaNotificationsWatcher() {
  useDeudaNotifications();
  return null;
}

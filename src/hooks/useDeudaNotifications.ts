"use client";

import { useEffect, useRef } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas

/**
 * Hook que llama al endpoint /api/deuda-reminder cada 6 horas.
 * El servidor controla el throttling via last_deuda_notif_at en la DB,
 * por lo que múltiples tabs/sesiones no disparan notificaciones duplicadas.
 */
export function useDeudaNotifications() {
  const { org } = useOrganization();
  const orgIdRef = useRef(org?.id);
  orgIdRef.current = org?.id;

  useEffect(() => {
    if (!org?.id) return;

    async function checkDebts() {
      if (!orgIdRef.current) return;
      try {
        await fetch("/api/deuda-reminder", { method: "POST" });
      } catch {
        // Silently ignore network errors — will retry on next interval
      }
    }

    // Run immediately on mount, then every 6h
    checkDebts();
    const intervalId = setInterval(checkDebts, INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [org?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

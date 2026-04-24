/**
 * Configuración centralizada de React Query para TechX.
 * Usar estas constantes garantiza consistencia de staleTime en todos los hooks.
 *
 * Guía de uso:
 *  - REALTIME   → datos que cambian en tiempo real (tickets activos, notificaciones)
 *  - SHORT      → datos que cambian con acciones del usuario (clientes, gastos)
 *  - MEDIUM     → la mayoría de los queries del dashboard
 *  - LONG       → reportes, agregaciones financieras
 *  - MASTER     → datos maestros que casi no cambian (marcas, modelos, tags, config)
 */
export const STALE_TIME = {
  /** 0s — siempre refetch. Para datos críticos en tiempo real. */
  REALTIME: 0,
  /** 15s — para listas que el usuario modifica frecuentemente. */
  SHORT: 15_000,
  /** 60s — para la mayoría de queries del dashboard (tickets, clientes, inventario). */
  MEDIUM: 60_000,
  /** 5 min — para reportes y agregaciones que no cambian en mid-sesión. */
  LONG: 5 * 60_000,
  /** 30 min — para datos maestros: marcas, modelos, tags, catálogo, config de org. */
  MASTER: 30 * 60_000,
} as const;

/**
 * Intervalo de refetch para queries que necesitan polling activo.
 * Usar con `refetchInterval` en `useQuery`.
 */
export const REFETCH_INTERVAL = {
  /** 30s — dashboard KPIs, stock bajo */
  FAST: 30_000,
  /** 2 min — datos semi-frecuentes */
  NORMAL: 2 * 60_000,
  /** 6 hrs — deuda notifications, limpieza de suscripciones */
  SLOW: 6 * 60 * 60_000,
} as const;

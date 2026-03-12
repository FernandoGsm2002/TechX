// ── database.types.ts (partial helpers) ─────────────────────────────────────
// Centralized type helpers that map the real DB columns to cleaner interfaces

export type TicketStatus = "recibido" | "en_proceso" | "fallido" | "completado" | "entregado";

export type InventoryCondition = "nuevo" | "usado" | "desguace";
export type PlanType = "3_meses" | "6_meses" | "1_anio";

/** device_details JSON shape stored in tickets.device_details */
export interface DeviceDetails {
  brand?: string;
  model?: string;
  type?: string;
  imei?: string;
  color?: string;
  [key: string]: unknown;
}

/**
 * useInventoryMovements
 * Historial de movimientos de inventario y alertas de stock bajo.
 */
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createClient() as any;

// ── Types ──────────────────────────────────────────────────────────────────────

export type MovementType =
  | "entrada"
  | "salida"
  | "ajuste"
  | "venta"
  | "ticket_uso"
  | "ticket_devolucion"
  | "importacion"
  | "auto";

export interface InventoryMovement {
  id:              string;
  organization_id: string;
  inventory_id:    string;
  movement_type:   MovementType;
  quantity_delta:  number;
  quantity_before: number;
  quantity_after:  number;
  reference_id:    string | null;
  reference_type:  string | null;
  notes:           string | null;
  performed_by:    string | null;
  created_at:      string;
  // joined
  inventory?: {
    name:      string;
    brand:     string | null;
    sku:       string | null;
    image_url: string | null;
    item_type: string;
    min_stock: number;
    quantity:  number;
  } | null;
}

export interface LowStockItem {
  id:        string;
  name:      string;
  brand:     string | null;
  image_url: string | null;
  sku:       string | null;
  quantity:  number;
  min_stock: number;
  item_type: string;
}

// ── useInventoryMovements ─────────────────────────────────────────────────────

export function useInventoryMovements(inventoryId?: string, limit = 30) {
  const { org } = useOrganization();

  return useQuery({
    queryKey: ["inventory_movements", org?.id, inventoryId, limit],
    enabled:  !!org?.id,
    staleTime: 15_000,
    queryFn: async (): Promise<InventoryMovement[]> => {
      let q = db()
        .from("inventory_movements")
        .select("*, inventory(name, brand, sku, image_url, item_type, min_stock, quantity)")
        .eq("organization_id", org!.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (inventoryId) q = q.eq("inventory_id", inventoryId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as InventoryMovement[];
    },
  });
}

// ── useLowStockNotifications ──────────────────────────────────────────────────
// Items donde quantity <= min_stock

export function useLowStockNotifications() {
  const { org } = useOrganization();

  return useQuery({
    queryKey: ["low-stock-notif", org?.id],
    enabled:  !!org?.id,
    staleTime: 30_000,
    refetchInterval: 60_000, // refresh every minute
    queryFn: async (): Promise<LowStockItem[]> => {
      const { data, error } = await db()
        .from("inventory")
        .select("id, name, brand, image_url, sku, quantity, min_stock, item_type")
        .eq("organization_id", org!.id)
        .order("quantity", { ascending: true });

      if (error) throw error;
      // Filter where quantity <= min_stock
      return ((data ?? []) as LowStockItem[]).filter(
        (i) => i.quantity <= i.min_stock
      );
    },
  });
}

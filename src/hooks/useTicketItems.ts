// useTicketItems.ts — Piezas/repuestos usados en un ticket
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const supabase = createClient();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TicketItem {
  id:           string;
  ticket_id:    string;
  inventory_id: string;
  quantity:     number;
  unit_price:   number;
  add_to_total: boolean;
  created_at:   string;
  // Joined from inventory
  inventory?: {
    name:      string;
    brand:     string | null;
    sku:       string | null;
    item_type: string;
  } | null;
}

export interface AddTicketItemPayload {
  ticket_id:       string;
  organization_id: string;
  inventory_id:    string;
  quantity:        number;
  unit_price:      number;
  add_to_total:    boolean;
}

// ── useTicketItems ────────────────────────────────────────────────────────────

export function useTicketItems(ticketId: string) {
  return useQuery({
    queryKey: ["ticket-items", ticketId],
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_items")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("*, inventory(name, brand, sku, item_type)" as any)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TicketItem[];
    },
    enabled: !!ticketId,
  });
}

// ── useAddTicketItem ──────────────────────────────────────────────────────────

export function useAddTicketItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddTicketItemPayload) => {
      // 1. Insert ticket item
      const { data, error } = await supabase
        .from("ticket_items")
        .insert({
          ticket_id:       payload.ticket_id,
          organization_id: payload.organization_id,
          inventory_id:    payload.inventory_id,
          quantity:        payload.quantity,
          unit_price:      payload.unit_price,
          add_to_total:    payload.add_to_total,
        })
        .select()
        .single();
      if (error) throw error;

      // 2. Decrement inventory stock — full params to avoid function overload ambiguity
      const { error: stockErr } = await (supabase as any).rpc("decrement_stock", {
        p_inventory_id:   payload.inventory_id,
        p_qty:            payload.quantity,
        p_reference_id:   payload.ticket_id,
        p_reference_type: "ticket",
      });

      if (stockErr) {
        // Manual fallback
        console.error("[TicketItems] decrement_stock RPC failed, using fallback:", stockErr);
        const { data: inv } = await supabase
          .from("inventory")
          .select("quantity")
          .eq("id", payload.inventory_id)
          .single();
        if (inv) {
          await supabase
            .from("inventory")
            .update({ quantity: Math.max(0, inv.quantity - payload.quantity) })
            .eq("id", payload.inventory_id);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["ticket-items", variables.ticket_id] });
      qc.invalidateQueries({ queryKey: ["tickets", variables.ticket_id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["low-stock-notif"] });
      qc.invalidateQueries({ queryKey: ["low-stock-count"] });
      qc.invalidateQueries({ queryKey: ["inventory_movements"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      toast.success("Pieza agregada al ticket");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}


// ── useRemoveTicketItem ───────────────────────────────────────────────────────

export function useRemoveTicketItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      ticketId,
      inventoryId,
      quantity,
    }: {
      itemId:      string;
      ticketId:    string;
      inventoryId: string;
      quantity:    number;
    }) => {
      // 1. Delete ticket item
      const { error } = await supabase
        .from("ticket_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;

      // 2. Restore inventory stock
      const { data: inv } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("id", inventoryId)
        .single();
      if (inv) {
        await supabase
          .from("inventory")
          .update({ quantity: inv.quantity + quantity })
          .eq("id", inventoryId);
      }

      return { ticketId };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["ticket-items", res.ticketId] });
      qc.invalidateQueries({ queryKey: ["tickets", res.ticketId] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["low-stock-count"] });
      qc.invalidateQueries({ queryKey: ["inventory_movements"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      toast.success("Pieza eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

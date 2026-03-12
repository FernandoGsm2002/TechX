// usePOS.ts — casted to `any` where new tables (sales, sale_items) are used
// since types are auto-generated and won't include new tables until regenerated.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

const LOW_STOCK = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  inventory_id: string;
  name:         string;
  brand:        string | null;
  category:     string | null;
  unit_price:   number;
  quantity:     number;
  stock:        number;
}

export interface SalePayload {
  organization_id: string;
  created_by:      string | null;
  customer_name:   string | null;
  customer_id:     string | null;
  payment_method:  string;
  payment_status:  string;
  notes:           string | null;
  items: {
    inventory_id: string;
    quantity:     number;
    unit_price:   number;
  }[];
}

export interface SaleItemRow {
  id:           string;
  inventory_id: string;
  quantity:     number;
  unit_price:   number;
  name:         string;
  brand:        string | null;
}

export interface SaleRow {
  id:              string;
  organization_id: string;
  created_by:      string | null;
  created_by_name: string | null;   // denormalized from profiles join
  customer_name:   string | null;
  total_amount:    number;
  payment_method:  string;
  notes:           string | null;
  created_at:      string;
  items:           SaleItemRow[];   // enriched from sale_items join
}

// ── Create Sale ───────────────────────────────────────────────────────────────

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SalePayload) => {
      const total = payload.items.reduce(
        (s, i) => s + i.quantity * i.unit_price, 0
      );

      // 1. Insert sale
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          organization_id: payload.organization_id,
          created_by:      payload.created_by,
          customer_name:   payload.customer_name || null,
          customer_id:     payload.customer_id || null,
          total_amount:    total,
          payment_method:  payload.payment_method,
          payment_status:  payload.payment_status || "pagado",
          paid_at:         payload.payment_status === "pagado" ? new Date().toISOString() : null,
          notes:           payload.notes || null,
        })
        .select()
        .single();
      if (saleErr) throw saleErr;

      // 2. Insert sale items
      const { error: itemsErr } = await supabase
        .from("sale_items")
        .insert(
          payload.items.map((i) => ({
            sale_id:      sale.id,
            inventory_id: i.inventory_id,
            quantity:     i.quantity,
            unit_price:   i.unit_price,
          }))
        );
      if (itemsErr) throw itemsErr;

      // 3. Decrement inventory stock for each item
      for (const item of payload.items) {
        const { error: rpcErr } = await supabase.rpc("decrement_stock", {
          p_inventory_id:   item.inventory_id,
          p_qty:            item.quantity,
          p_reference_id:   sale.id,
          p_reference_type: "sale",
          p_performed_by:   payload.created_by ?? undefined,
        });

        if (rpcErr) {
          // Fallback manual si el RPC falla por alguna razón inesperada
          console.error("[POS] decrement_stock RPC failed, using manual fallback:", rpcErr);
          const { data: inv } = await supabase
            .from("inventory")
            .select("quantity")
            .eq("id", item.inventory_id)
            .single();
          if (inv) {
            const { error: updateErr } = await supabase
              .from("inventory")
              .update({ quantity: Math.max(0, Number(inv.quantity) - item.quantity) })
              .eq("id", item.inventory_id);
            if (updateErr) {
              console.error("[POS] Manual stock update also failed:", updateErr);
            }
          }
        }
      }

      return sale as SaleRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["low-stock-notif"] });
      qc.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast.success("Venta registrada correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}


interface UseSalesOptions {
  role?:   string | null;
  userId?: string | null;
}

export function useSalesHistory(opts: UseSalesOptions = {}) {
  const { role, userId } = opts;
  return useQuery({
    queryKey: ["sales", role, userId],
    queryFn: async () => {
      const isTecnico = role === "tecnico";

      // Build query — join sale_items + inventory + profiles (creator name)
      let query = supabase
        .from("sales")
        .select(`
          id, organization_id, created_by, customer_name,
          total_amount, payment_method, notes, created_at,
          profiles!sales_created_by_fkey ( full_name ),
          sale_items (
            id, inventory_id, quantity, unit_price,
            inventory ( name, brand )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      // Técnico: only their own sales
      if (isTecnico && userId) {
        query = query.eq("created_by", userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as {
        id: string;
        organization_id: string;
        created_by: string | null;
        customer_name: string | null;
        total_amount: number;
        payment_method: string;
        notes: string | null;
        created_at: string;
        profiles: { full_name: string | null } | null;
        sale_items: {
          id: string;
          inventory_id: string;
          quantity: number;
          unit_price: number;
          inventory: { name: string; brand: string | null } | null;
        }[];
      }[]).map((s) => ({
        id:              s.id,
        organization_id: s.organization_id,
        created_by:      s.created_by,
        created_by_name: s.profiles?.full_name ?? null,
        customer_name:   s.customer_name,
        total_amount:    Number(s.total_amount),
        payment_method:  s.payment_method,
        notes:           s.notes,
        created_at:      s.created_at,
        items: (s.sale_items ?? []).map((si) => ({
          id:           si.id,
          inventory_id: si.inventory_id,
          quantity:     si.quantity,
          unit_price:   Number(si.unit_price),
          name:         si.inventory?.name ?? "Ítem eliminado",
          brand:        si.inventory?.brand ?? null,
        })),
      })) as SaleRow[];
    },
  });
}

// ── Low Stock Alert ───────────────────────────────────────────────────────────

export interface LowStockItem {
  id:        string;
  name:      string;
  brand:     string | null;
  category:  string | null;
  quantity:  number;
  item_type: string;
}

export function useLowStock() {
  return useQuery({
    queryKey: ["low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, name, brand, category, quantity, item_type")
        .lte("quantity", LOW_STOCK)
        .order("quantity", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LowStockItem[];
    },
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useLowStockCount() {
  const { data } = useLowStock();
  return data?.length ?? 0;
}

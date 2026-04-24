// usePOS.ts — POS hook con venta 100% transaccional via RPC create_sale_transactional
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

//Types

export interface CartItem {
  inventory_id: string;
  name:         string;
  brand:        string | null;
  category:     string | null;
  unit_price:   number;
  quantity:     number;
  stock:        number;
  discount?:      number; // porcentaje 0-100
  adjustedPrice?: number; // precio efectivo tras descuento
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
  payment_status:  string;
  paid_at:         string | null;
  notes:           string | null;
  created_at:      string;
  voided_at?:      string | null;
  voided_by?:      string | null;
  void_reason?:    string | null;
  items:           SaleItemRow[];   // enriched from sale_items join
}

//Create Sale 

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SalePayload) => {
      // Una sola llamada RPC atómica: si falla cualquier paso la DB hace rollback.
      const { data, error } = await supabase.rpc("create_sale_transactional", {
        p_organization_id: payload.organization_id,
        p_created_by:      payload.created_by ?? null,
        p_customer_name:   payload.customer_name ?? null,
        p_customer_id:     payload.customer_id ?? null,
        p_payment_method:  payload.payment_method,
        p_payment_status:  payload.payment_status || "pagado",
        p_notes:           payload.notes ?? null,
        p_items:           payload.items,
      });

      if (error) throw error;

      return { id: (data as { sale_id: string }).sale_id } as SaleRow;
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
          total_amount, payment_method, payment_status, paid_at, notes, created_at,
          voided_at, voided_by, void_reason,
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
        payment_status: string | null;
        paid_at: string | null;
        notes: string | null;
        created_at: string;
        voided_at: string | null;
        voided_by: string | null;
        void_reason: string | null;
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
        payment_status:  s.payment_status ?? null,
        paid_at:         s.paid_at ?? null,
        notes:           s.notes,
        created_at:      s.created_at,
        voided_at:       s.voided_at,
        voided_by:       s.voided_by,
        void_reason:     s.void_reason,
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

//Low Stock Alert 

export interface LowStockItem {
  id:        string;
  name:      string;
  brand:     string | null;
  category:  string | null;
  quantity:  number;
  min_stock: number;
  item_type: string;
}

export function useLowStock() {
  return useQuery({
    queryKey: ["low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, name, brand, category, quantity, min_stock, item_type")
        .order("quantity", { ascending: true });
      if (error) throw error;
      // Filtra solo los que están en o por debajo de su min_stock individual
      return (data ?? []).filter(
        (item: LowStockItem) => item.quantity <= item.min_stock
      ) as LowStockItem[];
    },
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useLowStockCount() {
  const { data } = useLowStock();
  return data?.length ?? 0;
}

//Void Sale Mutation 
export function useVoidSale() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, voidedBy, reason }: { saleId: string; voidedBy: string; reason: string }) => {
      const { data, error } = await supabase.rpc("void_sale_transactional", {
        p_sale_id:   saleId,
        p_voided_by: voidedBy,
        p_reason:    reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      qc.invalidateQueries({ queryKey: ["low-stock-notif"] });
      toast.success("Venta anulada correctamente, stock restituido.");
    },
    onError: (err: Error) => {
      toast.error("Error al anular la venta: " + err.message);
    },
  });
}


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { InventoryCondition } from "@/types/domain";

const supabase = createClient();

// Real DB columns for inventory:
// id, organization_id, name, brand, model, category, sku, condition,
// quantity, cost_price, sell_price, notes, item_type, created_at, updated_at

export type InventoryItemType = "producto" | "repuesto_propio" | "repuesto_comprado";

export interface InventoryRow {
  id:              string;
  organization_id: string;
  name:            string;
  brand:           string | null;
  model:           string | null;
  category:        string | null;
  sku:             string | null;
  condition:       InventoryCondition;
  quantity:        number;
  cost_price:      number | null;
  sell_price:      number | null;
  notes:           string | null;
  image_url:       string | null;
  min_stock:       number;
  item_type:       InventoryItemType;
  created_at:      string;
  updated_at:      string;
}

type InventoryInsert = Omit<InventoryRow, "id" | "created_at" | "updated_at">;
type InventoryUpdate = Partial<InventoryInsert> & { id: string };

// Real DB columns for device_brands:
// id, organization_id, name, created_at

export interface BrandRow {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

// Real DB columns for device_models:
// id, organization_id, brand_id, name, device_type, created_at

export type DeviceType = "movil" | "laptop" | "consola" | "tablet" | "otro";

export interface ModelRow {
  id: string;
  organization_id: string;
  brand_id: string;
  name: string;
  device_type: DeviceType | null;
  created_at: string;
}

export type DeviceModelWithBrand = ModelRow & {
  device_brands: { name: string } | null;
};

// ── Inventory ─────────────────────────────────────────────────────────────────

export function useInventario() {
  return useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as InventoryRow[];
    },
  });
}

export function useCreateInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: InventoryInsert) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.from("inventory").insert(values as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventario"] });
      toast.success("Ítem añadido al inventario");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: InventoryUpdate) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.from("inventory").update(values as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventario"] });
      toast.success("Ítem actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventario"] });
      toast.success("Ítem eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Brands ────────────────────────────────────────────────────────────────────

export function useMarcas() {
  return useQuery({
    queryKey: ["marcas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("device_brands").select("*").order("name");
      if (error) throw error;
      return data as BrandRow[];
    },
  });
}

export function useCreateMarca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; organization_id: string }) => {
      const { data, error } = await supabase.from("device_brands").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marcas"] });
      toast.success("Marca creada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteMarca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marcas"] });
      qc.invalidateQueries({ queryKey: ["modelos"] });
      toast.success("Marca eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Models ────────────────────────────────────────────────────────────────────

export function useModelos() {
  return useQuery({
    queryKey: ["modelos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_models")
        .select("*, device_brands(name)")
        .order("name");
      if (error) throw error;
      return data as DeviceModelWithBrand[];
    },
  });
}

export function useCreateModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; brand_id: string; device_type: DeviceType; organization_id: string }) => {
      const { data, error } = await supabase.from("device_models").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelos"] });
      toast.success("Modelo creado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modelos"] });
      toast.success("Modelo eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

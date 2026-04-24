import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { STALE_TIME } from "@/lib/queryConfig";

const supabase = createClient();

// Real DB columns for customers:
// id, organization_id, full_name, phone, email, tax_id, notes, created_at, updated_at

export interface CustomerRow {
  id: string;
  organization_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  document_id: string | null;
  customer_type: string;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type CustomerInsert = Omit<CustomerRow, "id" | "created_at" | "updated_at">;
type CustomerUpdate = Partial<CustomerInsert> & { id: string };

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    staleTime: STALE_TIME.MEDIUM,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as CustomerRow[];
    },
  });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: CustomerInsert) => {
      const { data, error } = await supabase.from("customers").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente creado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: CustomerUpdate) => {
      const { data, error } = await supabase.from("customers").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

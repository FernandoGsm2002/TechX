/**
 * Hook para tags persistentes de Otros Servicios
 * Los tags se guardan por organización y se pueden reusar/eliminar.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface ServicioTag {
  id: string;
  name: string;
  created_at: string;
}

const KEY = "servicio_tags";

export function useServicioTags() {
  const { org } = useOrganization();
  const supabase = createClient();

  return useQuery({
    queryKey: [KEY, org?.id],
    enabled: !!org?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicio_tags")
        .select("*")
        .eq("organization_id", org!.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ServicioTag[];
    },
    staleTime: 5 * 60 * 1000, // 5 min — tags no cambian seguido
  });
}

export function useCreateServicioTag() {
  const { org } = useOrganization();
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("servicio_tags")
        .insert({ organization_id: org!.id, name: name.trim() })
        .select()
        .single();
      if (error) {
        // Ignorar duplicados silenciosamente
        if (error.code === "23505") return null;
        throw error;
      }
      return data as ServicioTag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, org?.id] }),
    onError: () => toast.error("Error al guardar el tag"),
  });
}

export function useDeleteServicioTag() {
  const { org } = useOrganization();
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("servicio_tags")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, org?.id] }),
    onError: () => toast.error("Error al eliminar el tag"),
  });
}

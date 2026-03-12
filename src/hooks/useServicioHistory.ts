import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

const supabase = createClient();

export interface ServicioHistoryRow {
  id:          string;
  servicio_id: string;
  status_from: string | null;
  status_to:   string;
  changed_by:  string | null;
  changer_name: string | null;
  notes:       string | null;
  created_at:  string;
}

// ── Query ─────────────────────────────────────────────────────────────────────

export function useServicioHistory(servicioId: string) {
  return useQuery({
    queryKey: ["servicio_history", servicioId],
    enabled:  !!servicioId,
    queryFn:  async (): Promise<ServicioHistoryRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("servicio_history")
        .select("*, profiles!servicio_history_changed_by_fkey(full_name)")
        .eq("servicio_id", servicioId)
        .order("created_at", { ascending: true });

      if (error) {
        // La tabla puede no existir aún → retornar vacío gracefully
        if (error.code === "42P01") return [];
        throw error;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        changer_name: r.profiles?.full_name ?? null,
        profiles: undefined,
      }));
    },
  });
}

// ── Manual insert (fallback si el trigger no existe aún) ─────────────────────

export function useAddServicioHistory() {
  const qc  = useQueryClient();
  const { org } = useOrganization();
  return useMutation({
    mutationFn: async ({
      servicio_id,
      status_from,
      status_to,
      notes,
    }: {
      servicio_id: string;
      status_from: string | null;
      status_to:   string;
      notes?:      string;
    }) => {
      if (!org?.id) return;
      const { data: { user } } = await supabase.auth.getUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("servicio_history").insert({
        servicio_id,
        organization_id: org.id,
        status_from,
        status_to,
        changed_by: user?.id ?? null,
        notes: notes ?? null,
      });
    },
    onSuccess: (_, { servicio_id }) => {
      qc.invalidateQueries({ queryKey: ["servicio_history", servicio_id] });
    },
  });
}

// useCollectionTasks.ts — Cobros asignados por admin a técnicos
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { notifyUser } from "@/lib/notifyUser";
import type { FiadoRow } from "@/hooks/useFiados";

const supabase = createClient();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CollectionTask {
  id:              string;
  organization_id: string;
  fiado_id:        string;
  fiado_source:    "ticket" | "pos" | "servicio";
  assigned_to:     string;
  assigned_by:     string;
  status:          "pending" | "completed" | "cancelled";
  amount:          number;
  customer_name:   string | null;
  detail:          string | null;
  payment_method:  string | null;
  paid_at:         string | null;
  created_at:      string;
  updated_at:      string;
  // Joined profiles
  assignee?: { full_name: string | null } | null;
  assigner?: { full_name: string | null } | null;
}

export interface AssignCollectionPayload {
  organizationId:  string;
  fiado:           FiadoRow;
  assignedToId:    string;
  assignedToName:  string;
}

// ── useCollectionTasks ────────────────────────────────────────────────────────
// For technicians: their pending collection tasks.
// For admins: all tasks in the org.

export function useCollectionTasks() {
  return useQuery({
    queryKey: ["collection-tasks"],
    staleTime: 30_000,
    queryFn: async (): Promise<CollectionTask[]> => {
      const { data, error } = await supabase
        .from("collection_tasks")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("*, assignee:profiles!assigned_to(full_name), assigner:profiles!assigned_by(full_name)" as any)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CollectionTask[];
    },
  });
}

// ── useAssignCollectionTask ───────────────────────────────────────────────────
// Admin assigns a collection task to a technician.

export function useAssignCollectionTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AssignCollectionPayload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("collection_tasks")
        .insert({
          organization_id: payload.organizationId,
          fiado_id:        payload.fiado.id,
          fiado_source:    payload.fiado.source,
          assigned_to:     payload.assignedToId,
          assigned_by:     user.id,
          amount:          payload.fiado.amount,
          customer_name:   payload.fiado.description ?? null,
          detail:          payload.fiado.detail ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      // Send push notification to the technician
      await notifyUser(
        payload.organizationId,
        payload.assignedToId,
        "Nuevo cobro asignado",
        `Cobrar a ${payload.fiado.description ?? "cliente"}: ${payload.fiado.amount}`,
        "/cobros"
      );

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collection-tasks"] });
      toast.success("Cobro asignado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── useCollectionTasksHistory ─────────────────────────────────────────────────
// Completed collection tasks (for history view).
// Admins see all org tasks; technicians see only theirs (via RLS).

export function useCollectionTasksHistory() {
  return useQuery({
    queryKey: ["collection-tasks-history"],
    queryFn: async (): Promise<CollectionTask[]> => {
      const { data, error } = await supabase
        .from("collection_tasks")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("*, assignee:profiles!assigned_to(full_name), assigner:profiles!assigned_by(full_name)" as any)
        .eq("status", "completed")
        .order("paid_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as CollectionTask[];
    },
    staleTime: 60_000,
  });
}

// ── useProcessCollectionTask ──────────────────────────────────────────────────
// Technician processes a collection — calls server API route (service_role bypass).

export function useProcessCollectionTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, paymentMethod }: { taskId: string; paymentMethod: string }) => {
      const res = await fetch("/api/cobros/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, paymentMethod }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Error al procesar el cobro");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collection-tasks"] });
      qc.invalidateQueries({ queryKey: ["collection-tasks-history"] });
      qc.invalidateQueries({ queryKey: ["fiados"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      toast.success("Cobro registrado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

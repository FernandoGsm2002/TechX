// useTechnicians.ts — CRUD de técnicos para el admin
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const supabase = createClient();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TechnicianRow {
  id:        string;
  full_name: string | null;
  email:     string | null;
  phone:     string | null;
  role:      string;
  avatar_url:string | null;
  created_at:string;
}

// ── List technicians (all profiles in org with role = tecnico) ────────────────

export function useTechnicians() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async (): Promise<TechnicianRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, avatar_url, created_at")
        .eq("role", "tecnico")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TechnicianRow[];
    },
  });
}

// ── Create technician via Edge Function ───────────────────────────────────────

interface CreateTechPayload {
  email:     string;
  password:  string;
  full_name: string;
  phone?:    string;
}

export function useCreateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTechPayload) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No autenticado — cierra sesión y vuelve a entrar");

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-technician`;

      const res = await fetch(url, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify(payload),
      });

      // Try to parse JSON; handle non-JSON responses gracefully
      let json: { success?: boolean; error?: string; user_id?: string };
      try {
        json = await res.json();
      } catch {
        throw new Error(`Error del servidor (${res.status}): ${res.statusText}`);
      }

      if (!res.ok || json.error) {
        throw new Error(json.error ?? `Error ${res.status}`);
      }

      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] });
      toast.success("Técnico creado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Update technician profile ─────────────────────────────────────────────────

interface UpdateTechPayload {
  id:        string;
  full_name?: string | null;
  phone?:    string | null;
  email?:    string | null;
}

export function useUpdateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTechPayload) => {
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] });
      toast.success("Técnico actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Deactivate technician (change role to 'suspendido') ───────────────────────

export function useDeactivateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "suspendido" as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] });
      toast.success("Técnico desactivado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Technician's own stats ────────────────────────────────────────────────────

export function useTechnicianStats(userId: string | null) {
  return useQuery({
    queryKey: ["tech-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;

      const now      = new Date();
      const year     = now.getFullYear();
      const month    = String(now.getMonth() + 1).padStart(2, "0");
      const startOfMonth = `${year}-${month}-01`;

      // Tickets handled by this technician — cast to any to bypass SelectQueryError
      // for new columns (paid_at, payment_status) before type regen is complete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tickets } = await (supabase as any)
        .from("tickets")
        .select("id, status, final_amount, quote_amount, created_at, delivered_at, paid_at, payment_status, updated_at, customers(full_name), device_details")
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
        .order("updated_at", { ascending: false });

      type TicketRow = {
        id: string;
        status: string;
        final_amount: number | null;
        quote_amount: number | null;
        created_at: string;
        delivered_at: string | null;
        paid_at: string | null;
        payment_status: string | null;
        updated_at: string;
        customers: { full_name: string } | null;
        device_details: Record<string, unknown> | null;
      };

      const allTickets: TicketRow[] = (tickets ?? []) as TicketRow[];

      const active    = allTickets.filter((t) => !["completado", "fallido"].includes(t.status));
      const delivered = allTickets.filter((t) => t.status === "completado");
      const thisMonth = delivered.filter((t) => {
        if (t.payment_status !== "pagado") return false;
        const d = new Date(t.paid_at ?? t.delivered_at ?? t.updated_at);
        return d >= new Date(startOfMonth);
      });

      const monthRevenue = thisMonth.reduce(
        (sum, t) => sum + Number(t.final_amount ?? t.quote_amount ?? 0), 0
      );

      // Sales by this user this month
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sales } = await (supabase as any)
        .from("sales")
        .select("id, total_amount, created_at, paid_at, payment_status, customer_name, payment_method")
        .eq("created_by", userId)
        .eq("payment_status", "pagado")
        .gte("paid_at", startOfMonth)
        .order("paid_at", { ascending: false });

      type SaleRow = { id: string; total_amount: number; created_at: string; customer_name: string | null; payment_method: string };
      const safeSales: SaleRow[] = (sales ?? []) as SaleRow[];

      const posRevenue = safeSales.reduce((s, v) => s + Number(v.total_amount), 0);

      return {
        totalTickets:   allTickets.length,
        activeTickets:  active.length,
        deliveredMonth: thisMonth.length,
        monthRevenue,
        posRevenue,
        recentTickets:  allTickets.slice(0, 5),
        recentSales:    safeSales.slice(0, 3),
      };
    },
  });
}

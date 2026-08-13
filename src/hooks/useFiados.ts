import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface FiadoRow {
  id: string;
  source: "ticket" | "pos" | "servicio";
  amount: number;
  description: string;
  detail: string;
  created_at: string;
  customer_id: string | null;
  customer_name: string | null;
}

export interface FiadoPagadoRow {
  id: string;
  source: "ticket" | "pos" | "servicio";
  amount: number;
  description: string;   // customer name
  detail: string;        // device / items
  paid_at: string;
  payment_method: string | null;
  paid_by_name: string | null;  // full_name of who collected
  customer_id: string | null;
}

export function useFiados() {
  return useQuery({
    queryKey: ["fiados"],
    staleTime: 30_000,
    queryFn: async (): Promise<FiadoRow[]> => {
      const supabase = createClient();

      // 1. Unpaid Tickets
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ticketsData, error: ticketsErr } = await (supabase as any)
        .from("tickets")
        .select(`
          id, final_amount, quote_amount, parts_amount, created_at, device_details, customer_id,
          customers ( full_name )
        `)
        .eq("payment_status", "fiado")
        .eq("status", "entregado");
      if (ticketsErr) throw ticketsErr;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ticketFiados: FiadoRow[] = (ticketsData ?? []).map((t: any) => ({
        id:            t.id,
        source:        "ticket" as const,
        amount:        Number(t.final_amount ?? t.quote_amount ?? 0) + Number(t.parts_amount ?? 0),
        description:   t.customers?.full_name ?? "Sin cliente",
        detail:        [t.device_details?.brand, t.device_details?.model].filter(Boolean).join(" ") || "Ticket de reparación",
        created_at:    t.created_at,
        customer_id:   t.customer_id,
        customer_name: t.customers?.full_name ?? null,
      }));

      // 2. Unpaid POS Sales
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: posData, error: posErr } = await (supabase as any)
        .from("sales")
        .select(`
          id, total_amount, created_at, customer_id, customer_name,
          sale_items ( quantity, inventory ( name, brand ) )
        `)
        .eq("payment_status", "fiado");
      if (posErr) throw posErr;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const posFiados: FiadoRow[] = (posData ?? []).map((s: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = (s.sale_items ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((si: any) => `${[si.inventory?.brand, si.inventory?.name].filter(Boolean).join(" ")} ×${si.quantity}`)
          .join(" · ");
        return {
          id:            s.id,
          source:        "pos" as const,
          amount:        Number(s.total_amount),
          description:   s.customer_name ?? "Venta POS",
          detail:        items || "Artículos",
          created_at:    s.created_at,
          customer_id:   s.customer_id,
          customer_name: s.customer_name,
        };
      });

      // 3. Otros Servicios sin cobrar
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: serviciosData, error: serviciosErr } = await (supabase as any)
        .from("otros_servicios")
        .select(`
          id, price, created_at, customer_id, tags,
          customers ( full_name )
        `)
        .eq("status", "entregado")
        .eq("payment_status", "fiado")
        .not("customer_id", "is", null);
      if (serviciosErr) throw serviciosErr;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const servicioFiados: FiadoRow[] = (serviciosData ?? []).map((s: any) => ({
        id:            s.id,
        source:        "servicio" as const,
        amount:        Number(s.price ?? 0),
        description:   s.customers?.full_name ?? "Cliente registrado",
        detail:        (s.tags ?? []).slice(0, 2).join(" · ") || "Servicio especial",
        created_at:    s.created_at,
        customer_id:   s.customer_id,
        customer_name: s.customers?.full_name ?? null,
      }));

      return [...ticketFiados, ...posFiados, ...servicioFiados].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });
}

// ── History: recently collected debts ────────────────────────────────────────

export function useFiadoHistory(limit = 30) {
  return useQuery({
    queryKey: ["fiados-historial", limit],
    queryFn: async (): Promise<FiadoPagadoRow[]> => {
      const supabase = createClient();

      // 1. Tickets cobrados desde fiado (paid_by no nulo = cobro registrado manualmente)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ticketsData, error: ticketsErr } = await (supabase as any)
        .from("tickets")
        .select(`
          id, final_amount, quote_amount, parts_amount, paid_at, payment_method, customer_id, device_details,
          customers ( full_name ),
          paid_by_profile:paid_by ( full_name )
        `)
        .eq("payment_status", "pagado")
        .not("paid_by", "is", null)
        .order("paid_at", { ascending: false })
        .limit(limit);
      if (ticketsErr) throw ticketsErr;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ticketRows: FiadoPagadoRow[] = (ticketsData ?? []).map((t: any) => ({
        id:             t.id,
        source:         "ticket" as const,
        amount:         Number(t.final_amount ?? t.quote_amount ?? 0) + Number(t.parts_amount ?? 0),
        description:    t.customers?.full_name ?? "Sin cliente",
        detail:         [t.device_details?.brand, t.device_details?.model].filter(Boolean).join(" ") || "Ticket de reparación",
        paid_at:        t.paid_at,
        payment_method: t.payment_method,
        paid_by_name:   t.paid_by_profile?.full_name ?? null,
        customer_id:    t.customer_id,
      }));

      // 2. Ventas POS cobradas desde fiado
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: posData, error: posErr } = await (supabase as any)
        .from("sales")
        .select(`
          id, total_amount, paid_at, payment_method, customer_id, customer_name,
          paid_by_profile:paid_by ( full_name )
        `)
        .eq("payment_status", "pagado")
        .not("paid_by", "is", null)
        .order("paid_at", { ascending: false })
        .limit(limit);
      if (posErr) throw posErr;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const posRows: FiadoPagadoRow[] = (posData ?? []).map((s: any) => ({
        id:             s.id,
        source:         "pos" as const,
        amount:         Number(s.total_amount),
        description:    s.customer_name ?? "Venta POS",
        detail:         "Venta POS",
        paid_at:        s.paid_at,
        payment_method: s.payment_method,
        paid_by_name:   s.paid_by_profile?.full_name ?? null,
        customer_id:    s.customer_id,
      }));

      // 3. Otros servicios cobrados desde fiado
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: serviciosData, error: serviciosErr } = await (supabase as any)
        .from("otros_servicios")
        .select(`
          id, price, paid_at, payment_method, customer_id, tags,
          customers ( full_name ),
          paid_by_profile:paid_by ( full_name )
        `)
        .eq("payment_status", "pagado")
        .not("paid_by", "is", null)
        .order("paid_at", { ascending: false })
        .limit(limit);
      if (serviciosErr) throw serviciosErr;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const servicioRows: FiadoPagadoRow[] = (serviciosData ?? []).map((s: any) => ({
        id:             s.id,
        source:         "servicio" as const,
        amount:         Number(s.price ?? 0),
        description:    s.customers?.full_name ?? "Cliente",
        detail:         (s.tags ?? []).slice(0, 2).join(" · ") || "Servicio especial",
        paid_at:        s.paid_at,
        payment_method: s.payment_method,
        paid_by_name:   s.paid_by_profile?.full_name ?? null,
        customer_id:    s.customer_id,
      }));

      return [...ticketRows, ...posRows, ...servicioRows]
        .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
        .slice(0, limit);
    },
    staleTime: 30_000,
  });
}

// ── Mutation to Pay Debt ──────────────────────────────────────────────────────

interface PayFiadoPayload {
  id:             string;
  source:         "ticket" | "pos" | "servicio";
  payment_method: string;
}

export function usePayFiado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PayFiadoPayload) => {
      const supabase = createClient();
      const { id, source, payment_method } = payload;

      const { data: { user } } = await supabase.auth.getUser();

      const payloadUpdates = {
        payment_status: "pagado",
        payment_method,
        paid_at:  new Date().toISOString(),
        paid_by:  user?.id ?? null,
      };

      if (source === "ticket") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("tickets").update(payloadUpdates).eq("id", id);
        if (error) throw error;
      } else if (source === "pos") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("sales").update(payloadUpdates).eq("id", id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("otros_servicios")
          .update({ ...payloadUpdates, paid: true })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fiados"] });
      qc.invalidateQueries({ queryKey: ["fiados-historial"] });
      qc.invalidateQueries({ queryKey: ["ingresos-chart"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["otros_servicios"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      qc.invalidateQueries({ queryKey: ["collection-tasks"] });
      qc.invalidateQueries({ queryKey: ["collection-tasks-history"] });
      toast.success("Deuda liquidada correctamente");
    },
    onError: (err: Error) => toast.error("Error al liquidar deuda: " + err.message)
  });
}

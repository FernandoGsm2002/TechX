import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

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

export function useFiados() {
  return useQuery({
    queryKey: ["fiados"],
    queryFn: async (): Promise<FiadoRow[]> => {
      // 1. Unpaid Tickets
      const { data: ticketsData } = await supabase
        .from("tickets")
        .select(`
          id, final_amount, quote_amount, created_at, updated_at, device_details, customer_id, 
          customers ( full_name )
        `)
        .eq("payment_status", "fiado")
        .eq("status", "entregado");  // solo los ya entregados sin cobrar

      const ticketFiados: FiadoRow[] = (ticketsData ?? []).map((t: any) => ({
        id:            t.id,
        source:        "ticket",
        amount:        Number(t.final_amount ?? t.quote_amount ?? 0),
        description:   t.customers?.full_name ?? "Sin cliente",
        detail:        [t.device_details?.brand, t.device_details?.model].filter(Boolean).join(" ") || "Ticket de reparación",
        created_at:    t.created_at,
        customer_id:   t.customer_id,
        customer_name: t.customers?.full_name ?? null,
      }));

      // 2. Unpaid POS Sales
      const { data: posData } = await supabase
        .from("sales")
        .select(`
          id, total_amount, created_at, customer_id, customer_name,
          sale_items ( quantity, inventory ( name, brand ) )
        `)
        .eq("payment_status", "fiado");

      const posFiados: FiadoRow[] = (posData ?? []).map((s: any) => {
        const items = (s.sale_items ?? [])
          .map((si: any) => `${[si.inventory?.brand, si.inventory?.name].filter(Boolean).join(" ")} ×${si.quantity}`)
          .join(" · ");
        return {
          id:            s.id,
          source:        "pos",
          amount:        Number(s.total_amount),
          description:   s.customer_name ?? "Venta POS",
          detail:        items || "Artículos",
          created_at:    s.created_at,
          customer_id:   s.customer_id,
          customer_name: s.customer_name,
        };
      });

      // 3. Otros Servicios sin cobrar (completado pero paid=false con cliente registrado)
      const { data: serviciosData } = await supabase
        .from("otros_servicios")
        .select(`
          id, price, created_at, customer_id, guest_name, guest_phone,
          tags,
          customers ( full_name )
        `)
        .eq("status", "entregado")       // solo los ya entregados
        .eq("payment_status", "fiado")   // y que son fiados
        .not("customer_id", "is", null); // con cliente registrado

      const servicioFiados: FiadoRow[] = ((serviciosData ?? []) as any[]).map((s) => ({
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
      const { id, source, payment_method } = payload;
      
      const payloadUpdates = {
        payment_status: "pagado",
        payment_method,
        paid_at: new Date().toISOString()
      };

      if (source === "ticket") {
        const { error } = await supabase.from("tickets").update(payloadUpdates).eq("id", id);
        if (error) throw error;
      } else if (source === "pos") {
        const { error } = await supabase.from("sales").update(payloadUpdates).eq("id", id);
        if (error) throw error;
      } else {
        // servicio: actualizar payment_status + paid + paid_at (el trigger set_servicio_paid_at también lo hace)
        const { error } = await supabase.from("otros_servicios")
          .update({
            paid:           true,
            payment_status: "pagado",
            payment_method,
            paid_at:        new Date().toISOString(),
          })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fiados"] });
      qc.invalidateQueries({ queryKey: ["ingresos"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["otros_servicios"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      toast.success("Deuda liquidada correctamente");
    },
    onError: (err: Error) => toast.error("Error al liquidar deuda: " + err.message)
  });
}

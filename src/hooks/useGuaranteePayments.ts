/**
 * useGuaranteePayments
 * Gestión de cobros parciales/totales en garantías.
 * Los cobros se usan cuando el trabajo cubierto por garantía requiere
 * piezas NO cubiertas, diagnóstico especial, o mano de obra adicional.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createClient() as any;

// ── Types ──────────────────────────────────────────────────────────────────────

export type PaymentConcept =
  | "diagnostico"
  | "pieza_no_cubierta"
  | "mano_obra"
  | "otro";

export type PaymentMethod =
  | "efectivo"
  | "transferencia"
  | "tarjeta"
  | "yape"
  | "plin"
  | "otro";

export const CONCEPT_LABELS: Record<PaymentConcept, string> = {
  diagnostico:       "Diagnóstico",
  pieza_no_cubierta: "Pieza no cubierta",
  mano_obra:         "Mano de obra adicional",
  otro:              "Otro",
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo:      "Efectivo",
  transferencia: "Transferencia",
  tarjeta:       "Tarjeta",
  yape:          "Yape",
  plin:          "Plin",
  otro:          "Otro",
};

export interface GuaranteePaymentRow {
  id:              string;
  organization_id: string;
  guarantee_id:    string;
  amount:          number;
  concept:         PaymentConcept;
  payment_method:  PaymentMethod;
  notes:           string | null;
  registered_by:   string | null;
  created_at:      string;
}

export interface NewGuaranteePayment {
  guarantee_id:    string;
  organization_id: string;
  amount:          number;
  concept:         PaymentConcept;
  payment_method:  PaymentMethod;
  notes?:          string;
  registered_by?:  string;
}

// ── Hook: listar pagos de una garantía ────────────────────────────────────────

export function useGuaranteePayments(guaranteeId: string) {
  return useQuery({
    queryKey: ["guarantee_payments", guaranteeId],
    enabled:  !!guaranteeId,
    staleTime: 15_000,
    queryFn: async (): Promise<GuaranteePaymentRow[]> => {
      const { data, error } = await db()
        .from("guarantee_payments")
        .select("*")
        .eq("guarantee_id", guaranteeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GuaranteePaymentRow[];
    },
  });
}

// ── Hook: total pagado en una garantía ───────────────────────────────────────

export function useGuaranteePaymentsTotal(guaranteeId: string) {
  const { data = [] } = useGuaranteePayments(guaranteeId);
  return data.reduce((sum, p) => sum + p.amount, 0);
}

// ── Hook: crear pago ──────────────────────────────────────────────────────────

export function useCreateGuaranteePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NewGuaranteePayment) => {
      const { data, error } = await db()
        .from("guarantee_payments")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as GuaranteePaymentRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["guarantee_payments", data.guarantee_id] });
      qc.invalidateQueries({ queryKey: ["garantias"] });
      toast.success("Pago registrado correctamente");
    },
    onError: (err: Error) => toast.error("Error al registrar pago: " + err.message),
  });
}

// ── Hook: eliminar pago ───────────────────────────────────────────────────────

export function useDeleteGuaranteePayment(guaranteeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await db()
        .from("guarantee_payments")
        .delete()
        .eq("id", paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guarantee_payments", guaranteeId] });
      toast.success("Pago eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

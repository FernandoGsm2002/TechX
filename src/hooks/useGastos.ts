import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const supabase = createClient();

// Real DB columns for expenses:
// id, organization_id, created_by, category, description, amount, expense_date, created_at, updated_at

export interface ExpenseRow {
  id: string;
  organization_id: string;
  created_by: string | null;
  created_by_name: string | null;  // from profiles join
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

type ExpenseInsert = Omit<ExpenseRow, "id" | "created_at" | "updated_at" | "created_by_name">;
type ExpenseUpdate = Partial<ExpenseInsert> & { id: string };

interface UseGastosOptions {
  role?:   string | null;
  userId?: string | null;
}

// ── Gastos CRUD ───────────────────────────────────────────────────────────────

export function useGastos(opts: UseGastosOptions = {}) {
  const { role, userId } = opts;
  return useQuery({
    queryKey: ["gastos", role, userId],
    queryFn: async () => {
      const isTecnico = role === "tecnico";

      let query = supabase
        .from("expenses")
        .select("*, profiles!expenses_created_by_fkey(full_name)")
        .order("expense_date", { ascending: false });

      if (isTecnico && userId) {
        query = query.eq("created_by", userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[])
        .map((r) => ({
          ...r,
          created_by_name: r.profiles?.full_name ?? null,
          profiles: undefined,
        })) as ExpenseRow[];
    },
  });
}

import { notifyAdmins } from "@/lib/notifyAdmins";

export function useCreateGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: ExpenseInsert) => {
      const { data, error } = await supabase.from("expenses").insert(values).select().single();
      if (error) throw error;
      return data as any as ExpenseRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["gastos"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      toast.success("Gasto registrado");
      notifyAdmins(data.organization_id, "Nuevo Gasto", `Se registró un gasto por ${data.amount}`).catch(() => {});
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: ExpenseUpdate) => {
      const { data, error } = await supabase.from("expenses").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      toast.success("Gasto actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos"] });
      qc.invalidateQueries({ queryKey: ["finanzas-stats"] });
      toast.success("Gasto eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Financial Stats ───────────────────────────────────────────────────────────

export interface FinanzasStats {
  totalIngresos: number;   // from tickets.final_amount where status = 'entregado' this month
  totalGastos: number;     // from expenses this month
  utilidad: number;
  porCobrar: number;       // tickets with quote_amount but not entregado
}

export function useFinanzasStats() {
  return useQuery({
    queryKey: ["finanzas-stats"],
    queryFn: async (): Promise<FinanzasStats> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const now  = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const startOfMonth     = `${year}-${month}-01T00:00:00.000Z`;
      const startOfNextMonth = month === "12"
        ? `${year + 1}-01-01T00:00:00.000Z`
        : `${year}-${String(now.getMonth() + 2).padStart(2, "0")}-01T00:00:00.000Z`;

      // ── 1. Ticket income: ONLY fully paid tickets this month (by paid_at) ──
      const { data: paidTickets } = await db
        .from("tickets")
        .select("final_amount, quote_amount, ticket_items(unit_price, quantity)")
        .eq("payment_status", "pagado")
        .gte("paid_at", startOfMonth)
        .lt("paid_at",  startOfNextMonth);

      const ticketIncome = ((paidTickets ?? []) as {
        final_amount: number | null;
        quote_amount: number | null;
        ticket_items: { unit_price: number; quantity: number }[];
      }[]).reduce((sum, t) => {
        const base   = Number(t.final_amount ?? t.quote_amount ?? 0);
        const extras = (t.ticket_items ?? []).reduce(
          (s, i) => s + Number(i.unit_price) * Number(i.quantity), 0
        );
        return sum + base + extras;
      }, 0);

      // ── 2. POS income: ONLY paid sales this month (by paid_at) ──
      const { data: posData } = await db
        .from("sales")
        .select("total_amount")
        .eq("payment_status", "pagado")
        .gte("paid_at", startOfMonth)
        .lt("paid_at",  startOfNextMonth);

      const posIncome = ((posData ?? []) as { total_amount: number }[]).reduce(
        (sum, s) => sum + Number(s.total_amount), 0
      );

      // ── 3. Otros Servicios pagados este mes ──
      const { data: serviciosData } = await db
        .from("otros_servicios")
        .select("price")
        .eq("status", "entregado")
        .eq("paid", true)
        .gte("delivered_at", startOfMonth)
        .lt("delivered_at",  startOfNextMonth);

      const serviciosIncome = ((serviciosData ?? []) as { price: number }[]).reduce(
        (sum, s) => sum + Number(s.price ?? 0), 0
      );

      const totalIngresos = ticketIncome + posIncome + serviciosIncome;

      // ── 3. Expenses this month ──
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", startOfMonth.slice(0, 10))
        .lt("expense_date",  startOfNextMonth.slice(0, 10));

      const totalGastos = ((expenses ?? []) as { amount: number }[]).reduce(
        (sum, e) => sum + Number(e.amount), 0
      );

      // ── 4. Por Cobrar: fiados entregados (ya se fueron pero no pagaron) ──
      const [{ data: fiadoTickets }, { data: fiadoSales }, { data: fiadoServicios }] = await Promise.all([
        db.from("tickets")
          .select("final_amount, quote_amount")
          .eq("payment_status", "fiado")
          .eq("status", "entregado"),      // ← Solo los que ya se fueron sin pagar
        db.from("sales")
          .select("total_amount")
          .eq("payment_status", "fiado"),
        db.from("otros_servicios")
          .select("price")
          .eq("status", "entregado")
          .eq("payment_status", "fiado")
          .not("customer_id", "is", null),
      ]);

      const porCobrar =
        ((fiadoTickets ?? []) as { final_amount: number | null; quote_amount: number | null }[])
          .reduce((s, t) => s + Number(t.final_amount ?? t.quote_amount ?? 0), 0) +
        ((fiadoSales ?? []) as { total_amount: number }[])
          .reduce((s, v) => s + Number(v.total_amount), 0) +
        ((fiadoServicios ?? []) as { price: number }[])
          .reduce((s, sv) => s + Number(sv.price ?? 0), 0);

      return {
        totalIngresos,
        totalGastos,
        utilidad: totalIngresos - totalGastos,
        porCobrar,
      };
    },
  });
}

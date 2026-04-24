"use client";

import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  faArrowTrendUp, faArrowTrendDown, faDollarSign, faClock,
  faPlus, faPencil, faTrash, faChevronRight, faCalendar,
  faCalendarDays, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  useFinanzasStats, useGastos, useCreateGasto, useUpdateGasto, useDeleteGasto,
  type ExpenseRow, type DateRange,
} from "@/hooks/useGastos";

const CATEGORIES = [
  "Alquiler", "Servicios", "Materiales", "Equipos", "Sueldos",
  "Marketing", "Transporte", "Otros",
];

const schema = z.object({
  category: z.string().min(1),
  description: z.string().min(2, "Mín. 2 caracteres"),
  amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
  expense_date: z.string().min(1, "Selecciona una fecha"),
});
type GastoForm = z.infer<typeof schema>;

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, loading,
}: {
  label: string;
  value: string;
  icon: IconDefinition;
  color: string;
  loading: boolean;
}) {
  const textColor = color.split(' ').find(c => c.startsWith('text-')) || 'text-muted-foreground';
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1 overflow-hidden transition-all hover:border-primary/50 min-w-[130px]">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <FaIcon icon={icon} size={13} className={`shrink-0 ${textColor}`} />
        <span className="truncate">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-20" />
      ) : (
        <p className="font-bold font-mono text-lg tracking-tight truncate" title={value}>{value}</p>
      )}
    </div>
  );
}

// ── Gastos Table ──────────────────────────────────────────────────────────────

function GastosTab() {
  const { org, role, userId, formatCurrency, currencySymbol } = useOrganization();
  const { data: gastos = [], isLoading } = useGastos({ role, userId });
  const createMutation = useCreateGasto();
  const updateMutation = useUpdateGasto();
  const deleteMutation = useDeleteGasto();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);
  const [category, setCategory] = useState("Otros");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<GastoForm>({
    resolver: zodResolver(schema),
    defaultValues: { expense_date: new Date().toISOString().slice(0, 10) },
  });

  const openCreate = () => {
    setEditing(null);
    setCategory("Otros");
    reset({ expense_date: new Date().toISOString().slice(0, 10), category: "Otros" });
    setDialogOpen(true);
  };

  const openEdit = (g: ExpenseRow) => {
    setEditing(g);
    setCategory(g.category ?? "Otros");
    reset({
      category: g.category ?? "Otros",
      description: g.description,
      amount: g.amount,
      expense_date: g.expense_date,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: GastoForm) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...values });
      } else {
        const { data: { user } } = await (await import("@/lib/supabase/client")).createClient().auth.getUser();
        await createMutation.mutateAsync({
          ...values,
          organization_id: org?.id ?? "",
          created_by:      user?.id ?? null,
        });
      }
      setDialogOpen(false);
    } catch {
      // error already shown via onError toast in mutation
    }
  };

  const columns: DataColumn<ExpenseRow>[] = [
    {
      key: "description",
      header: "Gasto",
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.description}</p>
          <p className="text-xs text-muted-foreground">{row.category}</p>
        </div>
      ),
    },
    {
      key: "expense_date",
      header: "Fecha",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.expense_date + "T00:00:00"), "dd MMM yyyy", { locale: es })}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Monto",
      cell: (row) => (
        <span className="font-mono text-sm font-semibold">
          {formatCurrency(Number(row.amount))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2"><FaIcon icon={faPlus} size={14} /> Registrar Gasto</Button>
      </div>
      <DataTable
        data={gastos}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Buscar por descripción, categoría..."
        searchKeys={["description", "category"]}
        emptyMessage="Sin gastos registrados"
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(row)}>
              <FaIcon icon={faPencil} size={12} />
            </Button>
            <Button variant="ghost" size="icon" className="size-7 hover:text-destructive" onClick={() => setDeleteTarget(row)}>
              <FaIcon icon={faTrash} size={12} />
            </Button>
          </div>
        )}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setValue("category", v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Input placeholder="Pago de alquiler local" {...register("description")} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Monto ({currencySymbol}) *</Label>
                <Input type="number" step="0.01" min={0} {...register("amount", { valueAsNumber: true })} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" {...register("expense_date")} />
                {errors.expense_date && <p className="text-xs text-destructive">{errors.expense_date.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Guardar" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará &quot;<strong>{deleteTarget?.description}</strong>&quot;.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FinanzasPage() {
  const { formatCurrency, role } = useOrganization();
  const isAdmin = role === "admin" || role === "superadmin";

  // Selector de periodo
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo,   setRangeTo]   = useState(today);

  const refMonth = subMonths(new Date(), monthOffset);
  const dateRange: DateRange = rangeMode
    ? {
        start: startOfDay(new Date(rangeFrom + "T00:00:00")).toISOString(),
        end:   endOfDay(new Date(rangeTo + "T00:00:00")).toISOString(),
      }
    : {
        start: startOfMonth(refMonth).toISOString(),
        end:   endOfMonth(refMonth).toISOString(),
      };

  const periodLabel = rangeMode
    ? `${rangeFrom} → ${rangeTo}`
    : format(refMonth, "MMMM yyyy", { locale: es });

  const { data: stats, isLoading: loadingStats } = useFinanzasStats(dateRange);

  const fmt = formatCurrency;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FaIcon icon={faDollarSign} size={18} /> Finanzas
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{periodLabel}</p>
      </div>

      {/* Selector de periodo */}
      <div className="flex items-center gap-2 flex-wrap">
        {rangeMode ? (
          <div className="flex items-center gap-2 border border-primary/30 bg-primary/5 rounded-lg px-2 py-1.5">
            <FaIcon icon={faCalendarDays} size={12} className="text-primary shrink-0" />
            <input type="date" value={rangeFrom} max={rangeTo}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-foreground w-[108px]" />
            <span className="text-xs text-muted-foreground">→</span>
            <input type="date" value={rangeTo} min={rangeFrom}
              onChange={(e) => setRangeTo(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-foreground w-[108px]" />
            <button onClick={() => setRangeMode(false)} className="text-muted-foreground hover:text-foreground ml-1">
              <FaIcon icon={faXmark} size={12} />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => { setRangeMode(true); setRangeFrom(today); setRangeTo(today); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <FaIcon icon={faCalendarDays} size={12} /> Rango
            </button>
            <div className="flex items-center gap-1.5 border border-border rounded-lg px-2 py-1">
              <button className="size-7 flex items-center justify-center hover:text-foreground text-muted-foreground"
                onClick={() => setMonthOffset((m) => m + 1)}>
                <FaIcon icon={faChevronRight} size={12} className="rotate-180" />
              </button>
              <span className="text-xs font-medium capitalize min-w-[90px] text-center">
                <FaIcon icon={faCalendar} size={11} className="inline mr-1 opacity-60" />
                {monthOffset === 0 ? "Este mes" : format(refMonth, "MMM yyyy", { locale: es })}
              </span>
              <button
                className="size-7 flex items-center justify-center hover:text-foreground text-muted-foreground disabled:opacity-30"
                onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
                disabled={monthOffset === 0}>
                <FaIcon icon={faChevronRight} size={12} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Stats: admins ven todo, técnicos solo sus gastos */}
      {isAdmin ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Ingresos del mes" value={fmt(stats?.totalIngresos ?? 0)} icon={faArrowTrendUp}    color="bg-emerald-500/20 text-emerald-400" loading={loadingStats} />
          <StatCard label="Gastos del mes"   value={fmt(stats?.totalGastos   ?? 0)} icon={faArrowTrendDown} color="bg-red-500/20 text-red-400"           loading={loadingStats} />
          <StatCard label="Utilidad neta"    value={fmt(stats?.utilidad      ?? 0)} icon={faDollarSign}     color={`${(stats?.utilidad ?? 0) >= 0 ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`} loading={loadingStats} />
          <StatCard label="Por cobrar"       value={fmt(stats?.porCobrar     ?? 0)} icon={faClock}          color="bg-amber-500/20 text-amber-400"       loading={loadingStats} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm">
          <StatCard label="Mis gastos del mes" value={fmt(stats?.totalGastos ?? 0)} icon={faArrowTrendDown} color="bg-red-500/20 text-red-400" loading={loadingStats} />
        </div>
      )}

      {/* Content tabs */}
      <Tabs defaultValue="gastos">
        <TabsList className="max-w-xs">
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
        </TabsList>
        <TabsContent value="gastos" className="mt-4">
          <GastosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

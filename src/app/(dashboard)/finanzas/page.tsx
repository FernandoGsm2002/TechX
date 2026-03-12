"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  TrendingUp, TrendingDown, DollarSign, Clock, Plus, Pencil, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  type ExpenseRow,
} from "@/hooks/useGastos";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  label, value, icon: Icon, color, loading,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  loading: boolean;
}) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`flex size-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className="text-2xl font-bold font-mono">{value}</p>
        )}
      </CardContent>
    </Card>
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
    setCategory(g.category);
    reset({
      category: g.category,
      description: g.description,
      amount: g.amount,
      expense_date: g.expense_date,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: GastoForm) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...values });
    } else {
      const { data: { user } } = await (await import("@/lib/supabase/client")).createClient().auth.getUser();
      await createMutation.mutateAsync({
        ...values,
        organization_id: org?.id ?? "",
        created_by: user?.id ?? null,
      });
    }
    setDialogOpen(false);
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
        <Button onClick={openCreate} className="gap-2"><Plus className="size-4" /> Registrar Gasto</Button>
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
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7 hover:text-destructive" onClick={() => setDeleteTarget(row)}>
              <Trash2 className="size-3.5" />
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
            <AlertDialogDescription>Se eliminará "<strong>{deleteTarget?.description}</strong>".</AlertDialogDescription>
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
  const { org, formatCurrency } = useOrganization();
  const { data: stats, isLoading: loadingStats } = useFinanzasStats();

  const fmt = formatCurrency;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="size-5" /> Finanzas
        </h1>
        <p className="text-sm text-muted-foreground">Resumen del mes actual</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Ingresos del mes" value={fmt(stats?.totalIngresos ?? 0)} icon={TrendingUp} color="bg-emerald-500/20 text-emerald-400" loading={loadingStats} />
        <StatCard label="Gastos del mes" value={fmt(stats?.totalGastos ?? 0)} icon={TrendingDown} color="bg-red-500/20 text-red-400" loading={loadingStats} />
        <StatCard label="Utilidad neta" value={fmt(stats?.utilidad ?? 0)} icon={DollarSign} color={`${(stats?.utilidad ?? 0) >= 0 ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`} loading={loadingStats} />
        <StatCard label="Por cobrar" value={fmt(stats?.porCobrar ?? 0)} icon={Clock} color="bg-amber-500/20 text-amber-400" loading={loadingStats} />
      </div>

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

"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  faArrowTrendDown, faDollarSign, faPlus, faPenToSquare, faTrash,
  faMagnifyingGlass, faReceipt, faTag, faXmark, faCreditCard, faWallet,
  faBuilding, faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { createClient } from "@/lib/supabase/client";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Alquiler", "Servicios", "Materiales", "Repuestos",
  "Equipos", "Sueldos", "Marketing", "Transporte", "Otros",
];

const PAYMENT_METHODS = [
  { value: "efectivo",      label: "Efectivo",       icon: faWallet },
  { value: "transferencia", label: "Transferencia",  icon: faBuilding },
  { value: "tarjeta",       label: "Tarjeta",         icon: faCreditCard },
] as { value: string; label: string; icon: IconDefinition }[];

const CAT_COLORS: Record<string, string> = {
  Alquiler:    "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Servicios:   "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Materiales:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Repuestos:   "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Equipos:     "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Sueldos:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Marketing:   "bg-pink-500/15 text-pink-400 border-pink-500/30",
  Transporte:  "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Otros:       "bg-muted/50 text-muted-foreground border-border",
};

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  category:       z.string().min(1, "Selecciona una categoría"),
  description:    z.string().min(2, "Mín. 2 caracteres"),
  amount:         z.number().min(0.01, "El monto debe ser mayor a 0"),
  expense_date:   z.string().min(1, "Selecciona una fecha"),
  payment_method: z.string().min(1),
  notes:          z.string().optional(),
});
type GastoForm = z.infer<typeof schema>;

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, colorClass, loading }: {
  label: string; value: string; sub?: string;
  icon: IconDefinition; colorClass: string; loading: boolean;
}) {
  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`flex size-8 items-center justify-center rounded-lg ${colorClass}`}>
          <FaIcon icon={icon} size={14} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-28" /> : (
          <>
            <p className="text-2xl font-bold font-mono">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GastosPage() {
  const { formatCurrency, currencySymbol, org, role, userId } = useOrganization();
  const isAdmin = role === "admin" || role === "superadmin";
  const { data: gastos = [], isLoading } = useGastos({ role, userId });
  const { data: stats, isLoading: loadingStats } = useFinanzasStats();
  const createMutation = useCreateGasto();
  const updateMutation = useUpdateGasto();
  const deleteMutation = useDeleteGasto();

  const [search,          setSearch]          = useState("");
  const [activeCategory,  setActiveCategory]  = useState<string | null>(null);
  const [dialogOpen,      setDialogOpen]      = useState(false);
  const [editing,         setEditing]         = useState<ExpenseRow | null>(null);
  const [deleteTarget,    setDeleteTarget]    = useState<ExpenseRow | null>(null);
  const [category,        setCategory]        = useState("Otros");
  const [paymentMethod,   setPaymentMethod]   = useState("efectivo");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<GastoForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      expense_date:   new Date().toISOString().slice(0, 10),
      payment_method: "efectivo",
    },
  });

  const openCreate = () => {
    setEditing(null);
    setCategory("Otros");
    setPaymentMethod("efectivo");
    reset({
      expense_date:   new Date().toISOString().slice(0, 10),
      category:       "Otros",
      payment_method: "efectivo",
    });
    setDialogOpen(true);
  };

  const openEdit = (g: ExpenseRow) => {
    setEditing(g);
    setCategory(g.category);
    setPaymentMethod((g as ExpenseRow & { payment_method?: string }).payment_method ?? "efectivo");
    reset({
      category:       g.category,
      description:    g.description,
      amount:         g.amount,
      expense_date:   g.expense_date,
      payment_method: (g as ExpenseRow & { payment_method?: string }).payment_method ?? "efectivo",
      notes:          (g as ExpenseRow & { notes?: string }).notes ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: GastoForm) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...values });
    } else {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await createMutation.mutateAsync({
        ...values,
        organization_id: org?.id ?? "",
        created_by:      user?.id ?? null,
      });
    }
    setDialogOpen(false);
  };

  // Category chips from actual data
  const usedCategories = useMemo(() => {
    const set = new Set(gastos.map((g) => g.category));
    return CATEGORIES.filter((c) => set.has(c));
  }, [gastos]);

  // Filtered list
  const filtered = useMemo(() => {
    let result = gastos;
    if (activeCategory) result = result.filter((g) => g.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((g) =>
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [gastos, search, activeCategory]);

  // Month totals
  const now     = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();
  const monthGastos = gastos.filter((g) => {
    const d = new Date(g.expense_date + "T00:00:00");
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const totalMes = monthGastos.reduce((s, g) => s + Number(g.amount), 0);

  // By category this month
  const byCategory = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = monthGastos.filter((g) => g.category === cat).reduce((s, g) => s + Number(g.amount), 0);
    return acc;
  }, {});
  const topCategory = Object.entries(byCategory).sort(([, a], [, b]) => b - a).find(([, v]) => v > 0);

  const fmt = formatCurrency;

  const columns: DataColumn<ExpenseRow>[] = [
    {
      key: "description",
      header: "Gasto",
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.description}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${CAT_COLORS[row.category] ?? CAT_COLORS["Otros"]}`}>
              {row.category}
            </Badge>
            {(row as ExpenseRow & { payment_method?: string }).payment_method && (
              <span className="text-[10px] text-muted-foreground capitalize">
                {(row as ExpenseRow & { payment_method?: string }).payment_method}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "expense_date",
      header: "Fecha",
      className: "hidden sm:table-cell",
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
        <span className="font-mono text-sm font-semibold text-red-400">
          − {fmt(Number(row.amount))}
        </span>
      ),
    },
    ...(isAdmin ? [{
      key: "created_by_name",
      header: "Registrado por",
      className: "hidden md:table-cell",
      cell: (row: ExpenseRow) => row.created_by_name
        ? <span className="text-xs bg-blue-500/10 text-blue-400 rounded px-1.5 py-0.5">{row.created_by_name}</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    } as DataColumn<ExpenseRow>] : []),
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FaIcon icon={faArrowTrendDown} size={18} className="text-red-400" /> Gastos
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Registro de egresos del negocio" : "Tus gastos registrados"}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <FaIcon icon={faPlus} size={14} /> Registrar gasto
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Gastos del mes"
          value={fmt(totalMes)}
          sub={`${monthGastos.length} registros`}
          icon={faArrowTrendDown}
          colorClass="bg-red-500/20 text-red-400"
          loading={false}
        />
        <StatCard
          label="Utilidad neta"
          value={fmt(stats?.utilidad ?? 0)}
          sub="ingresos − gastos"
          icon={faDollarSign}
          colorClass={(stats?.utilidad ?? 0) >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}
          loading={loadingStats}
        />
        <StatCard
          label={`Mayor gasto: ${topCategory?.[0] ?? "—"}`}
          value={topCategory ? fmt(topCategory[1]) : "—"}
          sub="categoría del mes"
          icon={faTag}
          colorClass="bg-amber-500/20 text-amber-400"
          loading={false}
        />
      </div>

      {/* ── Filter chips ── */}
      {usedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${
              activeCategory === null
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            Todos <span className="opacity-70 ml-1">{gastos.length}</span>
          </button>
          {usedCategories.map((cat) => {
            const count = gastos.filter((g) => g.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : `${CAT_COLORS[cat] ?? CAT_COLORS["Otros"]} hover:border-primary/50`
                }`}
              >
                {cat} <span className="opacity-70">{count}</span>
                {activeCategory === cat && <FaIcon icon={faXmark} size={11} />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <FaIcon icon={faMagnifyingGlass} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por descripción o categoría…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Table ── */}
      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder=""
        searchKeys={[]}
        emptyMessage={search || activeCategory ? "Sin resultados" : "Sin gastos registrados aún"}
        emptyIcon={<FaIcon icon={faReceipt} size={28} className="opacity-30" />}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(row)}>
              <FaIcon icon={faPenToSquare} size={13} />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="size-7 hover:text-destructive"
              onClick={() => setDeleteTarget(row)}
            >
              <FaIcon icon={faTrash} size={13} />
            </Button>
          </div>
        )}
      />

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaIcon icon={faReceipt} size={14} className="text-red-400" />
              {editing ? "Editar Gasto" : "Registrar Gasto"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Categoría */}
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setValue("category", v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block size-2 rounded-full ${CAT_COLORS[c]?.split(" ")[0]?.replace("/15", "/60") ?? ""}`} />
                        {c}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Input placeholder="Ej: Pago alquiler local, Compra materiales…" {...register("description")} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            {/* Monto + Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Monto ({currencySymbol}) *</Label>
                <Input type="number" step="0.01" min={0} placeholder="0.00"
                  {...register("amount", { valueAsNumber: true })} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" {...register("expense_date")} />
                {errors.expense_date && <p className="text-xs text-destructive">{errors.expense_date.message}</p>}
              </div>
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setPaymentMethod(value); setValue("payment_method", value); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                      paymentMethod === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <FaIcon icon={icon} size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Input placeholder="Observaciones adicionales…" {...register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                className="gap-2">
                {createMutation.isPending || updateMutation.isPending ? "Guardando…" : editing ? "Guardar cambios" : "Registrar gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FaIcon icon={faTriangleExclamation} size={14} className="text-destructive" /> ¿Eliminar gasto?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>"{deleteTarget?.description}"</strong> por{" "}
              <strong>{deleteTarget ? fmt(Number(deleteTarget.amount)) : ""}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

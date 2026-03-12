"use client";

import React, { useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  faPlus, faBox, faPenToSquare, faTrash, faTriangleExclamation,
  faCartShopping, faScrewdriverWrench, faBarcode, faMagnifyingGlass, faXmark,
  faChartLine, faArrowTrendUp, faDollarSign, faLayerGroup, faTableList, faGrip, faHistory,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { LowStockAlert } from "@/components/ui-custom/LowStockAlert";
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
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import {
  useInventario, useCreateInventario, useUpdateInventario, useDeleteInventario,
} from "@/hooks/useInventario";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { InventoryCondition } from "@/types/domain";
import { InventoryImportDialog } from "@/components/ui-custom/InventoryImportDialog";
import { StockAdjustDialog }    from "@/components/ui-custom/StockAdjustDialog";
import { ImageUploader }        from "@/components/ui-custom/ImageUploader";
import { InventoryMovementsDrawer } from "@/components/ui-custom/InventoryMovementsDrawer";

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemType = "producto" | "repuesto_propio" | "repuesto_comprado";

interface InventoryRow {
  id:              string;
  name:            string;
  brand:           string | null;
  model:           string | null;
  category:        string | null;  // tipo libre: "Batería", "Pantalla", etc.
  sku:             string | null;
  condition:       InventoryCondition | null;
  quantity:        number;
  cost_price:      number | null;
  sell_price:      number | null;
  notes:           string | null;
  organization_id: string;
  item_type:       ItemType;
  image_url:       string | null;
  min_stock:       number;
}

// ── Section meta ──────────────────────────────────────────────────────────────

const SECTION_META: Record<ItemType, { title: string; icon: React.ReactNode; empty: string }> = {
  producto: {
    title: "Productos",
    icon:  <FaIcon icon={faCartShopping} size={18} />,
    empty: "Sin productos. Agrega cargadores, fundas, accesorios...",
  },
  repuesto_propio: {
    title: "Repuestos Propios",
    icon:  <FaIcon icon={faScrewdriverWrench} size={18} />,
    empty: "Sin repuestos propios. Agrega pantallas, baterías de tu stock...",
  },
  repuesto_comprado: {
    title: "Repuestos",
    icon:  <FaIcon icon={faBox} size={18} />,
    empty: "Sin repuestos. Agrega piezas adquiridas para reparaciones...",
  },
};

const LOW_STOCK = 5;

// ── Zod schemas ───────────────────────────────────────────────────────────────

const baseSchema = {
  brand:      z.string().min(1, "Ingresa la marca"),
  name:       z.string().min(2, "Mínimo 2 caracteres"),
  model:      z.string().optional(),
  category:   z.string().optional(),
  sku:        z.string().optional(),
  quantity:   z.number().min(0),
  cost_price: z.number().min(0).optional(),
  sell_price: z.number().min(0).optional(),
};

const schemaWithCondition    = z.object({ ...baseSchema, condition: z.enum(["nuevo", "usado"]) });
const schemaWithoutCondition = z.object(baseSchema);

type FormWithCondition    = z.infer<typeof schemaWithCondition>;
type FormWithoutCondition = z.infer<typeof schemaWithoutCondition>;
type AnyItemForm = FormWithCondition | FormWithoutCondition;

// ── Condition badge ───────────────────────────────────────────────────────────

function ConditionBadge({ condition }: { condition: InventoryCondition | null }) {
  if (!condition) return null;
  return (
    <Badge variant="outline" className={
      condition === "nuevo"
        ? "text-xs bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
        : "text-xs bg-amber-500/20 text-amber-300 border-amber-500/30"
    }>
      {condition === "nuevo" ? "Nuevo" : "Usado"}
    </Badge>
  );
}

// ── Item Dialog ───────────────────────────────────────────────────────────────

interface DialogProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  editing:      InventoryRow | null;
  itemType:     ItemType;
  categories:   string[];
  onSave:       (values: AnyItemForm, imageUrl: string | null) => Promise<void>;
  isSaving:     boolean;
}

function ItemDialog({ open, onOpenChange, editing, itemType, categories, onSave, isSaving }: DialogProps) {
  const { currencySymbol } = useOrganization();
  const [condition, setCondition] = useState<"nuevo" | "usado">("nuevo");
  const [imageUrl,  setImageUrl]  = useState<string | null>(null);
  const needsCondition = itemType === "repuesto_propio";

  const schema = needsCondition ? schemaWithCondition : schemaWithoutCondition;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AnyItemForm>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 0 },
  });

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      const cond = (editing.condition as "nuevo" | "usado") ?? "nuevo";
      setCondition(cond);
      setImageUrl(editing.image_url ?? null);
      reset({
        brand:      editing.brand    ?? "",
        name:       editing.name     ?? "",
        model:      editing.model    ?? "",
        category:   editing.category ?? "",
        sku:        editing.sku      ?? "",
        quantity:   editing.quantity,
        cost_price: editing.cost_price ?? undefined,
        sell_price: editing.sell_price ?? undefined,
        ...(needsCondition ? { condition: cond } : {}),
      } as AnyItemForm);
    } else {
      setCondition("nuevo");
      setImageUrl(null);
      reset({
        quantity: 0,
        ...(needsCondition ? { condition: "nuevo" } : {}),
      } as AnyItemForm);
    }
  }, [open, editing, needsCondition, reset]);

  const onSubmit = handleSubmit((values) => onSave(values, imageUrl));
  const es = errors as Record<string, { message?: string }>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar" : "Nuevo"} {SECTION_META[itemType].title.replace("s", "")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5 py-1">
          {/* ── 2-col layout: image left + fields right ── */}
          <div className="flex gap-5">

            {/* Image upload column */}
            <div className="space-y-1.5 shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Imagen <span className="text-muted-foreground/50 normal-case font-normal">(opcional)</span>
              </p>
              <ImageUploader
                value={imageUrl}
                onChange={setImageUrl}
                bucket="inventory-images"
                folder="items"
                className="w-36 h-36"
              />
            </div>

            {/* Fields column */}
            <div className="flex-1 min-w-0 space-y-3">

            {/* Marca + Modelo */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input {...register("brand")} placeholder="Samsung, Apple, Genérico..." />
                  {es.brand?.message && <p className="text-xs text-destructive">{es.brand.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Modelo compatible <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                  <Input {...register("model")} placeholder="A54, iPhone 14..." />
                </div>
              </div>

              {/* Nombre / Descripción */}
              <div className="space-y-2">
                <Label>Nombre / Descripción *</Label>
                <Input {...register("name")} placeholder={
                  itemType === "producto"
                    ? "Cargador USB-C 65W, Funda silicona negra..."
                    : "Pantalla OLED, Batería 5000 mAh, Pin de carga..."
                } />
                {es.name?.message && <p className="text-xs text-destructive">{es.name.message}</p>}
              </div>

              {/* Tipo / Categoría + SKU */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>
                    Tipo <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    {...register("category")}
                    list="category-suggestions"
                    placeholder="Batería, Pantalla, Cargador..."
                  />
                  <datalist id="category-suggestions">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <FaIcon icon={faBarcode} size={13} /> SKU / Código
                  </Label>
                  <Input {...register("sku")} placeholder="Escanea o escribe" />
                  <p className="text-[10px] text-muted-foreground">Compatible con lector de barras</p>
                </div>
              </div>
            </div> {/* end fields column */}
          </div> {/* end 2-col flex */}

          {/* ── Condición — solo Repuesto Propio ── */}
          {needsCondition && (
            <div className="space-y-2">
              <Label>Condición *</Label>
              <div className="flex gap-2">
                {(["nuevo", "usado"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCondition(c); setValue("condition" as never, c as never); }}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all capitalize ${
                      condition === c
                        ? c === "nuevo"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Stock y precios ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Stock y precios
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" min={0} {...register("quantity", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Precio compra ({currencySymbol})</Label>
                <Input type="number" step="0.01" min={0} placeholder="0.00"
                  {...register("cost_price", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Precio venta ({currencySymbol})</Label>
                <Input type="number" step="0.01" min={0} placeholder="0.00"
                  {...register("sell_price", { valueAsNumber: true })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Inventory Section ─────────────────────────────────────────────────────────

function InventorySection({ itemType }: { itemType: ItemType }) {
  const meta = SECTION_META[itemType];
  const { data: rawItems = [], isLoading } = useInventario();
  const items = (rawItems as unknown as InventoryRow[]).filter((i) => i.item_type === itemType);
  const { org, currencySymbol, role, formatCurrency } = useOrganization();
  const isAdmin = role === "admin" || role === "superadmin";
  const createMutation = useCreateInventario();
  const updateMutation = useUpdateInventario();
  const deleteMutation = useDeleteInventario();

  const [search,        setSearch]        = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [editing,       setEditing]       = useState<InventoryRow | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<InventoryRow | null>(null);
  const [importOpen,    setImportOpen]    = useState(false);
  const [adjustOpen,    setAdjustOpen]    = useState(false);
  const [historyOpen,   setHistoryOpen]   = useState(false);
  const [historyItem,   setHistoryItem]   = useState<{ id: string; name: string } | null>(null);
  const [viewMode,      setViewMode]      = useState<"list" | "grid">("list");

  // Unique categories from existing items (sorted, excluding null)
  const categories = useMemo<string[]>(() => {
    const set = new Set<string>();
    items.forEach((i) => { if (i.category) set.add(i.category); });
    return Array.from(set).sort();
  }, [items]);

  // Filtered items
  const filtered = useMemo(() => {
    let result = items;
    if (activeCategory) result = result.filter((i) => i.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        (i.brand ?? "").toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        (i.model ?? "").toLowerCase().includes(q) ||
        (i.sku ?? "").toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, search, activeCategory]);

  const lowStock = items.filter((i) => i.quantity <= LOW_STOCK);
  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit   = (item: InventoryRow) => { setEditing(item); setDialogOpen(true); };

  const onSave = useCallback(async (values: AnyItemForm, imageUrl: string | null) => {
    const v = values as FormWithCondition;
    const payload = {
      name:       v.name.trim(),
      brand:      v.brand.trim()           || null,
      model:      (v.model  ?? "").trim()  || null,
      category:   (v.category ?? "").trim() || null,
      sku:        (v.sku    ?? "").trim()  || null,
      quantity:   v.quantity,
      cost_price: isNaN(v.cost_price!) ? null : (v.cost_price ?? null),
      sell_price: isNaN(v.sell_price!) ? null : (v.sell_price ?? null),
      item_type:  itemType,
      condition:  (v as FormWithCondition).condition ?? "nuevo",
      notes:      null,
      image_url:  imageUrl,
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...payload } as Parameters<typeof updateMutation.mutateAsync>[0]);
    } else {
      await createMutation.mutateAsync({
        ...payload, organization_id: org?.id ?? "",
      } as Parameters<typeof createMutation.mutateAsync>[0]);
    }
    setDialogOpen(false);
  }, [editing, itemType, org?.id, createMutation, updateMutation]);


  const columns: DataColumn<InventoryRow>[] = [
    {
      key: "name",
      header: "Item",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          <div className="shrink-0 size-10 rounded-lg overflow-hidden border border-border/40 bg-muted/30">
            {row.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.image_url}
                alt={row.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                <FaIcon icon={faBox} size={16} />
              </div>
            )}
          </div>

          {/* Text */}
          <div>
            <p className="font-medium text-sm">
              {[row.brand, row.name].filter(Boolean).join(" ")}
            </p>
            {row.model && (
              <p className="text-xs text-muted-foreground">Para: {row.model}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              {row.category && (
                <span className="text-[10px] bg-primary/10 text-primary/80 px-1.5 py-0.5 rounded-md">
                  {row.category}
                </span>
              )}
              {row.sku && (
                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
                  <FaIcon icon={faBarcode} size={9} /> {row.sku}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },

    // Solo en Repuestos Propios
    ...(itemType === "repuesto_propio" ? [{
      key: "condition" as keyof InventoryRow,
      header: "Condicion",
      cell: (row: InventoryRow) => <ConditionBadge condition={row.condition} />,
    }] : []),
    {
      key: "quantity",
      header: "Stock",
      cell: (row) => {
        const isLow = row.quantity <= (row.min_stock ?? LOW_STOCK);
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold text-sm ${row.quantity === 0 ? "text-red-400" : isLow ? "text-amber-400" : ""}`}>
                {row.quantity}
              </span>
              {isLow && <FaIcon icon={faTriangleExclamation} size={13} className={row.quantity === 0 ? "text-red-400" : "text-amber-400"} />}
            </div>
            {row.min_stock != null && (
              <p className="text-[9px] text-muted-foreground/50 font-mono">mín.{row.min_stock}</p>
            )}
          </div>
        );
      },
    },
    // columna precio de compra: SOLO admins
    ...(isAdmin ? [{
      key: "cost_price" as keyof InventoryRow,
      header: "Compra",
      className: "hidden md:table-cell",
      cell: (row: InventoryRow) => row.cost_price != null
        ? <span className="font-mono text-xs text-muted-foreground">{formatCurrency(row.cost_price)}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    }] : []),
    {
      key: "sell_price",
      header: "Precio venta",
      cell: (row) => row.sell_price != null
        ? <span className="font-mono text-sm font-medium">{formatCurrency(row.sell_price)}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
  ];

  // ── Admin KPI metrics ─────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (!isAdmin) return null;
    const itemsWithBoth = items.filter(i => i.cost_price != null && i.sell_price != null);
    const totalCostValue  = items.reduce((s, i) => s + (i.cost_price ?? 0) * i.quantity, 0);
    const totalSellValue  = items.reduce((s, i) => s + (i.sell_price ?? 0) * i.quantity, 0);
    const expectedProfit  = itemsWithBoth.reduce((s, i) => s + ((i.sell_price! - i.cost_price!) * i.quantity), 0);
    const avgMargin = itemsWithBoth.length > 0
      ? itemsWithBoth.reduce((s, i) => s + ((i.sell_price! - i.cost_price!) / i.cost_price!) * 100, 0) / itemsWithBoth.length
      : 0;
    const noPriceSell = items.filter(i => i.sell_price == null).length;
    return { totalCostValue, totalSellValue, expectedProfit, avgMargin, noPriceSell };
  }, [items, isAdmin]);

  return (
    <div className="space-y-4">

      {/* ── KPI Cards (Admin only) ── */}
      {isAdmin && kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Valor en stock (costo) */}
          <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <FaIcon icon={faLayerGroup} size={11} /> Valor en stock
            </div>
            <p className="font-bold font-mono text-lg">
              {formatCurrency(kpi.totalCostValue)}
            </p>
            <p className="text-[10px] text-muted-foreground">Al precio de compra</p>
          </div>

          {/* Valor de venta potencial */}
          <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <FaIcon icon={faDollarSign} size={11} /> Valor de venta
            </div>
            <p className="font-bold font-mono text-lg text-primary">
              {formatCurrency(kpi.totalSellValue)}
            </p>
            <p className="text-[10px] text-muted-foreground">Si se vende todo el stock</p>
          </div>

          {/* Ganancia esperada */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <FaIcon icon={faArrowTrendUp} size={11} /> Ganancia esperada
            </div>
            <p className="font-bold font-mono text-lg text-emerald-400">
              {formatCurrency(kpi.expectedProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Margen prom. {kpi.avgMargin.toFixed(1)}%
            </p>
          </div>

          {/* Items sin precio de venta */}
          <div className={`rounded-xl border p-3.5 space-y-1 ${
            kpi.noPriceSell > 0
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-border/50 bg-card/60"
          }`}>
            <div className={`flex items-center gap-1.5 text-xs font-medium ${
              kpi.noPriceSell > 0 ? "text-amber-400" : "text-muted-foreground"
            }`}>
              <FaIcon icon={faChartLine} size={11} /> Sin precio venta
            </div>
            <p className={`font-bold font-mono text-lg ${
              kpi.noPriceSell > 0 ? "text-amber-400" : ""
            }`}>
              {kpi.noPriceSell}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {kpi.noPriceSell > 0 ? "Productos sin configurar" : "Todo configurado"}
            </p>
          </div>
        </div>
      )}

      {/* ── Header de sección ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {meta.icon} {meta.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} ítem{items.length !== 1 ? "s" : ""} en total
            {activeCategory && <> · tipo: <strong>{activeCategory}</strong></>}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {/* Historial de movimientos */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/50"
              onClick={() => { setHistoryItem(null); setHistoryOpen(true); }}
            >
              <FaIcon icon={faHistory} size={12} /> Historial
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50"
              onClick={() => setAdjustOpen(true)}
            >
              <FaIcon icon={faArrowTrendUp} size={12} className="rotate-90" /> Ajuste masivo
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
              onClick={() => setImportOpen(true)}
            >
              <FaIcon icon={faArrowTrendUp} size={12} /> Importar Excel
            </Button>
            <Button onClick={openCreate} className="gap-2 shrink-0">
              <FaIcon icon={faPlus} size={14} /> Agregar
            </Button>
          </div>
        )}
      </div>

      {/* ── Alerta stock bajo ── */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
          <FaIcon icon={faTriangleExclamation} size={14} className="shrink-0" />
          <span>
            <strong>{lowStock.length}</strong> ítem{lowStock.length !== 1 ? "s" : ""} con stock bajo (≤{LOW_STOCK})
          </span>
        </div>
      )}

      {/* ── Chips de tipo / categoría ── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${
              activeCategory === null
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            Todos
            <span className="ml-1.5 opacity-70">{items.length}</span>
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {cat}
                <span className="opacity-70">{count}</span>
                {activeCategory === cat && (
                  <FaIcon icon={faXmark} size={11} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── View toggle ── */}
      <div className="flex items-center justify-end">
        <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FaIcon icon={faTableList} size={11} /> Lista
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FaIcon icon={faGrip} size={11} /> Cuadrícula
          </button>
        </div>
      </div>

      {/* ── Buscador ── */}
      <div className="relative">
        <FaIcon icon={faMagnifyingGlass} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por marca, nombre, modelo o SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Vista: Lista o Cuadrícula ── */}
      {viewMode === "list" ? (
        <DataTable
          data={filtered}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder=""
          searchKeys={[]}
          emptyMessage={
            search || activeCategory
              ? `Sin resultados${activeCategory ? ` en "${activeCategory}"` : ""}${search ? ` para "${search}"` : ""}`
              : meta.empty
          }
          emptyIcon={<FaIcon icon={faBox} size={28} className="opacity-30" />}
          actions={isAdmin ? (row) => (
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
          ) : undefined}
        />
      ) : (
        /* ── Grid view ── */
        isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/40 overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted/40" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted/40 rounded" />
                  <div className="h-2 bg-muted/30 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FaIcon icon={faBox} size={32} className="opacity-20" />
            <p className="text-sm">{meta.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((item) => {
              const isLow = item.quantity <= (item.min_stock ?? LOW_STOCK);
              return (
                <div
                  key={item.id}
                  className="group relative rounded-2xl border border-border/40 bg-card/50 overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
                >
                  {/* Image */}
                  <div className="aspect-square bg-muted/20 overflow-hidden relative">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/20">
                        <FaIcon icon={faBox} size={32} />
                        <span className="text-[10px]">{meta.title.replace("s","")}</span>
                      </div>
                    )}

                    {/* Low stock badge */}
                    {isLow && (
                      <div className={`absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        item.quantity === 0
                          ? "bg-red-500/90 text-white"
                          : "bg-amber-500/90 text-white"
                      }`}>
                        <FaIcon icon={faTriangleExclamation} size={8} />
                        {item.quantity === 0 ? "Agotado" : `×${item.quantity}`}
                      </div>
                    )}

                    {/* Actions overlay */}
                    {isAdmin && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={() => openEdit(item)}
                          className="flex size-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-colors"
                        >
                          <FaIcon icon={faPenToSquare} size={13} />
                        </button>
                        <button
                          onClick={() => { setHistoryItem({ id: item.id, name: [item.brand, item.name].filter(Boolean).join(" ") }); setHistoryOpen(true); }}
                          className="flex size-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-colors"
                        >
                          <FaIcon icon={faHistory} size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="flex size-8 items-center justify-center rounded-full bg-red-500/60 hover:bg-red-500/80 backdrop-blur-sm text-white transition-colors"
                        >
                          <FaIcon icon={faTrash} size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-3 space-y-1.5">
                    <p className="text-xs font-semibold leading-tight line-clamp-2">
                      {[item.brand, item.name].filter(Boolean).join(" ")}
                    </p>
                    {item.model && (
                      <p className="text-[10px] text-muted-foreground truncate">Para: {item.model}</p>
                    )}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold font-mono ${
                        item.quantity === 0 ? "text-red-400" : isLow ? "text-amber-400" : "text-foreground"
                      }`}>
                        {item.quantity} uds.
                      </span>
                      {item.sell_price != null && (
                        <span className="text-[10px] font-mono text-primary">
                          {formatCurrency(item.sell_price)}
                        </span>
                      )}
                    </div>
                    {item.category && (
                      <span className="text-[9px] bg-primary/10 text-primary/70 px-1.5 py-0.5 rounded-md inline-block">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Dialogs ── */}
      <InventoryMovementsDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        inventoryId={historyItem?.id}
        itemName={historyItem?.name}
      />
      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        itemType={itemType}
        categories={categories}
        onSave={onSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <InventoryImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />

      <StockAdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ítem?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará{" "}
              <strong>{[deleteTarget?.brand, deleteTarget?.name].filter(Boolean).join(" ")}</strong>{" "}
              del inventario. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main Page (inner — needs Suspense for useSearchParams) ───────────────────

function InventarioPageInner() {
  const searchParams = useSearchParams();

  // Determinar qué sección mostrar según el param del sidebar
  const tab = searchParams.get("tab") ?? "productos";
  const itemType: ItemType =
    tab === "rep_propios" ? "repuesto_propio"  :
    tab === "repuestos"   ? "repuesto_comprado" :
                            "producto";

  return (
    <div>
      <LowStockAlert />
      <InventorySection key={tab} itemType={itemType} />
    </div>
  );
}

// Wrapper con Suspense — requerido por Next.js cuando useSearchParams está
// en un componente que Next intenta pre-renderizar estáticamente
export default function InventarioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Cargando inventario…</div>}>
      <InventarioPageInner />
    </Suspense>
  );
}

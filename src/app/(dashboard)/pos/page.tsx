"use client";

import React, { useState, useMemo, useCallback } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCartShopping, faMagnifyingGlass, faPlus, faMinus, faTrash,
  faCreditCard, faWallet, faBuilding, faCircleCheck, faTriangleExclamation,
  faBox, faXmark, faReceipt, faTag, faChevronRight, faStore,
  faWrench, faBagShopping, faBoxOpen, faArrowTrendUp, faHandHoldingDollar,
  faClockRotateLeft, faPercent, faPrint, faBarcode, faBan,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { DocSelectorDialog, printReceipt, printReceiptA4, shareReceiptAsPdf, type ReceiptData } from "@/components/print/ReceiptPrint";
import { ClientCombobox } from "@/components/ui-custom/ClientCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import { useInventario } from "@/hooks/useInventario";
import { useClientes } from "@/hooks/useClientes";
import { useCreateSale, useSalesHistory, useVoidSale, type CartItem } from "@/hooks/usePOS";
import { useSaveReceipt, useReceiptBySale } from "@/hooks/useReceipts";
import { useOrganization } from "@/contexts/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

//Constants 

const LOW_STOCK = 5;

const PAYMENT_METHODS: { value: string; label: string; icon: IconDefinition }[] = [
  { value: "efectivo",      label: "Efectivo",      icon: faWallet },
  { value: "transferencia", label: "Transferencia", icon: faBuilding },
  { value: "tarjeta",       label: "Tarjeta",       icon: faCreditCard },
];

type ItemTypeFilter = "all" | "producto" | "repuesto_propio" | "repuesto_comprado";

const TYPE_TABS: { value: ItemTypeFilter; label: string; icon: IconDefinition }[] = [
  { value: "all",              label: "Todos",        icon: faBagShopping },
  { value: "producto",         label: "Productos",    icon: faCartShopping },
  { value: "repuesto_propio",  label: "Rep. Propios", icon: faWrench },
  { value: "repuesto_comprado",label: "Repuestos",    icon: faBox },
];

// ── Inventory row type ────────────────────────────────────────────────────────

interface InventoryRow {
  id:         string;
  name:       string;
  brand:      string | null;
  model:      string | null;
  category:   string | null;
  sku:        string | null;
  quantity:   number;
  sell_price: number | null;
  cost_price: number | null;
  item_type:  string;
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  cartQty,
  onAdd,
}: {
  product:  InventoryRow;
  cartQty:  number;
  onAdd:    (p: InventoryRow) => void;
}) {
  const { formatCurrency } = useOrganization();
  const outOfStock  = product.quantity === 0;
  const lowStock    = product.quantity > 0 && product.quantity <= LOW_STOCK;
  const displayName = [product.brand, product.name].filter(Boolean).join(" ");
  const price       = product.sell_price ?? 0;

  return (
    <button
      onClick={() => !outOfStock && price > 0 && onAdd(product)}
      disabled={outOfStock || price === 0}
      className={`
        relative flex flex-col text-left rounded-xl border p-3 gap-2 transition-all group
        ${outOfStock || price === 0
          ? "border-border/40 opacity-40 cursor-not-allowed bg-card/30"
          : "border-border/60 hover:border-primary/50 hover:bg-primary/5 active:scale-[.98] cursor-pointer bg-card/40"
        }
        ${cartQty > 0 ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20" : ""}
      `}
    >
      {/* Cart badge */}
      {cartQty > 0 && (
        <span className="absolute top-2 right-2 size-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {cartQty}
        </span>
      )}

      {/* Category + type chip */}
      <div className="flex flex-wrap gap-1">
        {product.category && (
          <span className="text-[10px] bg-primary/10 text-primary/80 px-1.5 py-0.5 rounded-md">
            {product.category}
          </span>
        )}
        {product.item_type !== "producto" && (
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
            {product.item_type === "repuesto_propio" ? "Rep. Propio" : "Repuesto"}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="flex-1">
        <p className="font-medium text-sm leading-tight line-clamp-2">{displayName}</p>
        {product.model && (
          <p className="text-[10px] text-muted-foreground mt-0.5">Para: {product.model}</p>
        )}
      </div>

      {/* Price + stock */}
      <div className="flex items-end justify-between gap-1">
        {price > 0 ? (
          <span className="font-mono font-bold text-base">
            {formatCurrency(price)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">Sin precio</span>
        )}
        <span className={`text-[10px] font-medium ${lowStock ? "text-amber-400" : "text-muted-foreground"}`}>
          {lowStock && <FaIcon icon={faTriangleExclamation} size={10} className="inline mr-0.5" />}
          {outOfStock ? "Sin stock" : `×${product.quantity}`}
        </span>
      </div>

      {/* Add hover overlay */}
      {!outOfStock && price > 0 && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <FaIcon icon={faPlus} size={24} className="text-primary" />
        </div>
      )}
    </button>
  );
}

// ── Cart Line ─────────────────────────────────────────────────────────────────

const DISCOUNT_PRESETS = [5, 10, 15, 20, 25, 50];

function CartLine({
  item,
  onInc,
  onDec,
  onRemove,
  onDiscount,
}: {
  item:       CartItem;
  onInc:      () => void;
  onDec:      () => void;
  onRemove:   () => void;
  onDiscount: (pct: number | null, customPrice: number | null) => void;
}) {
  const { formatCurrency } = useOrganization();
  const displayName   = [item.brand, item.name].filter(Boolean).join(" ");
  const effectivePrice = item.adjustedPrice ?? item.unit_price;
  const hasDiscount    = effectivePrice < item.unit_price;
  const [customPct,    setCustomPct]    = useState("");
  const [customPrice,  setCustomPrice]  = useState("");
  const [open,         setOpen]         = useState(false);

  const applyPct = (pct: number) => {
    onDiscount(pct, null);
    setOpen(false);
  };

  const applyCustom = () => {
    const pct = parseFloat(customPct);
    const px  = parseFloat(customPrice);
    if (!isNaN(pct) && pct >= 0 && pct <= 100) onDiscount(pct, null);
    else if (!isNaN(px) && px > 0) onDiscount(null, px);
    setOpen(false);
    setCustomPct("");
    setCustomPrice("");
  };

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{displayName}</p>
        <div className="flex items-center gap-1.5">
          {hasDiscount ? (
            <>
              <span className="text-xs text-muted-foreground font-mono line-through">
                {formatCurrency(item.unit_price)}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                {formatCurrency(effectivePrice)}
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded">
                -{item.discount}%
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground font-mono">
              {formatCurrency(item.unit_price)} × {item.quantity}
            </span>
          )}
        </div>
      </div>

      {/* Discount popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`size-6 flex items-center justify-center rounded-md border transition-colors shrink-0 ${
              hasDiscount
                ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            title="Aplicar descuento"
          >
            <FaIcon icon={faPercent} size={9} />
          </button>
        </PopoverTrigger>
        <PopoverContent side="left" className="w-52 p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Descuento rápido</p>
          <div className="grid grid-cols-3 gap-1">
            {DISCOUNT_PRESETS.map(p => (
              <button
                key={p}
                onClick={() => applyPct(p)}
                className={`text-xs py-1 rounded-md border transition-colors ${
                  item.discount === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Input
              placeholder="% personalizado"
              value={customPct}
              onChange={e => setCustomPct(e.target.value)}
              className="h-7 text-xs"
              type="number" min={0} max={100}
            />
            <Input
              placeholder="Precio final"
              value={customPrice}
              onChange={e => setCustomPrice(e.target.value)}
              className="h-7 text-xs font-mono"
              type="number" min={0}
            />
            <div className="flex gap-1">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={applyCustom}>Aplicar</Button>
              {hasDiscount && (
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { onDiscount(null, null); setOpen(false); }}>
                  <FaIcon icon={faXmark} size={10} />
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Qty controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onDec}
          className="size-6 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
        >
          <FaIcon icon={faMinus} size={10} />
        </button>
        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
        <button
          onClick={onInc}
          disabled={item.quantity >= item.stock}
          className="size-6 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FaIcon icon={faPlus} size={10} />
        </button>
      </div>

      {/* Subtotal */}
      <span className="font-mono text-sm font-semibold w-20 text-right shrink-0">
        {formatCurrency(effectivePrice * item.quantity)}
      </span>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
      >
        <FaIcon icon={faTrash} size={12} />
      </button>
    </div>
  );
}

// ── Sale History Row ──────────────────────────────────────────────────────────

interface SaleRow {
  id:              string;
  created_at:      string;
  paid_at?:        string | null;
  customer_name?:  string | null;
  payment_status:  string;
  payment_method:  string;
  total_amount:    number;
  voided_at?:      string | null;
  voided_by?:      string | null;
  void_reason?:    string | null;
  items:           { quantity: number }[];
}

function SaleHistoryRow({
  sale,
  formatCurrency,
  onReprint,
  onVoid,
  isAdmin,
}: {
  sale:           SaleRow;
  formatCurrency: (n: number) => string;
  onReprint:      (saleId: string) => void;
  onVoid:         (sale: SaleRow, reason: string) => void;
  isAdmin:        boolean;
}) {
  const timeStr = format(new Date(sale.created_at), "HH:mm", { locale: es });
  const dateStr = format(new Date(sale.created_at), "dd MMM", { locale: es });
  const itemCount = sale.items.reduce((s, i) => s + i.quantity, 0);

  const [voidReason, setVoidReason] = useState("");
  const isVoided = !!sale.voided_at;

  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-border/30 hover:bg-muted/20 transition-colors ${isVoided ? "opacity-60" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-medium truncate ${isVoided ? "line-through text-muted-foreground" : ""}`}>
            {sale.customer_name ?? "Venta directa"}
          </p>
          {isVoided ? (
            <Badge variant="outline" className="text-[10px] shrink-0 bg-red-500/10 text-red-500 border-red-500/20">
              Anulada
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 ${
                sale.payment_status === "pagado"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {sale.payment_status === "pagado" ? "Pagado" : "Fiado"}
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {dateStr} {timeStr} · {itemCount} ítem{itemCount !== 1 ? "s" : ""} · {sale.payment_method}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-mono text-sm font-bold ${isVoided ? "line-through text-muted-foreground" : ""}`}>
          {formatCurrency(sale.total_amount)}
        </span>
        {!isVoided && (
          <button
            onClick={() => onReprint(sale.id)}
            title="Re-imprimir comprobante"
            className="size-7 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <FaIcon icon={faPrint} size={12} />
          </button>
        )}
        {!isVoided && isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                title="Anular venta"
                className="size-7 flex items-center justify-center rounded-md border border-border hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              >
                <FaIcon icon={faBan} size={12} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Anular venta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se devolverá el stock de todos los ítems de esta venta.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-2">
                <Label className="text-xs mb-1 block">Motivo de anulación</Label>
                <Input 
                  value={voidReason} 
                  onChange={e => setVoidReason(e.target.value)}
                  placeholder="Ej: Error de cobro, devolución..."
                  className="text-sm"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setVoidReason("")}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  disabled={!voidReason.trim()}
                  onClick={() => onVoid(sale, voidReason)}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Anular Venta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function POSPage() {
  const { org, role, userId, formatCurrency, currencySymbol, taxTypeLabel, taxIdName } = useOrganization();
  const { data: rawInventory = [] } = useInventario();
  const createSale = useCreateSale();
  const voidSale   = useVoidSale();
  const { data: salesHistory = [], isLoading: loadingSales } = useSalesHistory({ role, userId });
  const { mutateAsync: saveReceipt } = useSaveReceipt();

  const inventory = rawInventory as unknown as InventoryRow[];

  // Only items that HAVE a sell_price > 0 (never show cost_price items in POS)
  const sellable = inventory.filter((i) => (i.sell_price ?? 0) > 0);

  // ── State ──
  const [search,         setSearch]         = useState("");
  const [typeFilter,     setTypeFilter]     = useState<ItemTypeFilter>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart,           setCart]           = useState<CartItem[]>([]);
  const [paymentStatus,  setPaymentStatus]  = useState("pagado");
  const [paymentMethod,  setPaymentMethod]  = useState("efectivo");
  const [customerName,   setCustomerName]   = useState("");
  const [customerId,     setCustomerId]     = useState("");
  const [notes,          setNotes]          = useState("");

  const { data: clientes = [] } = useClientes();
  const [confirmOpen,    setConfirmOpen]    = useState(false);
  const [docOpen,        setDocOpen]        = useState(false);  // receipt type dialog
  const [lastSaleTotal,  setLastSaleTotal]  = useState(0);
  const [lastSaleData, setLastSaleData] = useState<{
    saleId:       string;
    customerName: string;
    customerId:   string;
    guestPhone:   string;
    payMethod:    string;
    items: { name: string; brand: string | null; qty: number; unitPrice: number }[];
  } | null>(null);
  const [successOpen,    setSuccessOpen]    = useState(false);
  const [mobileTab,      setMobileTab]      = useState<"products" | "cart">("products");
  const [historyOpen,    setHistoryOpen]    = useState(false);
  const [reprintSaleId,  setReprintSaleId]  = useState<string | null>(null);
  // Client mode in cart
  const [clientMode,     setClientMode]     = useState<"registered" | "guest">("guest");

  const { data: reprintReceipt } = useReceiptBySale(reprintSaleId);

  // ── Derived ──
  const filtered = useMemo(() => {
    let result = sellable;
    if (typeFilter !== "all") result = result.filter((p) => p.item_type === typeFilter);
    if (activeCategory) result = result.filter((p) => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        (p.brand ?? "").toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [sellable, search, typeFilter, activeCategory]);

  const categories = useMemo(() => {
    const pool     = typeFilter === "all" ? sellable : sellable.filter((p) => p.item_type === typeFilter);
    const set      = new Set<string>();
    pool.forEach((p) => { if (p.category) set.add(p.category); });
    return Array.from(set).sort();
  }, [sellable, typeFilter]);

  // Reset category filter when type changes
  const changeType = (t: ItemTypeFilter) => {
    setTypeFilter(t);
    setActiveCategory(null);
  };

  const cartTotal = cart.reduce((s, i) => s + (i.adjustedPrice ?? i.unit_price) * i.quantity, 0);
  const cartCount  = cart.reduce((s, i) => s + i.quantity, 0);

  // ── Stats del dia ──
  const today = new Date().toISOString().slice(0, 10);
  const salesHoy = salesHistory.filter(s =>
    (s.paid_at ?? s.created_at)?.slice(0, 10) === today
  );
  const ventasHoy      = salesHoy.filter(s => s.payment_status === "pagado").length;
  const ingresoHoy     = salesHoy.filter(s => s.payment_status === "pagado")
    .reduce((sum, s) => sum + Number(s.total_amount), 0);
  const fiadosHoy      = salesHoy.filter(s => s.payment_status === "fiado").length;

  // ── Cart actions ──
  const addToCart = useCallback((product: InventoryRow, silent = false) => {
    if (!product.sell_price) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.inventory_id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((i) =>
          i.inventory_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        inventory_id: product.id,
        name:         product.name,
        brand:        product.brand,
        category:     product.category,
        unit_price:   product.sell_price!,
        quantity:     1,
        stock:        product.quantity,
      }];
    });
    if (!silent) setMobileTab("cart");
    if (silent) toast.success(`${[product.brand, product.name].filter(Boolean).join(" ")} añadido`, { duration: 1500 });
  }, []);

  const applyDiscount = useCallback((id: string, pct: number | null, customPx: number | null) => {
    setCart(prev => prev.map(i => {
      if (i.inventory_id !== id) return i;
      if (pct === null && customPx === null) return { ...i, discount: undefined, adjustedPrice: undefined };
      const adj = pct !== null
        ? parseFloat((i.unit_price * (1 - pct / 100)).toFixed(2))
        : customPx!;
      return { ...i, discount: pct ?? undefined, adjustedPrice: adj };
    }));
  }, []);

  const handleSkuSearch = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const q = search.trim().toLowerCase();
    if (!q) return;
    const match = sellable.find(p => (p.sku ?? "").toLowerCase() === q);
    if (match && match.quantity > 0 && (match.sell_price ?? 0) > 0) {
      addToCart(match, true);
      setSearch("");
    }
  }, [search, sellable, addToCart]);

  const incQty = useCallback((id: string) => {
    setCart((prev) => prev.map((i) =>
      i.inventory_id === id && i.quantity < i.stock
        ? { ...i, quantity: i.quantity + 1 }
        : i
    ));
  }, []);

  const decQty = useCallback((id: string) => {
    setCart((prev) => prev
      .map((i) => i.inventory_id === id ? { ...i, quantity: i.quantity - 1 } : i)
      .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.inventory_id !== id));
  }, []);

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerId("");
    setNotes("");
    setPaymentStatus("pagado");
    setPaymentMethod("efectivo");
    setClientMode("guest");
  };

  // ── Complete sale ──
  const completeSale = async () => {
    if (cart.length === 0 || !org?.id) return;

    // !! Capture snapshots BEFORE any await to prevent React state loss !!
    const cartSnapshot = cart.map((i) => ({
      name:      i.name,
      brand:     i.brand,
      qty:       i.quantity,
      unitPrice: i.adjustedPrice ?? i.unit_price,
    }));
    const totalSnapshot  = cartTotal;
    const resolvedName   =
      clientMode === "registered"
        ? (clientes.find(c => c.id === customerId)?.full_name ?? null)
        : (customerName.trim() || null);
    const resolvedPhone  =
      clientMode === "registered"
        ? (clientes.find(c => c.id === customerId)?.phone ?? "")
        : "";
    const savedPayStatus = paymentStatus;
    const savedPayMethod = paymentMethod;
    const savedClientId  = clientMode === "registered" ? customerId : "";

    // Original cart reference for DB insert — uses effective (discounted) price
    const cartForDB = cart.map((i) => ({
      inventory_id: i.inventory_id,
      quantity:     i.quantity,
      unit_price:   i.adjustedPrice ?? i.unit_price,
    }));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const createdSale = await createSale.mutateAsync({
      organization_id: org.id,
      created_by:      user?.id ?? null,
      customer_id:     clientMode === "registered" ? (customerId || null) : null,
      customer_name:   resolvedName,
      payment_status:  savedPayStatus,
      payment_method:  savedPayStatus === "pagado" ? savedPayMethod : "efectivo",
      notes:           notes || null,
      items:           cartForDB,
    });

    setLastSaleTotal(totalSnapshot);
    setLastSaleData({
      saleId:       createdSale.id,
      customerName: resolvedName ?? "Consumidor Final",
      customerId:   savedClientId,
      guestPhone:   resolvedPhone,
      payMethod:    savedPayMethod,
      items:        cartSnapshot,
    });
    setConfirmOpen(false);
    clearCart();
    setMobileTab("products");
    if (savedPayStatus === "pagado") {
      setDocOpen(true);
    } else {
      setSuccessOpen(true);
    }
  };

  // ── Product panel ──
  const ProductPanel = (
    <div className="flex flex-col h-full gap-3">

      {/* Type tabs */}
      <div className="flex gap-1.5 bg-muted/30 rounded-lg p-1">
        {TYPE_TABS.map(({ value, label, icon }) => {
          const count = value === "all"
            ? sellable.length
            : sellable.filter((p) => p.item_type === value).length;
          return (
            <button
              key={value}
              onClick={() => changeType(value)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                typeFilter === value
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FaIcon icon={icon} size={11} className="shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              <span className={`text-[10px] ${typeFilter === value ? "text-primary" : "opacity-60"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + barcode */}
      <div className="relative">
        <FaIcon icon={faMagnifyingGlass} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 pr-8 bg-card/60"
          placeholder="Buscar producto, marca, SKU… (Enter = escanear)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSkuSearch}
        />
        <FaIcon icon={faBarcode} size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
              activeCategory === null
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all flex items-center gap-1 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <FaIcon icon={faTag} size={9} /> {cat}
              {activeCategory === cat && <FaIcon icon={faXmark} size={9} />}
            </button>
          ))}
        </div>
      )}

      {/* Products grid */}
      <ScrollArea className="flex-1 -mr-1 pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FaIcon icon={faBoxOpen} size={36} className="opacity-30" />
            <p className="text-sm text-center">
              {sellable.length === 0
                ? "No hay ítems con precio de venta configurado.\nConfigúralos en el inventario."
                : "Sin resultados para tu búsqueda."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 pb-4">
            {filtered.map((p) => {
              const cartQty = cart.find((i) => i.inventory_id === p.id)?.quantity ?? 0;
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  cartQty={cartQty}
                  onAdd={addToCart}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // ── Cart panel ──
  const CartPanel = (
    <div className="flex flex-col h-full gap-0">

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <FaIcon icon={faCartShopping} size={14} className="text-primary" />
          <span className="font-semibold text-sm">Carrito</span>
          {cartCount > 0 && (
            <Badge className="h-5 text-[10px] px-1.5">{cartCount}</Badge>
          )}
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
          >
            <FaIcon icon={faXmark} size={11} /> Vaciar
          </button>
        )}
      </div>

      {/* Empty state */}
      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-10">
          <FaIcon icon={faCartShopping} size={36} className="opacity-20" />
          <p className="text-sm text-center">
            El carrito está vacío.<br />
            <span className="text-xs">Toca un producto para agregar.</span>
          </p>
        </div>
      ) : (
        <>
          {/* Items */}
          <ScrollArea className="flex-1 -mr-1 pr-1 my-1">
            {cart.map((item) => (
              <CartLine
                key={item.inventory_id}
                item={item}
                onInc={() => incQty(item.inventory_id)}
                onDec={() => decQty(item.inventory_id)}
                onRemove={() => removeFromCart(item.inventory_id)}
                onDiscount={(pct, px) => applyDiscount(item.inventory_id, pct, px)}
              />
            ))}
          </ScrollArea>

          {/* Client & Payment */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Estado de pago</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="h-8 text-sm bg-card/40">
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagado">Liquidado al contado</SelectItem>
                  <SelectItem value="fiado">Fiado / Por cobrar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentStatus === "fiado" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cliente (Obligatorio para fiados)</Label>
                <ClientCombobox
                  clientes={clientes}
                  value={customerId}
                  onChange={setCustomerId}
                  placeholder="Buscar cliente registrado"
                />
                {customerId === "" && (
                  <p className="text-[10px] text-amber-500 flex items-center gap-1">
                    <FaIcon icon={faTriangleExclamation} size={11} /> Debes seleccionar un cliente.
                  </p>
                )}
              </div>
            ) : (
              /* Opcional: registrado o sin registro */
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Cliente <span className="opacity-60">(opcional)</span></Label>
                  <button
                    type="button"
                    onClick={() => { setClientMode(clientMode === "registered" ? "guest" : "registered"); setCustomerId(""); setCustomerName(""); }}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      clientMode === "registered"
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "text-muted-foreground border-border"
                    }`}
                  >
                    {clientMode === "registered" ? "Registrado" : "Sin registro"}
                  </button>
                </div>
                {clientMode === "registered" ? (
                  <ClientCombobox
                    clientes={clientes}
                    value={customerId}
                    onChange={setCustomerId}
                    placeholder="Buscar cliente..."
                  />
                ) : (
                  <Input
                    className="h-8 text-sm bg-card/40"
                    placeholder="Nombre del cliente..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                )}
              </div>
            )}

            {paymentStatus === "pagado" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Método de pago (Caja)</Label>
                <div className="flex gap-1.5">
                  {PAYMENT_METHODS.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setPaymentMethod(value)}
                      className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                        paymentMethod === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <FaIcon icon={icon} size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Total */}
            <div className="flex items-center justify-between font-mono font-bold text-lg mb-1">
              <span>Total</span>
              {cartTotal > 0 ? (
                <span>{formatCurrency(cartTotal)}</span>
              ) : (
                <span className="text-muted-foreground/50">--</span>
              )}
            </div>

            {/* Complete button */}
            <Button
              className="w-full h-11 text-base font-semibold gap-2"
              onClick={() => setConfirmOpen(true)}
              disabled={cart.length === 0 || (paymentStatus === "fiado" && !customerId)}
            >
              <FaIcon icon={faCircleCheck} size={17} />
              {paymentStatus === "fiado" ? "Registrar Deuda" : "Cobrar Venta"}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] gap-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FaIcon icon={faStore} size={18} className="text-primary" /> Punto de Venta
          </h1>
          <p className="text-sm text-muted-foreground">
            {sellable.length} ítems disponibles
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Historial — solo desktop */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 hidden sm:flex"
            onClick={() => setHistoryOpen(true)}
          >
            <FaIcon icon={faClockRotateLeft} size={13} />
            Historial
            {salesHistory.length > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                {salesHistory.length}
              </span>
            )}
          </Button>

          {/* Mobile: toggle tab */}
          <div className="flex sm:hidden items-center gap-1 border border-border rounded-lg p-1">
            <button
              onClick={() => setMobileTab("products")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mobileTab === "products" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Productos
            </button>
            <button
              onClick={() => setMobileTab("cart")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                mobileTab === "cart" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Carrito
              {cartCount > 0 && (
                <span className="size-4 flex items-center justify-center rounded-full bg-primary-foreground text-primary text-[9px] font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards del dia ── */}
      <div className="grid grid-cols-3 gap-2 pb-1 shrink-0">
        {[
          { label: "Ventas hoy",   value: String(ventasHoy),         icon: faCartShopping,      colorClass: "text-primary" },
          { label: "Ingresado",    value: formatCurrency(ingresoHoy), icon: faArrowTrendUp,      colorClass: "text-emerald-400" },
          { label: "Fiados abiertos", value: String(fiadosHoy),      icon: faHandHoldingDollar, colorClass: "text-amber-400" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-border/50 bg-card/60 p-3 space-y-0.5 overflow-hidden transition-all hover:border-primary/50">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
              <FaIcon icon={kpi.icon} size={10} className={`shrink-0 ${kpi.colorClass}`} />
              <span className="truncate">{kpi.label}</span>
            </div>
            {loadingSales
              ? <Skeleton className="h-5 w-12" />
              : <p className="font-bold font-mono text-base truncate">{kpi.value}</p>
            }
          </div>
        ))}
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_340px] gap-4 flex-1 min-h-0">
        <div className="bg-card/30 border border-border/50 rounded-2xl p-4 flex flex-col min-h-0">
          {ProductPanel}
        </div>
        <div className="bg-card/50 border border-border rounded-2xl p-4 flex flex-col min-h-0">
          {CartPanel}
        </div>
      </div>

      {/* Mobile: tab-based */}
      <div className="sm:hidden flex-1 min-h-0 bg-card/30 border border-border/50 rounded-2xl p-4 flex flex-col">
        {mobileTab === "products" ? ProductPanel : CartPanel}
      </div>

      {/* ── Confirm Sale Dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaIcon icon={faReceipt} size={14} className="text-primary" /> Confirmar venta
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Items summary */}
            <div className="rounded-xl bg-muted/30 border border-border/50 divide-y divide-border/40">
              {cart.map((item) => (
                <div key={item.inventory_id} className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="truncate text-muted-foreground">
                    {[item.brand, item.name].filter(Boolean).join(" ")} × {item.quantity}
                  </span>
                  <span className="font-mono text-xs w-20 text-right shrink-0">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notas <span className="opacity-60">(opcional)</span></Label>
              <Input placeholder="Observaciones…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
              <span className="font-medium">Total a cobrar</span>
              <span className="font-bold font-mono text-xl text-primary">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <FaIcon icon={PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.icon ?? faWallet} size={12} className="shrink-0" />
              Pago con {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}
              {customerName && <><FaIcon icon={faChevronRight} size={10} /> {customerName}</>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button
              onClick={completeSale}
              disabled={createSale.isPending}
              className="gap-2"
            >
              <FaIcon icon={faCircleCheck} size={14} />
              {createSale.isPending ? "Procesando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Success Dialog ── */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <VisuallyHidden>
              <DialogTitle>Venta completada</DialogTitle>
            </VisuallyHidden>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center gap-4">
            <div className="size-16 flex items-center justify-center rounded-full bg-emerald-500/20">
              <FaIcon icon={faCircleCheck} size={30} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold">Venta completada</p>
              <p className="text-3xl font-bold font-mono text-primary mt-2">
                {formatCurrency(lastSaleTotal)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Stock e ingresos actualizados
              </p>
            </div>
            <Button className="w-full" onClick={() => setSuccessOpen(false)}>
              Nueva venta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Document selector Dialog (after paid sale) ── */}
      {lastSaleData && (
        <DocSelectorDialog
          open={docOpen}
          onOpenChange={(v) => {
            setDocOpen(v);
            if (!v) setSuccessOpen(true);
          }}
          currencyCode={org?.currency_code ?? "PEN"}
          defaultCustomerName={lastSaleData.customerName !== "Consumidor Final" ? lastSaleData.customerName : ""}
          defaultCustomerId={lastSaleData.customerId}
          clientes={(clientes as { id: string; full_name: string; phone: string | null; document_id: string | null }[])}
          total={lastSaleTotal}
          currencySymbol={currencySymbol}
          isGuestTicket={!lastSaleData.customerId}
          onSkip={() => setSuccessOpen(true)}
          onAction={async (action, docType, custName, custPhone, custTaxId) => {
            if (!org) return;
            const taxPct    = org.tax_percentage ?? 18;
            const showIgv   = org.show_tax_breakdown ?? true;
            const total     = lastSaleTotal;
            const subtotal  = showIgv ? total / (1 + taxPct / 100) : total;
            const taxLabel  = taxTypeLabel;
            const orgPrefix = org.ticket_prefix ?? "TK";
            const docLetter = docType === "boleta" ? "B"
              : docType === "factura" || docType === "factura_b" ? "F"
              : docType === "nota_fiscal" ? "NF"
              : "N";
            
            const receiptData = {
              docType,
              currencyCode: org.currency_code ?? "PEN",
              docNumber: `${orgPrefix}-${docLetter}${String(Date.now()).slice(-6)}`,
              date: new Date().toISOString(),
              orgName:    org.name,
              orgAddress: org.address,
              orgPhone:   org.phone,
              orgTaxId:   org.tax_id_number ?? null,
              orgTaxLabel: org.tax_id_name ?? taxIdName,
              orgLogoUrl: org.logo_url,
              showLogo:   org.show_logo_on_print ?? true,
              printWidth: (org.print_width_mm ?? 58) as 58 | 80,
              customerName:  custName,
              customerTaxId: custTaxId || null,
              customerPhone: custPhone || lastSaleData.guestPhone || null,
              items: lastSaleData.items.map(i => ({
                name:      [i.brand, i.name].filter(Boolean).join(" "),
                qty:       i.qty,
                unitPrice: i.unitPrice,
              })),
              subtotal,
              taxPct,
              taxLabel,
              showIgv,
              total,
              paymentMethod: lastSaleData.payMethod,
              notes:   org.receipt_notes,
              footer:  org.receipt_footer,
              warrantyDays: null,
            };

            if (action === "print") {
              printReceipt(receiptData);
            } else if (action === "print_a4") {
              printReceiptA4(receiptData);
            } else if (action === "share") {
              await shareReceiptAsPdf(receiptData);
            }
            try {
              await saveReceipt({
                data: receiptData,
                saleId: lastSaleData.saleId,
                customerId: lastSaleData.customerId || undefined,
              });
            } catch (err) {
              console.error("Error saving receipt:", err);
            }

            // Always close and open success dialog 
            setSuccessOpen(true);
          }}
        />
      )}
      {/* ── History Sheet ── */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border/50">
            <SheetTitle className="flex items-center gap-2 text-base">
              <FaIcon icon={faClockRotateLeft} size={14} className="text-primary" />
              Historial de Ventas
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 py-2 border-b border-border/30 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {salesHistory.length} venta{salesHistory.length !== 1 ? "s" : ""} registradas.
              Toca <FaIcon icon={faPrint} size={10} className="inline mx-0.5" /> para re-imprimir.
            </p>
          </div>
          <ScrollArea className="flex-1">
            {salesHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <FaIcon icon={faReceipt} size={32} className="opacity-20" />
                <p className="text-sm">Sin ventas registradas aún</p>
              </div>
            ) : (
              (salesHistory as unknown as SaleRow[]).map(s => (
                <SaleHistoryRow
                  key={s.id}
                  sale={s}
                  formatCurrency={formatCurrency}
                  onReprint={(saleId) => {
                    setReprintSaleId(saleId);
                    if (reprintReceipt?.receipt_data) {
                      printReceipt(reprintReceipt.receipt_data as unknown as ReceiptData);
                    } else {
                      toast.info("Sin comprobante guardado para esta venta.");
                    }
                  }}
                  isAdmin={role === "admin" || role === "superadmin"}
                  onVoid={async (sale, reason) => {
                    if (!userId) return;
                    await voidSale.mutateAsync({ saleId: sale.id, voidedBy: userId, reason });
                  }}
                />
              ))
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

    </div>
  );
}

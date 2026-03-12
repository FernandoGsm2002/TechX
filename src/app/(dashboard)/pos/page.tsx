"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, CreditCard,
  Wallet, Building, CheckCircle2, AlertTriangle, Package,
  X, Receipt, Tag, ChevronRight, Store, Wrench, ShoppingBag,
} from "lucide-react";
import { DocSelectorDialog, printReceipt, type DocType } from "@/components/print/ReceiptPrint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useInventario } from "@/hooks/useInventario";
import { useClientes } from "@/hooks/useClientes";
import { useCreateSale, type CartItem } from "@/hooks/usePOS";
import { useOrganization } from "@/contexts/OrganizationContext";
import { CURRENCY_SYMBOLS } from "@/lib/fiscalConfig";
import { createClient } from "@/lib/supabase/client";


// ── Constants ─────────────────────────────────────────────────────────────────

const LOW_STOCK = 5;

const PAYMENT_METHODS = [
  { value: "efectivo",      label: "Efectivo",      icon: Wallet },
  { value: "transferencia", label: "Transferencia", icon: Building },
  { value: "tarjeta",       label: "Tarjeta",       icon: CreditCard },
];

type ItemTypeFilter = "all" | "producto" | "repuesto_propio" | "repuesto_comprado";

const TYPE_TABS: { value: ItemTypeFilter; label: string; icon: React.ElementType }[] = [
  { value: "all",              label: "Todos",           icon: ShoppingBag },
  { value: "producto",         label: "Productos",       icon: ShoppingCart },
  { value: "repuesto_propio",  label: "Rep. Propios",    icon: Wrench },
  { value: "repuesto_comprado",label: "Repuestos",       icon: Package },
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
          {lowStock && <AlertTriangle className="size-2.5 inline mr-0.5" />}
          {outOfStock ? "Sin stock" : `×${product.quantity}`}
        </span>
      </div>

      {/* Add hover overlay */}
      {!outOfStock && price > 0 && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <Plus className="size-8 text-primary" />
        </div>
      )}
    </button>
  );
}

// ── Cart Line ─────────────────────────────────────────────────────────────────

function CartLine({
  item,
  onInc,
  onDec,
  onRemove,
}: {
  item:     CartItem;
  onInc:    () => void;
  onDec:    () => void;
  onRemove: () => void;
}) {
  const { formatCurrency } = useOrganization();
  const displayName = [item.brand, item.name].filter(Boolean).join(" ");

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground font-mono">
          {formatCurrency(item.unit_price)} × {item.quantity}
        </p>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onDec}
          className="size-6 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
        >
          <Minus className="size-3" />
        </button>
        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
        <button
          onClick={onInc}
          disabled={item.quantity >= item.stock}
          className="size-6 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="size-3" />
        </button>
      </div>

      {/* Subtotal */}
      <span className="font-mono text-sm font-semibold w-20 text-right shrink-0">
        {formatCurrency(item.unit_price * item.quantity)}
      </span>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function POSPage() {
  const { org, currencyCode, taxLabel, formatCurrency } = useOrganization();
  const { data: rawInventory = [] } = useInventario();
  const createSale = useCreateSale();

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
    customerName: string;
    customerId:   string;
    guestPhone:   string;
    payMethod:    string;
    items: { name: string; brand: string | null; qty: number; unitPrice: number }[];
  } | null>(null);
  const [successOpen,    setSuccessOpen]    = useState(false);
  const [mobileTab,      setMobileTab]      = useState<"products" | "cart">("products");
  // Client mode in cart
  const [clientMode,     setClientMode]     = useState<"registered" | "guest">("guest");

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

  const cartTotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // ── Cart actions ──
  const addToCart = useCallback((product: InventoryRow) => {
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
    setMobileTab("cart");
  }, []);

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
      unitPrice: i.unit_price,  // <- this IS sell_price, set in addToCart
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

    // Original cart reference for DB insert (still valid in closure before await)
    const cartForDB = cart.map((i) => ({
      inventory_id: i.inventory_id,
      quantity:     i.quantity,
      unit_price:   i.unit_price,   // sell_price — confirmed in addToCart
    }));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await createSale.mutateAsync({
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
        {TYPE_TABS.map(({ value, label, icon: Icon }) => {
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
              <Icon className="size-3 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              <span className={`text-[10px] ${typeFilter === value ? "text-primary" : "opacity-60"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9 bg-card/60"
          placeholder="Buscar producto, marca, SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
              <Tag className="size-2.5" /> {cat}
              {activeCategory === cat && <X className="size-2.5" />}
            </button>
          ))}
        </div>
      )}

      {/* Products grid */}
      <ScrollArea className="flex-1 -mr-1 pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Package className="size-10 opacity-30" />
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
          <ShoppingCart className="size-4 text-primary" />
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
            <X className="size-3" /> Vaciar
          </button>
        )}
      </div>

      {/* Empty state */}
      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-10">
          <ShoppingCart className="size-10 opacity-20" />
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
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-8 text-sm bg-card/40">
                    <SelectValue placeholder="Seleccionar cliente registrado" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customerId === "" && (
                  <p className="text-[10px] text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="size-3" /> Debes seleccionar un cliente.
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
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-8 text-sm bg-card/40">
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setPaymentMethod(value)}
                      className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                        paymentMethod === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon className="size-3.5" />
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
              <CheckCircle2 className="size-5" />
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
            <Store className="size-5 text-primary" /> Punto de Venta
          </h1>
          <p className="text-sm text-muted-foreground">
            {sellable.length} ítems disponibles
          </p>
        </div>

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
              <Receipt className="size-4 text-primary" /> Confirmar venta
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
              {React.createElement(
                PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.icon ?? Wallet,
                { className: "size-3.5 shrink-0" }
              )}
              Pago con {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}
              {customerName && <><ChevronRight className="size-3" /> {customerName}</>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button
              onClick={completeSale}
              disabled={createSale.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="size-4" />
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
              <CheckCircle2 className="size-8 text-emerald-400" />
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
          currencySymbol={CURRENCY_SYMBOLS[org?.currency_code ?? "PEN"] ?? "$"}
          onSkip={() => setSuccessOpen(true)}
          onPrint={(docType, custName, custPhone, custTaxId) => {
            if (!org) return;
            const taxPct   = org.tax_percentage ?? 18;
            const showIgv  = (org as any).show_igv_breakdown ?? true;
            const total    = lastSaleTotal;
            const subtotal = showIgv ? total / (1 + taxPct / 100) : total;
            const taxLabel = org.tax_id_name ?? "IGV";
            // Doc number prefix by type
            const prefix = docType === "boleta" ? "B"
              : docType === "factura" || docType === "factura_b" ? "F"
              : docType === "nota_fiscal" ? "NF"
              : "N";
            printReceipt({
              docType,
              currencyCode: org.currency_code ?? "PEN",
              docNumber: `${prefix}001-${String(Date.now()).slice(-5)}`,
              date: new Date().toISOString(),
              orgName:    org.name,
              orgAddress: org.address,
              orgPhone:   org.phone,
              orgTaxId:   org.tax_id_number ?? null,
              orgTaxLabel: org.tax_id_name ?? "RUC",
              orgLogoUrl: org.logo_url,
              showLogo:   org.show_logo_on_print ?? true,
              printWidth: (org.print_width_mm ?? 58) as 58 | 80,
              customerName:  custName,
              customerTaxId: custTaxId || null,
              customerPhone: custPhone || lastSaleData.guestPhone || null,
              items: lastSaleData.items.map(i => ({
                name:      [i.brand, i.name].filter(Boolean).join(" "),
                qty:       i.qty,
                unitPrice: i.unitPrice,  // sell_price captured before clear
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
            });
            setSuccessOpen(true);
          }}
        />
      )}

    </div>
  );
}

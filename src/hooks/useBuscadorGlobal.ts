// useBuscadorGlobal.ts — Búsqueda global por IMEI, serie, nombre, SKU/barcode
import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient() as any;

// ── Types ──────────────────────────────────────────────────────────────────────

export type GlobalResultType = "ticket" | "servicio" | "inventory" | "sale";

export interface GlobalSearchResult {
  id:          string;
  type:        GlobalResultType;
  title:       string;       // nombre principal
  subtitle:    string;       // detalle secundario (imei, sku, etc.)
  meta:        string;       // estado, fecha, monto
  href:        string;       // ruta de navegación directa
  badge?:      string;       // tag visual
  badgeColor?: string;
}

// ── Search function ────────────────────────────────────────────────────────────

async function globalSearch(query: string): Promise<GlobalSearchResult[]> {
  if (!query.trim() || query.length < 2) return [];

  const q = query.trim().toLowerCase();
  const results: GlobalSearchResult[] = [];

  // ── 1. Tickets — busca en device_details (IMEI, marca, modelo) ────────────
  const { data: tickets } = await supabase
    .from("tickets")
    .select(`
      id, status, payment_status, final_amount, created_at,
      device_details, guest_name,
      customers ( full_name )
    `)
    .or(
      `device_details->>imei.ilike.%${q}%,` +
      `device_details->>brand.ilike.%${q}%,` +
      `device_details->>model.ilike.%${q}%,` +
      `guest_name.ilike.%${q}%`
    )
    .limit(10);

  for (const t of (tickets ?? [])) {
    const dd        = t.device_details ?? {};
    const imei      = dd.imei ?? "";
    const device    = [dd.brand, dd.model].filter(Boolean).join(" ") || "—";
    const customer  = t.customers?.full_name ?? t.guest_name ?? "Sin cliente";
    results.push({
      id:         t.id,
      type:       "ticket",
      title:      `${device} — ${customer}`,
      subtitle:   imei ? `IMEI: ${imei}` : `Ticket`,
      meta:       `${t.status} · ${t.final_amount ? `$${Number(t.final_amount).toFixed(2)}` : "—"}`,
      href:       `/tickets/${t.id}`,
      badge:      t.status,
      badgeColor: t.status === "entregado" ? "green" : t.status === "en_proceso" ? "blue" : "amber",
    });
  }

  // ── 2. Otros Servicios — busca en IMEI, serial, descripción, order_number ──
  const { data: servicios } = await supabase
    .from("otros_servicios")
    .select(`
      id, order_number, status, price, payment_status, imei, serial,
      description, device_brand, device_model, guest_name,
      customers ( full_name )
    `)
    .or(
      `imei.ilike.%${q}%,` +
      `serial.ilike.%${q}%,` +
      `order_number.ilike.%${q}%,` +
      `description.ilike.%${q}%,` +
      `device_model.ilike.%${q}%,` +
      `guest_name.ilike.%${q}%`
    )
    .limit(10);

  for (const s of (servicios ?? [])) {
    const customer = s.customers?.full_name ?? s.guest_name ?? "Sin cliente";
    const device   = [s.device_brand, s.device_model].filter(Boolean).join(" ") || s.description || "—";
    const id_info  = s.imei ? `IMEI: ${s.imei}` : s.serial ? `Serie: ${s.serial}` : `#${s.order_number}`;
    results.push({
      id:         s.id,
      type:       "servicio",
      title:      `${device} — ${customer}`,
      subtitle:   id_info,
      meta:       `${s.status} · ${s.price ? `$${Number(s.price).toFixed(2)}` : "—"}`,
      href:       `/otros-servicios/${s.id}`,
      badge:      s.order_number,
      badgeColor: "violet",
    });
  }

  // ── 3. Inventario — busca por nombre, sku, marca, modelo ─────────────────
  const { data: inventory } = await supabase
    .from("inventory")
    .select("id, name, brand, model, sku, quantity, sell_price, item_type, image_url")
    .or(
      `name.ilike.%${q}%,` +
      `sku.ilike.%${q}%,` +
      `brand.ilike.%${q}%,` +
      `model.ilike.%${q}%`
    )
    .limit(10);

  for (const i of (inventory ?? [])) {
    results.push({
      id:         i.id,
      type:       "inventory",
      title:      i.name,
      subtitle:   [i.brand, i.model].filter(Boolean).join(" ") || i.item_type,
      meta:       `Stock: ${i.quantity} · ${i.sell_price ? `$${Number(i.sell_price).toFixed(2)}` : "—"}`,
      href:       `/inventario`,
      badge:      i.sku || undefined,
      badgeColor: i.quantity <= 0 ? "red" : i.quantity <= 5 ? "amber" : "green",
    });
  }

  // ── 4. Ventas POS — busca por customer_name ───────────────────────────────
  const { data: sales } = await supabase
    .from("sales")
    .select("id, customer_name, total_amount, payment_status, payment_method, created_at")
    .ilike("customer_name", `%${q}%`)
    .limit(5);

  for (const sale of (sales ?? [])) {
    results.push({
      id:         sale.id,
      type:       "sale",
      title:      sale.customer_name ?? "Venta directa",
      subtitle:   `${sale.payment_method} · ${sale.payment_status}`,
      meta:       `$${Number(sale.total_amount).toFixed(2)} · ${new Date(sale.created_at).toLocaleDateString()}`,
      href:       `/pos`,
      badgeColor: sale.payment_status === "pagado" ? "green" : "amber",
    });
  }

  return results;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useBuscadorGlobal() {
  const [query, setQuery]   = useState("");
  const [active, setActive] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 350);
  }, []);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn:  () => globalSearch(debouncedQuery),
    enabled:  debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  return {
    query,
    debouncedQuery,
    active,
    setActive,
    handleSearch,
    results,
    isLoading,
    clear: () => { setQuery(""); setDebouncedQuery(""); setActive(false); },
  };
}

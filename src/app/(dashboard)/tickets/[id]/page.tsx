"use client";

import React, { useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTicket, useUpdateTicketStatus, useUpdateTicket } from "@/hooks/useTickets";
import { useTicketItems, useAddTicketItem, useRemoveTicketItem } from "@/hooks/useTicketItems";
import { useInventario } from "@/hooks/useInventario";
import { TicketStatusBadge, STATUS_CONFIG, ALLOWED_TRANSITIONS, TERMINAL_STATUSES } from "@/components/ui-custom/TicketStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatternLock } from "@/components/ui-custom/PatternLock";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  faArrowLeft, faPhone, faMobileScreen, faHashtag, faUser, faClipboardList,
  faClock, faBox, faPowerOff, faLock, faLockOpen, faCamera,
  faPlus, faTrash, faMagnifyingGlass, faTriangleExclamation, faWrench, faCartShopping,
  faShieldHalved, faClockRotateLeft, faPen, faCheck, faXmark, faShareNodes,
  faWandMagicSparkles, faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import QRCode from "react-qr-code";
import { DeviceLabelPrint } from "@/components/print/DeviceLabelPrint";
import { DocSelectorDialog, printReceipt, printReceiptA4, shareReceiptAsPdf } from "@/components/print/ReceiptPrint";
import { getFiscalConfig } from "@/lib/fiscalConfig";
import { useSaveReceipt, useReceiptByTicket } from "@/hooks/useReceipts";
import { WhatsAppNotifyButton } from "@/components/ui-custom/WhatsAppNotifyButton";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useClientes } from "@/hooks/useClientes";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { TicketStatus, DeviceDetails } from "@/types/domain";
import { useGarantiaByTicket } from "@/hooks/useGarantias";
import Link from "next/link";
import { toast } from "sonner";

const STATUSES = Object.keys(STATUS_CONFIG) as TicketStatus[];

const LOCK_TYPE_LABELS: Record<string, string> = {
  pin:      "PIN numérico",
  patron:   "Patrón",
  password: "Contraseña",
  huella:   "Huella / Biométrico",
};

// ── Inventory item type (raw) ─────────────────────────────────────────────────

interface InvItem {
  id:         string;
  name:       string;
  brand:      string | null;
  category:   string | null;
  quantity:   number;
  sell_price: number | null;
  cost_price: number | null;
  item_type:  string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const { org, currencyCode, taxLabel, currencySymbol, planType, formatCurrency } = useOrganization();
  const id       = params.id as string;
  const { data: ticket, isLoading } = useTicket(id);
  const statusMutation  = useUpdateTicketStatus();
  const updateTicket    = useUpdateTicket(id);
  const { mutateAsync: saveReceipt } = useSaveReceipt();
  // Parts state
  const { data: ticketItems = [], isLoading: loadingItems } = useTicketItems(id);
  const addItemMutation    = useAddTicketItem();
  const removeItemMutation = useRemoveTicketItem();
  const { data: rawInventory = [] } = useInventario();
  const inventory = rawInventory as unknown as InvItem[];

  // Guarantee data
  const { data: garantia } = useGarantiaByTicket(id);

  // Dialog state
  const qrRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);

  /** Reads the SVG string from the hidden QR div rendered in the DOM */
  const getQrSvg = (): string | null =>
    qrRef.current?.querySelector("svg")?.outerHTML ?? null;

  const [addOpen,       setAddOpen]       = useState(false);
  const [searchPieza,   setSearchPieza]   = useState("");
  const [selectedInv,   setSelectedInv]   = useState<InvItem | null>(null);
  const [qty,           setQty]           = useState(1);
  const [unitPrice,     setUnitPrice]     = useState("");
  const [addToTotal,    setAddToTotal]    = useState(true);

  // Delivery dialog state
  const [deliverOpen,       setDeliverOpen]       = useState(false);
  const [paymentStatus,     setPaymentStatus]     = useState("pagado");
  const [paymentMethod,     setPaymentMethod]     = useState("efectivo");
  const [warrantyMonths,    setWarrantyMonths]    = useState<string>("");
  const [noWarrantyDeliver, setNoWarrantyDeliver] = useState(false);
  // Doc selector (after entregado)
  const [docOpen,          setDocOpen]          = useState(false);
  // WhatsApp auto-trigger
  const [waOpen,           setWaOpen]           = useState(false);
  // Inline editing: price
  const [editingPrice,     setEditingPrice]     = useState(false);
  const [priceInput,       setPriceInput]       = useState("");
  // Inline editing: diagnosis
  const [editingDiagnosis, setEditingDiagnosis] = useState(false);
  const [diagnosisInput,   setDiagnosisInput]   = useState("");
  const [isDiagnosingAI, setIsDiagnosingAI] = useState(false);

  const handleAIAssistant = async () => {
    setIsDiagnosingAI(true);
    try {
      const t = ticket as Record<string, unknown>;
      const dev = (t.device_details ?? {}) as DeviceDetails;
      const res = await fetch("/api/ai/diagnose", {
        method: "POST",
        body: JSON.stringify({
          issue: (t.reported_issue as string) || "",
          device: [dev.brand, dev.model, dev.type].filter(Boolean).join(" "),
        })
      });
      const data = await res.json();
      if (data.suggestion) {
        setDiagnosisInput(data.suggestion);
        setEditingDiagnosis(true);
      } else if (data.error) {
        toast.error("Error IA: " + data.error);
      }
    } catch (e: any) {
      toast.error("Fallo de red al contactar asistente IA");
    } finally {
      setIsDiagnosingAI(false);
    }
  };

  const { data: clientes = [] } = useClientes();

  // Filtered inventory for dialog
  const filteredInv = useMemo(() => {
    const q = searchPieza.toLowerCase().trim();
    return inventory.filter((i) =>
      i.quantity > 0 &&
      (i.item_type === "repuesto_propio" || i.item_type === "repuesto_comprado" || i.item_type === "producto") &&
      (!q ||
        i.name.toLowerCase().includes(q) ||
        (i.brand ?? "").toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q))
    );
  }, [inventory, searchPieza]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" /> <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground">Ticket no encontrado</p>
        <Button variant="outline" onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  const currentStatus = (ticket as { status: TicketStatus }).status;
  const isTerminal     = TERMINAL_STATUSES.includes(currentStatus);
  const allowedNext    = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (newStatus === "entregado") {
      // Mostrar dialog de cobro + garantia al entregar
      const ticketWDays = (ticket as any).warranty_days as number | null;
      const sourceDays  = ticketWDays ?? 360;
      const preMonths   = Math.max(1, Math.round(sourceDays / 30));
      setWarrantyMonths(String(preMonths));
      setNoWarrantyDeliver(ticketWDays === 0);
      setPaymentStatus("pagado");
      setPaymentMethod("efectivo");
      setDeliverOpen(true);
    } else {
      // completado, en_proceso, recibido, fallido: cambio directo sin dialog
      statusMutation.mutate(
        { id: ticket.id, status: newStatus },
        {
          onSuccess: () => {
            // Auto-open WA dialog on key status changes
            if (newStatus === "completado" || newStatus === "fallido" || newStatus === "en_proceso") {
              setWaOpen(true);
            }
          },
        }
      );
    }
  };

  const handleDeliverConfirm = () => {
    statusMutation.mutate(
      { 
        id:             ticket.id, 
        status:         "entregado", 
        payment_status: paymentStatus,
        payment_method: paymentStatus === "pagado" ? paymentMethod : undefined,
        warranty_days:  noWarrantyDeliver ? 0 : (parseInt(warrantyMonths) || 12) * 30,
      },
      {
        onSuccess: () => {
          setDeliverOpen(false);
          setWaOpen(true);
          if (paymentStatus === "pagado") setDocOpen(true);
        }
      }
    );
  };

  const formatMoney = (n: number | null | undefined) =>
    n != null ? formatCurrency(Number(n)) : "—";

  // Cast helpers
  const t        = ticket as Record<string, unknown>;
  const device   = (t.device_details ?? {}) as DeviceDetails;
  const customer = t.customers as { full_name?: string; phone?: string } | null;
  const techName = (t.profiles as { full_name?: string | null } | null)?.full_name;
  const history  = (t.ticket_history as {
    id: string; status_from: TicketStatus | null; status_to: TicketStatus;
    notes: string | null; created_at: string;
    profiles?: { full_name: string | null } | null;
  }[]) ?? [];
  const intakeImages = (t.ticket_images as { id: string; image_url: string; image_type: string }[]) ?? [];

  // New intake fields
  const powerOn     = t.power_on as boolean | null;
  const hasLock     = t.has_lock as boolean | null;
  const lockType    = t.lock_type as string | null;
  const lockCode    = t.lock_code as string | null;
  const intakeNotes = t.intake_notes as string | null;
  const finalAmount = Number((ticket as {final_amount?: number}).final_amount ?? 0);

  // Parts total — only items that add to the ticket total (add_to_total defaults to true for old records)
  const partsTotal = ticketItems
    .filter((i) => i.add_to_total !== false)
    .reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const grandTotal = finalAmount + partsTotal;

  const trackingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/track/${ticket.id}`;
  const customerPhone = (t.guest_phone as string | null) || customer?.phone || null;

  const openAddDialog = () => {
    setSelectedInv(null);
    setQty(1);
    setUnitPrice("");
    setSearchPieza("");
    setAddToTotal(true);
    setAddOpen(true);
  };

  // !! IMPORTANT: always use sell_price — NEVER fall back to cost_price.
  // cost_price is our internal cost; the customer must be charged sell_price.
  const selectInventoryItem = (item: InvItem) => {
    setSelectedInv(item);
    setUnitPrice((item.sell_price ?? 0).toString());  // 0 forces manual entry if no sell_price
    setQty(1);
  };

  const handleAddPart = async () => {
    if (!selectedInv || !org?.id) return;
    await addItemMutation.mutateAsync({
      ticket_id:       id,
      organization_id: org.id,
      inventory_id:    selectedInv.id,
      quantity:        qty,
      unit_price:      parseFloat(unitPrice) || 0,
      add_to_total:    addToTotal,
    });
    setAddOpen(false);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8 self-start" onClick={() => router.back()}>
          <FaIcon icon={faArrowLeft} size={16} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold font-mono">
              {(ticket as unknown as { ticket_number?: number | null }).ticket_number != null
                ? `#${String((ticket as unknown as { ticket_number: number }).ticket_number).padStart(3, "0")}`
                : `#${ticket.id.slice(0, 8).toUpperCase()}`}
            </h1>
            <TicketStatusBadge status={(ticket as { status: TicketStatus }).status} />
            {powerOn === false && (
              <Badge variant="outline" className="text-amber-500 border-amber-500/40 text-xs">
                <FaIcon icon={faPowerOff} size={12} className="mr-1" /> Ingresó apagado
              </Badge>
            )}
            {techName && (
              <Badge variant="outline" className="text-blue-400 border-blue-400/40 text-xs gap-1">
                <FaIcon icon={faWrench} size={12} /> {techName}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Creado {format(new Date(ticket.created_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
          </p>
        </div>

        {/* Action row: Ticket label + WhatsApp + Estado */}
        <div className="flex items-center gap-2 flex-wrap">
          <DeviceLabelPrint
            data={{
              ticketNumber: ticket.id.slice(0, 8).toUpperCase(),
              customerName:
                (t.guest_name as string | null) ||
                customer?.full_name ||
                "Sin registro",
              customerPhone:
                (t.guest_phone as string | null) ||
                customer?.phone ||
                null,
              deviceType: [
                device.brand, device.model, device.type,
              ].filter(Boolean).join(" ") || "—",
              imei: device.imei ?? null,
              issue: ticket.reported_issue ?? "—",
              techName: techName ?? null,
              receivedAt: ticket.created_at,
              status: (t.status as string) ?? "recibido",
              orgName: org?.name ?? "TechX",
              powerOn: powerOn ?? true,
              hasLock: hasLock ?? false,
              lockType: lockType ?? null,
            }}
          />

          <WhatsAppNotifyButton
            currentStatus={(t.status as string) as any}
            customerName={(t.guest_name as string | null) || customer?.full_name || "Cliente"}
            customerPhone={(t.guest_phone as string | null) || customer?.phone || ""}
            orgName={org?.name ?? "TechX"}
            orgWhatsapp={org?.whatsapp ?? null}
            ticketId={ticket.id.slice(0, 8).toUpperCase()}
            device={[device.brand, device.model, device.type].filter(Boolean).join(" ") || "Equipo"}
            warrantyDays={(ticket as any).warranty_days ?? 360}
            currencyCode={currencyCode}
            defaultExtraNote={(ticket as { diagnosis?: string | null }).diagnosis ?? undefined}
            open={waOpen}
            onOpenChange={setWaOpen}
          />

          {/* Compartir seguimiento */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => setShareOpen(true)}
          >
            <FaIcon icon={faShareNodes} size={12} />
            Seguimiento
          </Button>

          {/* Estado selector — bloqueado si es terminal */}
          {isTerminal ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 text-sm">
              <TicketStatusBadge status={currentStatus} />
              <span className="text-xs text-muted-foreground">Estado final</span>
            </div>
          ) : (
            <Select
              value={currentStatus}
              onValueChange={handleStatusChange}
              disabled={statusMutation.isPending}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={currentStatus} disabled>
                  {STATUS_CONFIG[currentStatus]?.label} (actual)
                </SelectItem>
                {allowedNext.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_CONFIG[s]?.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── Garantia Widget ── */}
      {garantia && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          !garantia.is_active
            ? "bg-muted/30 border-border/50"
            : garantia.days_remaining < 0
            ? "bg-red-500/10 border-red-500/30"
            : garantia.days_remaining <= 7
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-emerald-500/10 border-emerald-500/30"
        }`}>
          <div className={`flex size-9 items-center justify-center rounded-lg shrink-0 ${
            !garantia.is_active ? "bg-muted text-muted-foreground" :
            garantia.days_remaining < 0 ? "bg-red-500/20 text-red-400" :
            garantia.days_remaining <= 7 ? "bg-amber-500/20 text-amber-400" :
            "bg-emerald-500/20 text-emerald-400"
          }`}>
            <FaIcon icon={faShieldHalved} size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {!garantia.is_active ? "Garantia anulada" :
               garantia.days_remaining < 0 ? "Garantia vencida" :
               garantia.days_remaining === 0 ? "Garantia vence hoy" :
               `Garantia vigente — ${garantia.days_remaining} dia${garantia.days_remaining !== 1 ? "s" : ""} restante${garantia.days_remaining !== 1 ? "s" : ""}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Vence: {garantia.end_date}
              {garantia.claim_count > 0 && (
                <span className="ml-2 text-amber-400 flex items-center gap-1 inline-flex">
                  <FaIcon icon={faClockRotateLeft} size={12} /> {garantia.claim_count} reclamo{garantia.claim_count !== 1 ? "s" : ""} previo{garantia.claim_count !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <Link href="/garantias">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0">
              <FaIcon icon={faShieldHalved} size={12} /> Ver garantias
            </Button>
          </Link>
        </div>
      )}

      {/* Parent ticket warning (this IS a warranty claim) */}
      {(ticket as any).is_warranty_claim && (ticket as any).parent_ticket_id && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-blue-500/10 border-blue-500/30">
          <FaIcon icon={faShieldHalved} size={20} className="text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-300">Ticket de garantia</p>
            <p className="text-xs text-muted-foreground">Este ticket fue generado por un reclamo de garantia</p>
          </div>
          <Link href={`/tickets/${(ticket as any).parent_ticket_id}`}>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0">
              Ver ticket original
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Cliente ── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FaIcon icon={faUser} size={16} className="text-muted-foreground" /> Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {/* Show registered customer OR guest info */}
            {(t.guest_name as string | null) ? (
              <>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold">{t.guest_name as string}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                    Sin registro
                  </span>
                </div>
                {(t.guest_phone as string | null) && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <FaIcon icon={faPhone} size={14} /> {t.guest_phone as string}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">{customer?.full_name ?? "—"}</p>
                {customer?.phone && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <FaIcon icon={faPhone} size={14} /> {customer.phone}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Dispositivo ── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FaIcon icon={faMobileScreen} size={16} className="text-muted-foreground" /> Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p className="font-semibold">{device.brand} {device.model}</p>
            <p className="text-muted-foreground capitalize">{device.type}</p>
            {device.imei && (
              <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <FaIcon icon={faHashtag} size={12} /> {device.imei}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Checklist de ingreso ── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FaIcon icon={faClipboardList} size={16} className="text-muted-foreground" /> Checklist de ingreso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              {powerOn === false ? (
                <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/40">
                  <FaIcon icon={faPowerOff} size={12} /> Apagado
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/40">
                  <FaIcon icon={faPowerOff} size={12} /> Encendido
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Clave</span>
              {hasLock ? (
                <div className="flex flex-col items-end gap-0.5">
                  <Badge variant="outline" className="gap-1 text-primary border-primary/40">
                    <FaIcon icon={faLock} size={12} /> {LOCK_TYPE_LABELS[lockType ?? ""] ?? lockType ?? "Sí"}
                  </Badge>
                  {lockCode && lockType === "patron" ? (
                    <div className="mt-1.5">
                      <PatternLock value={lockCode} size={80} />
                    </div>
                  ) : lockCode ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      🔑 {lockCode}
                    </span>
                  ) : null}
                </div>
              ) : (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <FaIcon icon={faLockOpen} size={12} /> Sin clave
                </Badge>
              )}
            </div>
            {intakeNotes && (
              <div className="pt-1 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Notas de ingreso</p>
                <p className="text-sm">{intakeNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Detalle del Servicio + Total ── */}
        <Card className="border-border/50 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FaIcon icon={faClipboardList} size={16} className="text-muted-foreground" /> Detalle del Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Problema reportado</p>
              <p className="text-sm leading-relaxed">
                {(ticket as { reported_issue?: string }).reported_issue ?? "—"}
              </p>
            </div>

            {/* ── Diagnóstico técnico (inline editable) ── */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">
                  Trabajo realizado / Diagnóstico
                  <span className="ml-1 text-[10px] opacity-60">(opcional)</span>
                </p>
                {!isTerminal && !editingDiagnosis && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 text-[10px] text-purple-500 hover:text-purple-600 hover:bg-purple-500/10"
                      disabled={isDiagnosingAI}
                      onClick={handleAIAssistant}
                    >
                      <FaIcon icon={isDiagnosingAI ? faSpinner : faWandMagicSparkles} size={10} className={isDiagnosingAI ? "animate-spin" : ""} />
                      {isDiagnosingAI ? "Pensando..." : "Asistente IA"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setDiagnosisInput((ticket as { diagnosis?: string | null }).diagnosis ?? "");
                        setEditingDiagnosis(true);
                      }}
                    >
                      <FaIcon icon={faPen} size={10} />
                    </Button>
                  </div>
                )}
              </div>
              {editingDiagnosis ? (
                <div className="space-y-2">
                  <Textarea
                    autoFocus
                    rows={3}
                    value={diagnosisInput}
                    onChange={(e) => setDiagnosisInput(e.target.value)}
                    placeholder="Cambio de pantalla, limpieza de placa…"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      disabled={updateTicket.isPending}
                      onClick={() => {
                        updateTicket.mutate(
                          { diagnosis: diagnosisInput.trim() || null },
                          { onSuccess: () => setEditingDiagnosis(false) }
                        );
                      }}
                    >
                      <FaIcon icon={faCheck} size={11} /> Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setEditingDiagnosis(false)}
                    >
                      <FaIcon icon={faXmark} size={11} /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  {(ticket as { diagnosis?: string | null }).diagnosis || "Sin diagnóstico registrado"}
                </p>
              )}
            </div>

            {/* Prices breakdown */}
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Mano de obra / reparación</span>
                {editingPrice ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      autoFocus
                      type="number"
                      min={0}
                      step={0.01}
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="h-7 w-28 text-right text-sm font-mono"
                    />
                    <Button
                      size="icon"
                      className="h-7 w-7"
                      disabled={updateTicket.isPending}
                      onClick={() => {
                        const val = parseFloat(priceInput);
                        if (isNaN(val) || val < 0) { toast.error("Precio inválido"); return; }
                        updateTicket.mutate(
                          { final_amount: val },
                          { onSuccess: () => setEditingPrice(false) }
                        );
                      }}
                    >
                      <FaIcon icon={faCheck} size={11} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingPrice(false)}
                    >
                      <FaIcon icon={faXmark} size={11} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono">{formatMoney(finalAmount)}</span>
                    {!isTerminal && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setPriceInput(String(finalAmount));
                          setEditingPrice(true);
                        }}
                      >
                        <FaIcon icon={faPen} size={10} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {partsTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Piezas usadas</span>
                  <span className="font-mono">{formatMoney(partsTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-1 border-t border-border/50">
                <span>Total</span>
                <span className="font-mono text-primary">{formatMoney(grandTotal || null)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Piezas Usadas (editable) ── */}
        <Card className="border-border/50 md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FaIcon icon={faBox} size={16} className="text-muted-foreground" /> Piezas / Repuestos Usados
                {ticketItems.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4">
                    {ticketItems.length}
                  </Badge>
                )}
              </CardTitle>
              {/* Solo se pueden agregar piezas mientras el ticket NO esté completado/entregado/fallido */}
              {!isTerminal && currentStatus !== "completado" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={openAddDialog}
                >
                  <FaIcon icon={faPlus} size={12} /> Agregar pieza
                </Button>
              )}
              {(isTerminal || currentStatus === "completado") && (
                <span className="text-[10px] text-muted-foreground bg-muted/40 border border-border/40 rounded px-2 py-1">
                  {currentStatus === "entregado" ? "Ticket cerrado" : "Lista bloqueada"}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingItems ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : ticketItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                <FaIcon icon={faCartShopping} size={32} className="opacity-20" />
                <p className="text-xs text-center">
                  Sin piezas agregadas aún.<br />
                  Toca &quot;Agregar pieza&quot; para incluir repuestos del inventario.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {ticketItems.map((item) => {
                  const name = [item.inventory?.brand, item.inventory?.name]
                    .filter(Boolean).join(" ") || "—";
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 py-2 px-3 rounded-lg border ${item.add_to_total === false ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/30 border-border/40"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {item.add_to_total === false && (
                            <Badge variant="outline" className="text-[10px] h-4 text-amber-500 border-amber-500/30 shrink-0">
                              Solo stock
                            </Badge>
                          )}
                        </div>
                        {item.inventory?.sku && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            SKU: {item.inventory.sku}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatMoney(item.unit_price)}
                        </p>
                        <p className={`text-sm font-semibold font-mono ${item.add_to_total === false ? "text-muted-foreground line-through" : ""}`}>
                          {formatMoney(item.quantity * item.unit_price)}
                        </p>
                      </div>
                      {/* Botón eliminar: solo si el ticket todavía es editable */}
                      {!isTerminal && currentStatus !== "completado" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 hover:text-destructive hover:bg-destructive/10"
                          disabled={removeItemMutation.isPending}
                          onClick={() => removeItemMutation.mutate({
                            itemId:      item.id,
                            ticketId:    id,
                            inventoryId: item.inventory_id,
                            quantity:    item.quantity,
                          })}
                        >
                          <FaIcon icon={faTrash} size={14} />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {/* Parts subtotal */}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Subtotal piezas</span>
                  <span className="font-mono">{formatMoney(partsTotal)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Fotos de Ingreso ── */}
        {(() => {
          const images = (ticket as any).ticket_images as { id: string; image_url: string; image_type: string }[] | undefined;
          if (!images || images.length === 0) return null;
          return (
            <Card className="border-border/50 md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FaIcon icon={faCamera} size={16} className="text-muted-foreground" /> Fotos de Ingreso
                  <Badge variant="secondary" className="text-[10px] h-4">{images.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {images.map((img) => (
                    <a
                      key={img.id}
                      href={img.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/30 hover:border-primary/50 transition-colors group"
                    >
                      <img
                        src={img.image_url}
                        alt="Foto de ingreso"
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* ── Historial ── */}
        <Card className="border-border/50 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FaIcon icon={faClock} size={16} className="text-muted-foreground" /> Historial
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin cambios de estado aún</p>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="w-px bg-border self-stretch mx-2 mt-2" />
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.status_from && <TicketStatusBadge status={h.status_from} />}
                        <span className="text-muted-foreground text-xs">→</span>
                        <TicketStatusBadge status={h.status_to} />
                      </div>
                      {h.notes && (
                        <p className="text-xs text-muted-foreground">{h.notes}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60">
                        {h.profiles?.full_name ?? "Sistema"} ·{" "}
                        {format(new Date(h.created_at), "dd MMM HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Agregar Pieza Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaIcon icon={faBox} size={16} className="text-primary" /> Agregar pieza al ticket
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            {!selectedInv ? (
              <>
                <div className="relative">
                  <FaIcon icon={faMagnifyingGlass} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar repuesto, producto, marca…"
                    value={searchPieza}
                    onChange={(e) => setSearchPieza(e.target.value)}
                    autoFocus
                  />
                </div>
                <ScrollArea className="h-64 rounded-lg border border-border/50">
                  {filteredInv.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                      <FaIcon icon={faTriangleExclamation} size={24} className="opacity-30" />
                      <p className="text-xs">
                        {inventory.length === 0 ? "Sin ítems en inventario" : "Sin resultados"}
                      </p>
                    </div>
                  ) : (
                    <div className="p-1 space-y-1">
                      {filteredInv.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => selectInventoryItem(item)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-primary/5 hover:border-primary/30 border border-transparent transition-all text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {[item.brand, item.name].filter(Boolean).join(" ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Stock: {item.quantity} · {
                                item.item_type === "repuesto_propio" ? "Rep. Propio" :
                                item.item_type === "repuesto_comprado" ? "Repuesto" : "Producto"
                              }
                            </p>
                          </div>
                          {/* Show ONLY sell_price — never cost_price */}
                          {item.sell_price != null ? (
                            <span className="font-mono text-sm shrink-0 ml-2">
                              {formatMoney(item.sell_price)}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-md shrink-0 ml-2">
                              Sin precio
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              /* Selected item — configure qty & price */
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
                  <FaIcon icon={faBox} size={20} className="text-primary" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {[selectedInv.brand, selectedInv.name].filter(Boolean).join(" ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stock disponible: {selectedInv.quantity}
                    </p>
                  </div>
                  <button
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground underline shrink-0"
                    onClick={() => setSelectedInv(null)}
                  >
                    Cambiar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      min={1}
                      max={selectedInv.quantity}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Math.min(selectedInv.quantity, parseInt(e.target.value) || 1)))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Precio venta ({currencySymbol})
                      {selectedInv.sell_price == null && (
                        <span className="ml-1 text-amber-500">*</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className={parseFloat(unitPrice) === 0 ? "border-amber-500/50" : ""}
                    />
                  </div>
                </div>

                {/* Warning when item has no sell_price — admin must set it manually */}
                {selectedInv.sell_price == null && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                    <FaIcon icon={faTriangleExclamation} size={14} className="text-amber-500 mt-0.5" />
                    <p className="text-xs text-amber-500/90">
                      Este repuesto no tiene precio de venta configurado. Ingresa el precio que cobras al cliente (no el de compra).
                    </p>
                  </div>
                )}

                {/* Billing mode choice */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">¿Cómo se cobra esta pieza?</Label>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setAddToTotal(true)}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors ${addToTotal ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <div className={`mt-0.5 size-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${addToTotal ? "border-primary" : "border-muted-foreground/40"}`}>
                        {addToTotal && <div className="size-1.5 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Sumar al total</p>
                        <p className="text-xs text-muted-foreground">Se cobra {formatMoney((parseFloat(unitPrice) || 0) * qty)} adicional al ticket</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddToTotal(false)}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border text-left transition-colors ${!addToTotal ? "border-amber-500 bg-amber-500/5" : "border-border hover:border-amber-500/40"}`}
                    >
                      <div className={`mt-0.5 size-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${!addToTotal ? "border-amber-500" : "border-muted-foreground/40"}`}>
                        {!addToTotal && <div className="size-1.5 rounded-full bg-amber-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Ya incluida en el monto</p>
                        <p className="text-xs text-muted-foreground">Solo reduce el stock y documenta el uso. No suma al total.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Preview total */}
                {addToTotal && (
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2.5 border border-border/50">
                    <span className="text-sm text-muted-foreground">Se sumará al ticket</span>
                    <span className="font-mono font-semibold">
                      + {formatMoney((parseFloat(unitPrice) || 0) * qty)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            {selectedInv && (
              <Button
                onClick={handleAddPart}
                disabled={addItemMutation.isPending || !selectedInv}
                className="gap-2"
              >
                <FaIcon icon={faPlus} size={16} />
                {addItemMutation.isPending ? "Agregando…" : "Agregar pieza"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deliver Dialog (Payment options) ── */}
      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Entregar equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Garantia */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <FaIcon icon={faShieldHalved} size={14} className="text-emerald-400" />
                Garantia de esta reparacion
              </Label>

              <div className="flex items-center gap-2">
                {/* Sin garantía */}
                <button
                  type="button"
                  onClick={() => { setNoWarrantyDeliver(!noWarrantyDeliver); setWarrantyMonths(""); }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    noWarrantyDeliver
                      ? "border-amber-500 bg-amber-500/15 text-amber-400"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  Sin garantía
                </button>

                {/* Input libre de meses */}
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    placeholder="Ej: 3"
                    value={warrantyMonths}
                    disabled={noWarrantyDeliver}
                    onChange={e => { setWarrantyMonths(e.target.value); setNoWarrantyDeliver(false); }}
                    className="h-8 pr-10 text-sm disabled:opacity-40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    meses
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                {noWarrantyDeliver
                  ? "⚠ Sin garantía — no se registrará garantía"
                  : warrantyMonths
                    ? `${warrantyMonths} mes(es) · ${parseInt(warrantyMonths) * 30} días desde hoy`
                    : "Ingresa los meses de garantía"}
              </p>
            </div>

            {/* Pago — fiado SOLO si hay cliente registrado */}
            <div className="space-y-2">
              <Label>Estado de pago</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagado">Liquidado / Pagado al contado</SelectItem>
                  {/* Fiado SOLO para clientes registrados */}
                  {(ticket as any).customer_id && (
                    <SelectItem value="fiado">Fiado / Cuenta por cobrar</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {/* Info para clientes sin registro */}
              {!(ticket as any).customer_id && (
                <p className="text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-lg px-3 py-2">
                  Los clientes sin registro deben liquidar en el momento. Para habilitar cuenta corriente, registra el cliente primero.
                </p>
              )}
            </div>

            {paymentStatus === "pagado" && (
              <div className="space-y-2">
                <Label>Metodo de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona metodo de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta (POS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {paymentStatus === "fiado" && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex gap-2">
                <FaIcon icon={faTriangleExclamation} size={16} className="text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-500/90 leading-relaxed">
                  El cliente retira el equipo pero la reparacion no se suma a ingresos del dia. Puedes regularizar la deuda en Por Cobrar.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDeliverOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleDeliverConfirm} disabled={statusMutation.isPending}>
                {paymentStatus === "pagado" ? "Cerrar y generar comprobante" : "Cerrar ticket"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Share tracking link dialog ── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaIcon icon={faShareNodes} size={14} className="text-primary" />
              Compartir seguimiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex justify-center bg-white p-3 rounded-xl">
              <QRCode value={trackingUrl} size={140} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">El cliente puede escanear el QR o abrir este enlace:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[10px] bg-muted px-2 py-1.5 rounded break-all">
                  {trackingUrl}
                </code>
                <Button
                  variant="outline" size="icon" className="size-8 shrink-0"
                  onClick={() => { navigator.clipboard.writeText(trackingUrl); toast.success("Enlace copiado"); }}
                >
                  <FaIcon icon={faShareNodes} size={11} />
                </Button>
              </div>
            </div>
            {customerPhone && (
              <a
                href={`https://wa.me/${customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, puedes seguir el estado de tu reparación aquí: ${trackingUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#22c55e] text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <FaIcon icon={faShareNodes} size={13} />
                Enviar por WhatsApp
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden QR div — rendered in DOM so getQrSvg() can read its outerHTML */}
      <div ref={qrRef} className="sr-only" aria-hidden>
        <QRCode value={trackingUrl} size={72} />
      </div>

      {/* ── Document selector (after paid delivery) ── */}
      <DocSelectorDialog
        open={docOpen}
        onOpenChange={setDocOpen}
        currencyCode={org?.currency_code ?? "PEN"}
        defaultCustomerName={(t.guest_name as string | null) ?? customer?.full_name ?? ""}
        defaultCustomerPhone={(t.guest_phone as string | null) ?? customer?.phone ?? ""}
        defaultCustomerId={(ticket.customer_id as string | null) ?? ""}
        clientes={(clientes as { id: string; full_name: string; phone: string | null; document_id: string | null }[])}
        total={grandTotal}
        currencySymbol={currencySymbol}
        isGuestTicket={!ticket.customer_id}
        onSkip={() => setDocOpen(false)}
        onAction={async (action, docType, custName, custPhone, custTaxId) => {
          if (!org) return;
          const fiscalCfg = getFiscalConfig(org.currency_code ?? "PEN");
          const taxPct   = org.tax_percentage ?? 18;
          const showIgv  = org.show_tax_breakdown ?? true;
          const total    = grandTotal;
          const subtotal = showIgv ? total / (1 + taxPct / 100) : total;
          const orgPrefix = org.ticket_prefix ?? "TK";
          const docLetter = docType === "boleta" ? "B"
            : docType === "factura" || docType === "factura_b" ? "F"
            : docType === "nota_fiscal" ? "NF"
            : "N";
          const receiptItems: { name: string; qty: number; unitPrice: number }[] = [];
          if (finalAmount > 0) {
            const deviceStr  = [device.brand, device.model].filter(Boolean).join(" ") || "Equipo";
            const diagnosisStr = (ticket as { diagnosis?: string | null }).diagnosis;
            const serviceName = diagnosisStr
              ? `${diagnosisStr} - ${deviceStr}`
              : `Servicio de reparacion - ${deviceStr}`;
            receiptItems.push({ name: serviceName, qty: 1, unitPrice: finalAmount });
          }
          // Solo incluir repuestos que SÍ suman al total (add_to_total !== false).
          // Los marcados como "Ya incluida en el monto" ya están dentro de finalAmount,
          // no deben aparecer en la boleta ni duplicar el total del comprobante.
          ticketItems
            .filter((ti) => ti.add_to_total !== false)
            .forEach((ti) => {
              const inv = (ti as any).inventory;
              receiptItems.push({
                name:      [inv?.brand, inv?.name].filter(Boolean).join(" ") || "Repuesto",
                qty:       ti.quantity,
                unitPrice: ti.unit_price,
              });
            });
          
          const receiptData = {
            docType,
            currencyCode: org.currency_code ?? "PEN",
            docNumber: `${orgPrefix}-${docLetter}${ticket.id.slice(-5).toUpperCase()}`,
            date: new Date().toISOString(),
            orgName:    org.name,
            orgAddress: org.address,
            orgPhone:   org.phone,
            orgTaxId:   org.tax_id_number ?? null,
            orgTaxLabel: org.tax_id_name ?? fiscalCfg.taxIdLabel,
            orgLogoUrl: org.logo_url,
            showLogo:   org.show_logo_on_print ?? true,
            printWidth: (org.print_width_mm ?? 58) as 58 | 80,
            customerName:  custName,
            customerTaxId: custTaxId || null,
            customerPhone: custPhone || null,
            items:    receiptItems,
            subtotal,
            taxPct,
            taxLabel:  fiscalCfg.taxLabel,
            showIgv,
            total,
            paymentMethod,
            notes:   org.receipt_notes,
            footer:  org.receipt_footer ?? null,
            warrantyDays: (ticket as any).warranty_days ?? 360,
            warrantyNotes: (ticket as any).warranty_notes ?? null,
            trackingQrSvg: getQrSvg(),
            trackingUrl,
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
              ticketId: ticket.id,
              customerId: ticket.customer_id || undefined,
            });
          } catch (err) {
            console.error("Error saving receipt:", err);
          }
        }}
      />

    </div>
  );

}

"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useClientes } from "@/hooks/useClientes";
import {
  useOtroServicio,
  useUpdateOtroServicioStatus,
} from "@/hooks/useOtrosServicios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  faArrowLeft, faPhone, faMobileScreen, faTag, faUser, faShieldHalved,
  faTriangleExclamation, faXmark, faDollarSign, faClock, faBuildingColumns,
  faCreditCard, faLockOpen, faHashtag, faCircleInfo, faLock, faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { printOtroServicioNota } from "@/components/print/NotaServicioPrint";
import { useGarantiaByServicio } from "@/hooks/useGarantias";
import { ServicioHistoryTimeline } from "@/components/ui-custom/ServicioHistoryTimeline";
import Link from "next/link";

// ── Tipo extendido para campos del join de Supabase ───────────────────────────
interface ServicioExtended {
  customers:       { full_name?: string; phone?: string } | null;
  assigned_profile: { full_name?: string } | null;
  warranty_days:   number | null;
  payment_method:  string | null;
  warranty_notes:  string | null;
  internal_notes:  string | null;
}


// ── Status config (same as otros-servicios/page.tsx) ─────────────────────────

type ServiceStatus = "pendiente" | "en_proceso" | "completado" | "entregado" | "fallido" | "cancelado";

const STATUS_CONFIG: Record<ServiceStatus, { label: string; className: string }> = {
  pendiente:  { label: "Pendiente",  className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  en_proceso: { label: "En Proceso", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  completado: { label: "Listo para entregar", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  entregado:  { label: "Entregado",  className: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  fallido:    { label: "Fallido",    className: "bg-red-500/20 text-red-300 border-red-500/30" },
  cancelado:  { label: "Cancelado",  className: "bg-muted text-muted-foreground border-border" },
};

const TERMINAL_OS: ServiceStatus[] = ["entregado", "fallido", "cancelado"];

const OS_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  pendiente:  ["en_proceso", "completado", "fallido", "cancelado"],
  en_proceso: ["pendiente",  "completado", "fallido"],
  completado: ["entregado"],
  entregado:  [],
  fallido:    [],
  cancelado:  [],
};

const PAYMENT_METHODS = [
  { value: "efectivo",      label: "Efectivo",      icon: faMoneyBillWave },
  { value: "transferencia", label: "Transferencia", icon: faBuildingColumns },
  { value: "tarjeta",       label: "Tarjeta",       icon: faCreditCard },
];

function OSStatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = STATUS_CONFIG[status as ServiceStatus] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-xs font-medium border ${cfg.className} ${className ?? ""}`}>
      {cfg.label}
    </Badge>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OtroServicioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params.id as string;

  const { org, formatCurrency } = useOrganization();
  const { data: servicio, isLoading } = useOtroServicio(id);
  const statusMutation = useUpdateOtroServicioStatus();
  const { data: clientes = [] } = useClientes();
  const { data: garantia } = useGarantiaByServicio(id);

  // Deliver dialog state
  const [deliverOpen,       setDeliverOpen]       = useState(false);
  const [paymentStatus,     setPaymentStatus]     = useState("pagado");
  const [paymentMethod,     setPaymentMethod]     = useState("efectivo");
  const [warrantyMonths,    setWarrantyMonths]    = useState<string>("");
  const [noWarrantyDeliver, setNoWarrantyDeliver] = useState(false);

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

  if (!servicio) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground">Servicio no encontrado</p>
        <Button variant="outline" onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  const currentStatus = servicio.status as ServiceStatus;
  const isTerminal    = TERMINAL_OS.includes(currentStatus);
  const allowedNext   = OS_TRANSITIONS[currentStatus] ?? [];

  const svc = servicio as unknown as ServicioExtended;
  const customer     = svc.customers;
  const techName     = svc.assigned_profile?.full_name;
  const hasRegisteredClient = !!servicio.customer_id;
  const clientName   = (servicio.guest_name as string | null)
    ?? customer?.full_name
    ?? clientes.find(c => c.id === servicio.customer_id)?.full_name
    ?? "Cliente";

  const handleStatusChange = (newStatus: ServiceStatus) => {
    if (newStatus === "entregado") {
      const svcDays   = svc.warranty_days;
      const srcDays   = svcDays ?? 360;
      const preMonths = Math.max(1, Math.round(srcDays / 30));
      setWarrantyMonths(svcDays === 0 ? "" : String(preMonths));
      setNoWarrantyDeliver(svcDays === 0);
      setPaymentStatus("pagado");
      setPaymentMethod("efectivo");
      setDeliverOpen(true);
    } else {
      statusMutation.mutate(
        { id: servicio.id, status: newStatus },
        { onSuccess: () => toast.success(`Estado actualizado a ${STATUS_CONFIG[newStatus]?.label}`) }
      );
    }
  };

  const handleDeliverConfirm = () => {
    statusMutation.mutate(
      {
        id:             servicio.id,
        status:         "entregado",
        payment_status: paymentStatus,
        payment_method: paymentStatus === "pagado" ? paymentMethod : undefined,
        warranty_days:  noWarrantyDeliver ? 0 : (parseInt(warrantyMonths) || 12) * 30,
      },
      {
        onSuccess: () => {
          setDeliverOpen(false);
          toast.success("Servicio entregado al cliente ✓");
        },
      }
    );
  };

  const tags = (servicio.tags as string[] | null) ?? [];

  return (
    <div className="space-y-4 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8 self-start" onClick={() => router.back()}>
          <FaIcon icon={faArrowLeft} size={14} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FaIcon icon={faLockOpen} size={14} className="text-violet-400" />
            <h1 className="text-lg font-bold font-mono">
              #{servicio.id.slice(0, 8).toUpperCase()}
            </h1>
            <OSStatusBadge status={currentStatus} />
            {techName && (
              <Badge variant="outline" className="text-blue-400 border-blue-400/40 text-xs gap-1">
                {techName}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Creado {format(new Date(servicio.created_at), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1"
            onClick={() => printOtroServicioNota(servicio, org)}>
            Imprimir nota
          </Button>

          {/* Estado selector */}
          {isTerminal ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 text-sm">
              <OSStatusBadge status={currentStatus} />
              <span className="text-xs text-muted-foreground">Estado final</span>
            </div>
          ) : (
            <Select
              value={currentStatus}
              onValueChange={v => handleStatusChange(v as ServiceStatus)}
              disabled={statusMutation.isPending}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={currentStatus} disabled>
                  {STATUS_CONFIG[currentStatus]?.label} (actual)
                </SelectItem>
                {allowedNext.map(s => (
                  <SelectItem key={s} value={s}>
                    {STATUS_CONFIG[s]?.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── Garantía widget ── */}
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
          {!garantia.is_active ? <FaIcon icon={faXmark} size={14} /> :
           garantia.days_remaining < 0 ? <FaIcon icon={faXmark} size={14} /> :
           garantia.days_remaining <= 7 ? <FaIcon icon={faTriangleExclamation} size={12} /> :
           <FaIcon icon={faShieldHalved} size={12} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {!garantia.is_active ? "Garantía anulada" :
               garantia.days_remaining < 0 ? "Garantía vencida" :
               garantia.days_remaining === 0 ? "Garantía vence hoy" :
               `Garantía vigente — ${garantia.days_remaining} día${garantia.days_remaining !== 1 ? "s" : ""} restante${garantia.days_remaining !== 1 ? "s" : ""}`}
            </p>
            <p className="text-xs text-muted-foreground">Vence: {garantia.end_date}</p>
          </div>
          <Link href="/garantias">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0">
            <FaIcon icon={faShieldHalved} size={11} /> Ver garantías
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Cliente ── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FaIcon icon={faUser} size={13} className="text-muted-foreground" /> Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {servicio.guest_name ? (
              <>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold">{servicio.guest_name as string}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                    Sin registro
                  </span>
                </div>
                {(servicio.guest_phone as string | null) && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                  <FaIcon icon={faPhone} size={11} className="shrink-0" /> {servicio.guest_phone as string}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">{customer?.full_name ?? clientName}</p>
                {customer?.phone && (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                  <FaIcon icon={faPhone} size={11} className="shrink-0" /> {customer.phone}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/*Servicio */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FaIcon icon={faLockOpen} size={13} className="text-violet-400" /> Detalle del servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-[10px] px-1.5 gap-0.5">
                    <FaIcon icon={faTag} size={10} /> {t}
                  </Badge>
                ))}
              </div>
            )}
            {/* Dispositivo */}
            {(servicio.device_brand || servicio.device_model) && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FaIcon icon={faMobileScreen} size={12} className="text-muted-foreground shrink-0" />
                <span>{[servicio.device_brand, servicio.device_model].filter(Boolean).join(" ")}</span>
              </div>
            )}
            {(servicio.imei as string | null) && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FaIcon icon={faHashtag} size={11} className="text-muted-foreground shrink-0" />
                <span className="font-mono text-xs">{servicio.imei as string}</span>
              </div>
            )}
            {/* Clave */}
            {(servicio.has_pin as boolean | null) && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FaIcon icon={faLock} size={11} className="text-muted-foreground shrink-0" />
                <span>{servicio.pin_code as string | null ?? "Tiene clave"}</span>
              </div>
            )}
            {/* Descripción */}
            {(servicio.description as string | null) && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <FaIcon icon={faCircleInfo} size={11} className="text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">{servicio.description as string}</span>
              </div>
            )}
            {/* Proveedor */}
            {(servicio.provider as string | null) && (
              <p className="text-xs text-muted-foreground">
                Proveedor: <span className="font-medium text-foreground">{servicio.provider as string}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Pago ── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FaIcon icon={faDollarSign} size={13} className="text-muted-foreground" /> Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Precio acordado</span>
              <span className="font-mono font-semibold">{formatCurrency(servicio.price as number ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              {(servicio.paid as boolean | null) ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  Cobrado
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                  Pendiente
                </Badge>
              )}
            </div>
            {svc.payment_method && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Método</span>
                <span className="capitalize">{svc.payment_method}</span>
              </div>
            )}
            {svc.warranty_notes && (
              <div className="flex items-start gap-1.5 text-muted-foreground pt-1">
                <FaIcon icon={faShieldHalved} size={11} className="shrink-0 mt-0.5 text-emerald-400" />
                <span className="text-xs">{svc.warranty_notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Notas internas ── */}
        {svc.internal_notes && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FaIcon icon={faCircleInfo} size={13} className="text-muted-foreground" /> Notas internas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {svc.internal_notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Historial de estados */}
        <Card className="border-border/50 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FaIcon icon={faClock} size={13} className="text-muted-foreground" /> Historial de cambios
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ServicioHistoryTimeline servicioId={id} />
          </CardContent>
        </Card>
      </div>

      {/* Deliver Dialog (Entregar al cliente) */}
      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Entregar servicio al cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Resumen */}
            <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-sm space-y-0.5">
              <p className="font-medium">{clientName}</p>
              <p className="text-muted-foreground">
                Precio: <span className="font-mono font-semibold text-foreground">{formatCurrency(servicio.price as number ?? 0)}</span>
              </p>
            </div>

            {/* Garantía */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <FaIcon icon={faShieldHalved} size={11} className="text-emerald-400" />
                Garantía de este servicio
              </Label>
              <div className="flex items-center gap-2">
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
                <div className="relative flex-1">
                  <Input
                    type="number" min={1} max={120}
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

            {/* Pago */}
            <div className="space-y-2">
              <Label>Estado de pago</Label>
              <div className={`grid gap-2 ${hasRegisteredClient ? "grid-cols-2" : "grid-cols-1"}`}>
                <button type="button" onClick={() => setPaymentStatus("pagado")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                    paymentStatus === "pagado"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-border/60 text-muted-foreground hover:border-border"
                  }`}>
                  <FaIcon icon={faDollarSign} size={18} />
                  Cobrado ya
                </button>
                {hasRegisteredClient && (
                  <button type="button" onClick={() => setPaymentStatus("fiado")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                      paymentStatus === "fiado"
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-border/60 text-muted-foreground hover:border-border"
                    }`}>
                    <FaIcon icon={faClock} size={18} />
                    A cuenta
                  </button>
                )}
              </div>
              {!hasRegisteredClient && (
                <p className="text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-lg px-3 py-2">
                  Los clientes sin registro deben pagar al entregar. Para habilitar cuenta corriente, registra el cliente primero.
                </p>
              )}
            </div>

            {/* Método de pago */}
            {paymentStatus === "pagado" && (
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} type="button"
                      onClick={() => setPaymentMethod(m.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        paymentMethod === m.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:border-border"
                      }`}>
                      <FaIcon icon={m.icon} size={14} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleDeliverConfirm}
              disabled={statusMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {statusMutation.isPending ? "Guardando..." : "Confirmar entrega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

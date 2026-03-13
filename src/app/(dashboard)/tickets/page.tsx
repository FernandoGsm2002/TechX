"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  faPlus, faTicket, faArrowRight, faPowerOff, faLock, faLockOpen,
  faCamera, faXmark, faUpload, faSpinner, faUserSlash, faUser,
  faChevronDown, faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { ShieldCheck } from "lucide-react";
import { FaIcon } from "@/components/ui-custom/FaIcon";
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
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import { TicketStatusBadge, STATUS_CONFIG } from "@/components/ui-custom/TicketStatusBadge";
import {
  useTickets, useCreateTicket, uploadIntakePhoto,
  type TicketWithRelations, type CreateTicketPayload,
} from "@/hooks/useTickets";
import { useClientes } from "@/hooks/useClientes";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { TicketStatus, DeviceDetails } from "@/types/domain";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES = Object.keys(STATUS_CONFIG) as TicketStatus[];

const DEVICE_TYPES = ["Celular", "Tablet", "Laptop", "PC", "Consola", "Smartwatch", "Otro"];

const LOCK_TYPES = [
  { value: "pin",      label: "PIN numérico" },
  { value: "patron",   label: "Patrón" },
  { value: "password", label: "Contraseña" },
  { value: "huella",   label: "Huella / Biométrico" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDeviceLabel(ticket: TicketWithRelations) {
  const d = (ticket.device_details ?? {}) as DeviceDetails;
  const parts = [d.brand, d.model].filter(Boolean).join(" ");
  return { label: parts || "—", type: d.type ?? "" };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const { org, currencySymbol, role, userId, formatCurrency } = useOrganization();
  const isAdmin = role === "admin" || role === "superadmin";
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const { data: tickets = [], isLoading } = useTickets(
    statusFilter === "all" ? undefined : statusFilter,
    { role, userId }
  );
  const { data: clientes = [] } = useClientes();
  const createMutation = useCreateTicket();
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [customerId,      setCustomerId]      = useState("");
  const [guestMode,       setGuestMode]       = useState(false);  // walk-in
  const [guestFirstName,  setGuestFirstName]  = useState("");     // nombre(s) walk-in
  const [guestLastName,   setGuestLastName]   = useState("");     // apellido walk-in
  const [guestPhone,      setGuestPhone]      = useState("");
  const [deviceType,      setDeviceType]      = useState("");
  const [deviceBrand,     setDeviceBrand]     = useState("");
  const [deviceModel,     setDeviceModel]     = useState("");
  const [imei,            setImei]            = useState("");
  const [issue,           setIssue]           = useState("");
  const [finalAmount,     setFinalAmount]     = useState("");
  const [powerOn,         setPowerOn]         = useState<boolean>(true);
  const [hasLock,         setHasLock]         = useState<boolean>(false);
  const [lockType,        setLockType]        = useState("");
  const [lockCode,        setLockCode]        = useState("");
  const [intakeNotes,     setIntakeNotes]     = useState("");
  // Garantia: meses + condiciones especificas de esta reparacion
  const [warrantyMonthsCreate, setWarrantyMonthsCreate] = useState<string>("12");
  const [warrantyNotesCreate,  setWarrantyNotesCreate]  = useState("");
  const [noWarranty,           setNoWarranty]           = useState(false);
  // Acordeon de terminos del taller (solo lectura)
  const [termsOpen,            setTermsOpen]            = useState(false);

  // Photo upload state
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ── Errors ────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (guestMode) {
      if (!guestFirstName.trim()) e.guestFirstName = "Ingresa el nombre del cliente";
    } else {
      if (!customerId) e.customer = "Selecciona un cliente";
    }
    if (!deviceType.trim())      e.deviceType = "Ingresa el tipo de dispositivo";
    if (issue.trim().length < 5) e.issue      = "Describe el problema (mín. 5 caracteres)";
    if (hasLock && !lockType)    e.lockType   = "Selecciona el tipo de clave";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Photo handlers ────────────────────────────────────────────────────────
  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La foto no debe superar 5 MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current)  fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (!org?.id) { toast.error("No se encontró la organización"); return; }

    setIsSubmitting(true);
    try {
      const device: DeviceDetails = {
        type:  deviceType,
        brand: deviceBrand || undefined,
        model: deviceModel || undefined,
        imei:  imei || undefined,
      };

      const guestFullName = [guestFirstName.trim(), guestLastName.trim()].filter(Boolean).join(" ") || null;

      const payload: CreateTicketPayload = {
        organization_id: org.id,
        customer_id:     guestMode ? null : customerId,
        guest_name:      guestMode ? guestFullName : null,
        guest_phone:     guestMode ? (guestPhone.trim() || null) : null,
        status:          "recibido",
        device_details:  device as Record<string, unknown>,
        reported_issue:  issue,
        final_amount:    finalAmount ? parseFloat(finalAmount) : null,
        power_on:        powerOn,
        has_lock:        hasLock,
        lock_type:       hasLock ? lockType : null,
        lock_code:       hasLock && lockType !== "huella" ? lockCode || null : null,
        intake_notes:    intakeNotes || null,
        warranty_days:   noWarranty
          ? 0
          : warrantyMonthsCreate
            ? parseInt(warrantyMonthsCreate) * 30
            : 360,
        warranty_notes:  warrantyNotesCreate.trim() || null,
      };

      const created = await createMutation.mutateAsync(payload);

      // Upload photo after ticket creation
      if (photoFile && created?.id) {
        try {
          await uploadIntakePhoto(created.id, photoFile, org.id);
        } catch {
          toast.warning("Ticket creado, pero falló la subida de la foto");
        }
      }

      // Reset form
      setCustomerId(""); setGuestFirstName(""); setGuestLastName(""); setGuestPhone(""); setGuestMode(false);
      setDeviceType(""); setDeviceBrand(""); setDeviceModel("");
      setImei(""); setIssue(""); setFinalAmount(""); setPowerOn(true);
      setHasLock(false); setLockType(""); setLockCode(""); setIntakeNotes("");
      setWarrantyMonthsCreate("12"); setWarrantyNotesCreate(""); setNoWarranty(false); setTermsOpen(false);
      removePhoto();
      setDialogOpen(false);
    } catch {
      // error handled by mutation onError
    } finally {
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customerId, guestMode, guestFirstName, guestLastName, guestPhone,
    deviceType, deviceBrand, deviceModel, imei, issue,
    finalAmount, powerOn, hasLock, lockType, lockCode, intakeNotes,
    warrantyMonthsCreate, warrantyNotesCreate, noWarranty,
    photoFile, org, createMutation,
  ]);

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: DataColumn<TicketWithRelations>[] = [
    {
      key: "id",
      header: "#",
      cell: (row) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.id.slice(0, 8).toUpperCase()}
        </span>
      ),
      className: "w-24",
      showOnMobile: false,
    },
    {
      key: "customer",
      header: "Cliente",
      primary: true,
      cell: (row) => {
        const name    = row.customers?.full_name ?? row.guest_name;
        const isGuest = !row.customers?.full_name && !!row.guest_name;
        return (
          <div>
            <p className="font-medium text-sm flex items-center gap-1.5">
              {name ?? <span className="text-muted-foreground italic">Sin nombre</span>}
              {isGuest && (
                <span className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-500 rounded font-medium">
                  Walk-in
                </span>
              )}
            </p>
            {row.customers?.phone && (
              <p className="text-xs text-muted-foreground">{row.customers.phone}</p>
            )}
            {isGuest && row.guest_phone && (
              <p className="text-xs text-muted-foreground">{row.guest_phone}</p>
            )}
          </div>
        );
      },
    },

    {
      key: "device",
      header: "Dispositivo",
      cell: (row) => {
        const { label, type } = getDeviceLabel(row);
        return (
          <div>
            <p className="text-sm">{label}</p>
            <p className="text-xs text-muted-foreground capitalize">{type}</p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <TicketStatusBadge status={row.status} />
          {row.power_on === false && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/40">
              Apagado
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "final_amount",
      header: "Total",
      cell: (row) => {
        const itemsTotal = (row.ticket_items ?? []).reduce(
          (s, i) => s + Number(i.unit_price) * Number(i.quantity), 0
        );
        const base  = row.final_amount != null ? Number(row.final_amount) : null;
        const total = base != null ? base + itemsTotal : null;
        return (
          <div className="flex flex-col gap-0.5">
            {total != null ? (
              <span className="font-mono text-sm font-medium">
                {formatCurrency(total)}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
            {row.payment_status === "fiado" && (
              <span className="text-[9px] font-semibold text-amber-500 uppercase tracking-wide">Fiado</span>
            )}
            {row.payment_status === "pagado" && row.status === "entregado" && (
              <span className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wide">Cobrado</span>
            )}
          </div>
        );
      },
    },
    {
      key: "created_at",
      header: "Fecha",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.created_at), "dd MMM", { locale: es })}
        </span>
      ),
      className: "hidden md:table-cell",
      showOnMobile: false,
    },
    ...(isAdmin ? [{
      key: "technician",
      header: "Técnico",
      cell: (row: TicketWithRelations) => {
        const name = (row.profiles as { full_name: string | null } | null)?.full_name;
        return name
          ? <span className="text-xs bg-blue-500/10 text-blue-400 rounded px-1.5 py-0.5">{name}</span>
          : <span className="text-xs text-muted-foreground">—</span>;
      },
      className: "hidden md:table-cell",
      showOnMobile: false,
    } as DataColumn<TicketWithRelations>] : []),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FaIcon icon={faTicket} size={18} /> Tickets
          </h1>
          <p className="text-sm text-muted-foreground">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
            {statusFilter !== "all" && ` · ${STATUS_CONFIG[statusFilter].label}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 h-9">
            <FaIcon icon={faPlus} size={14} /> Nuevo Ticket
          </Button>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        data={tickets}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Buscar cliente, dispositivo..."
        searchKeys={["status"]}
        emptyMessage="Sin tickets con ese filtro"
        emptyIcon={<FaIcon icon={faTicket} size={28} className="opacity-30" />}
        actions={(row) => (
          <Button asChild variant="ghost" size="icon" className="size-7">
            <Link href={`/tickets/${row.id}`}>
              <FaIcon icon={faArrowRight} size={13} />
            </Link>
          </Button>
        )}
      />

      {/* ── Create Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!isSubmitting) setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Ticket de Reparación</DialogTitle>
          </DialogHeader>

          {/* ── Banner fiscal de la empresa (solo lectura) ── */}
          {org && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border/50 px-3 py-2 text-xs text-muted-foreground">
              <FaIcon icon={faUser} size={10} className="shrink-0 text-primary" />
              <span className="font-medium text-foreground">{org.name}</span>
              {org.tax_id_number && (
                <span className="text-muted-foreground">
                  &middot; {(org as any).tax_id_name ?? "RUC"}: {org.tax_id_number}
                </span>
              )}
              <span className="text-muted-foreground">&middot; {currencySymbol} ({(org as any).currency_code ?? "PEN"})</span>
            </div>
          )}

          <div className="space-y-5 py-1">

            {/* ── Cliente ── */}
            <div className="space-y-2">
              {/* Toggle registered / guest */}
              <div className="flex items-center justify-between">
                <Label>Cliente</Label>
                <button
                  type="button"
                  onClick={() => { setGuestMode(!guestMode); setCustomerId(""); setGuestFirstName(""); setGuestLastName(""); setGuestPhone(""); }}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    guestMode
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/40"
                      : "bg-muted text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  <FaIcon icon={guestMode ? faUserSlash : faUser} size={10} />
                  {guestMode ? "Sin registro" : "Cliente registrado"}
                </button>
              </div>

              {guestMode ? (
                /* Walk-in: nombre, apellido + teléfono */
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-xs text-amber-600 font-medium">Datos del cliente (para el comprobante)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre(s) *</Label>
                      <Input
                        placeholder="Carlos"
                        value={guestFirstName}
                        onChange={(e) => setGuestFirstName(e.target.value)}
                        className="h-8 text-sm"
                      />
                      {errors.guestFirstName && <p className="text-xs text-destructive">{errors.guestFirstName}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Apellido</Label>
                      <Input
                        placeholder="Pérez"
                        value={guestLastName}
                        onChange={(e) => setGuestLastName(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teléfono</Label>
                    <Input
                      placeholder="+51 999 999 999"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ) : (
                /* Registered customer selector */
                <>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Buscar o seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(clientes as { id: string; full_name: string }[]).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customer && <p className="text-xs text-destructive">{errors.customer}</p>}
                </>
              )}
            </div>

            {/* ── Dispositivo ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dispositivo
              </p>
              <div className="grid grid-cols-3 gap-3">
                {/* Tipo */}
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={deviceType} onValueChange={setDeviceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Celular..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.deviceType && (
                    <p className="text-xs text-destructive">{errors.deviceType}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input
                    placeholder="Samsung"
                    value={deviceBrand}
                    onChange={(e) => setDeviceBrand(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Input
                    placeholder="A54"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>IMEI / N° de Serie</Label>
                <Input
                  placeholder="35XXXXXXXXX"
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                />
              </div>
            </div>

            {/* ── Checklist de Estado ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Estado al ingreso
              </p>

              {/* Encendido / Apagado */}
              <div className="space-y-2">
                <Label>¿El dispositivo enciende?</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPowerOn(true)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                      powerOn
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <FaIcon icon={faPowerOff} size={14} /> Sí, enciende
                  </button>
                  <button
                    type="button"
                    onClick={() => setPowerOn(false)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                      !powerOn
                        ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <FaIcon icon={faPowerOff} size={14} /> No enciende
                  </button>
                </div>
              </div>

              {/* Tiene clave */}
              <div className="space-y-2">
                <Label>¿Tiene clave / bloqueo de pantalla?</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHasLock(false)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                      !hasLock
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <FaIcon icon={faLockOpen} size={14} /> Sin clave
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasLock(true)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                      hasLock
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <FaIcon icon={faLock} size={14} /> Tiene clave
                  </button>
                </div>
              </div>

              {/* Detalle de clave (solo si tiene clave) */}
              {hasLock && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <div className="space-y-2">
                    <Label>Tipo de clave *</Label>
                    <Select value={lockType} onValueChange={setLockType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCK_TYPES.map((lt) => (
                          <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.lockType && (
                      <p className="text-xs text-destructive">{errors.lockType}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {lockType === "patron" ? "Descripción del patrón" : "Código / Clave"}
                      {lockType === "huella" && (
                        <span className="text-muted-foreground text-xs ml-1">(no aplica)</span>
                      )}
                    </Label>
                    <Input
                      placeholder={
                        lockType === "patron"
                          ? "Ej: esquina sup izq → centro → ..."
                          : lockType === "huella"
                          ? "—"
                          : "1234"
                      }
                      value={lockCode}
                      onChange={(e) => setLockCode(e.target.value)}
                      disabled={lockType === "huella"}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Foto del dispositivo (opcional) ── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FaIcon icon={faCamera} size={13} /> Foto del estado de ingreso
                <span className="text-muted-foreground text-xs font-normal">(opcional · máx 5 MB)</span>
              </Label>

              {photoPreview ? (
                <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-border group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Preview ingreso"
                    className="w-full object-cover max-h-48"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FaIcon icon={faXmark} size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {/* Botón principal: galería en desktop, galería en móvil */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors"
                  >
                    <FaIcon icon={faUpload} size={18} />
                    <span className="text-xs">Seleccionar foto</span>
                  </button>
                  {/* Botón cámara — solo visible en móvil (sm:hidden) */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="sm:hidden border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors px-6"
                  >
                    <FaIcon icon={faCamera} size={18} />
                    <span className="text-xs">Cámara</span>
                  </button>
                </div>
              )}

              {/* Input galería (desktop + móvil) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={onPhotoChange}
              />
              {/* Input cámara trasera — solo móvil */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={onPhotoChange}
              />
            </div>

            {/* ── Problema reportado ── */}
            <div className="space-y-2">
              <Label>Descripción del problema *</Label>
              <Textarea
                placeholder="Pantalla rota, no enciende, batería se agota rápido..."
                rows={3}
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
              {errors.issue && <p className="text-xs text-destructive">{errors.issue}</p>}
            </div>

            {/* ── Precio + Notas internas ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Precio del servicio ({currencySymbol})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="150.00"
                  value={finalAmount}
                  onChange={(e) => setFinalAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas internas de ingreso</Label>
                <Input
                  placeholder="Sin cargador, pantalla rayada..."
                  value={intakeNotes}
                  onChange={(e) => setIntakeNotes(e.target.value)}
                />
              </div>
            </div>

            {/* ── Garantia de esta reparacion ── */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5 text-sm">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                Garantía de esta reparación
                <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
              </Label>

              {/* Fila: Sin garantía toggle + input libre de meses */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setNoWarranty(!noWarranty); if (!noWarranty) setWarrantyMonthsCreate(""); }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    noWarranty
                      ? "border-amber-500 bg-amber-500/15 text-amber-400"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  Sin garantía
                </button>

                <div className="relative flex-1">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    placeholder="12"
                    value={warrantyMonthsCreate}
                    disabled={noWarranty}
                    onChange={e => { setWarrantyMonthsCreate(e.target.value); setNoWarranty(false); }}
                    className="h-8 pr-10 text-sm disabled:opacity-40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    meses
                  </span>
                </div>
              </div>

              {/* Condiciones especificas de garantia para esta reparacion */}
              {!noWarranty && (
                <Input
                  placeholder="Condiciones específicas (ej: no aplica si hay daño por agua)"
                  value={warrantyNotesCreate}
                  onChange={e => setWarrantyNotesCreate(e.target.value)}
                  className="h-8 text-sm"
                />
              )}

              <p className="text-[11px] text-muted-foreground">
                {noWarranty
                  ? "⚠ Sin garantía — no se registrará garantía al entregar"
                  : warrantyMonthsCreate
                    ? `${warrantyMonthsCreate} mes(es) · ${parseInt(warrantyMonthsCreate) * 30} días — los Términos globales del taller se añaden automáticamente al comprobante`
                    : "12 meses por defecto — los Términos globales del taller se añaden automáticamente"}
              </p>

              {/* Acordeón: Ver Términos del Taller */}
              {(org?.receipt_notes || org?.receipt_footer) && (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTermsOpen(!termsOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    <span className="font-medium">Ver Términos y Condiciones del Taller (se imprimen automáticamente)</span>
                    <FaIcon icon={termsOpen ? faChevronUp : faChevronDown} size={10} />
                  </button>
                  {termsOpen && (
                    <div className="px-3 py-2 bg-muted/20 text-xs text-muted-foreground space-y-1 border-t border-border/30">
                      {org?.receipt_notes && <p>{org.receipt_notes}</p>}
                      {org?.receipt_footer && <p className="font-medium">{org.receipt_footer}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2 min-w-32">
              {isSubmitting ? (
                <><FaIcon icon={faSpinner} size={14} className="animate-spin" /> Creando...</>
              ) : (
                <><FaIcon icon={faPlus} size={14} /> Crear Ticket</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

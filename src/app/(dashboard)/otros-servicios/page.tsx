"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  faLockOpen, faPlus, faTag, faXmark, faMobileScreen, faLock,
  faCircleCheck, faClock, faWrench, faChevronDown, faShieldHalved,
  faEllipsisVertical, faTrash, faFileLines, faDollarSign, faUser, faPhone,
  faCreditCard, faMoneyBill, faBuilding, faMagnifyingGlass,
  faHourglassHalf, faArrowTrendUp, faBan, faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { PatternLock } from "@/components/ui-custom/PatternLock";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { ClientCombobox } from "@/components/ui-custom/ClientCombobox";
import { DeviceSelectorCombobox } from "@/components/ui-custom/DeviceSelectorCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useClientes } from "@/hooks/useClientes";
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import {
  useOtrosServicios, useCreateOtroServicio, useUpdateOtroServicio,
  useDeleteOtroServicio, useOtrosServiciosStats,
  type OtroServicioRow, type CreateOtroServicioPayload,
} from "@/hooks/useOtrosServicios";
import {
  useServicioTags, useCreateServicioTag, useDeleteServicioTag,
} from "@/hooks/useServicioTags";
import { printOtroServicioNota } from "@/components/print/NotaServicioPrint";
import { getFiscalConfig } from "@/lib/fiscalConfig";
import { PhoneInput, CURRENCY_TO_DIAL } from "@/components/ui-custom/PhoneInput";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ServiceStatus = "pendiente" | "en_proceso" | "completado" | "entregado" | "fallido" | "cancelado";

const STATUSES: { value: ServiceStatus; label: string; dot: string; color: string }[] = [
  { value: "pendiente",  label: "Pendiente",          dot: "bg-amber-400",   color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { value: "en_proceso", label: "En proceso",         dot: "bg-blue-400",    color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { value: "completado", label: "Listo p/ entregar",  dot: "bg-emerald-400", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "entregado",  label: "Entregado",          dot: "bg-violet-400",  color: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  { value: "fallido",    label: "Fallido",            dot: "bg-red-400",     color: "bg-red-500/15 text-red-400 border-red-500/30" },
  { value: "cancelado",  label: "Cancelado",          dot: "bg-slate-400",   color: "bg-muted/60 text-muted-foreground border-border/60" },
];

// Estados terminales para otros_servicios
const TERMINAL_OS: ServiceStatus[] = ["entregado", "fallido", "cancelado"];

// Transiciones permitidas
const OS_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  pendiente:  ["en_proceso", "completado", "fallido", "cancelado"],
  en_proceso: ["pendiente",  "completado", "fallido"],
  completado: ["entregado"],  // solo avanzar a entregado
  entregado:  [],
  fallido:    [],
  cancelado:  [],
};

const PAYMENT_METHODS = [
  { value: "efectivo",      label: "Efectivo",       icon: faMoneyBill },
  { value: "transferencia", label: "Transferencia",  icon: faBuilding },
  { value: "tarjeta",       label: "Tarjeta",        icon: faCreditCard },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find(x => x.value === status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${s?.color ?? "bg-muted text-muted-foreground border-border"}`}>
      <span className={`size-1.5 rounded-full shrink-0 ${s?.dot ?? "bg-slate-400"}`} />
      {s?.label ?? status}
    </span>
  );
}

// ── PersistentTagInput ────────────────────────────────────────────────────────
// Tags guardados en BD por org. Click para seleccionar; × hover para borrar de DB.

function PersistentTagInput({
  selected, onChange,
}: { selected: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const { data: savedTags = [] } = useServicioTags();
  const createTag = useCreateServicioTag();
  const deleteTag = useDeleteServicioTag();

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter(t => t !== name) : [...selected, name]);
  };

  const addNew = async () => {
    const val = input.trim();
    if (!val) return;
    if (!savedTags.find(t => t.name === val)) {
      await createTag.mutateAsync(val);
    }
    if (!selected.includes(val)) onChange([...selected, val]);
    setInput("");
  };

  const handleDeleteFromDB = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    await deleteTag.mutateAsync(id);
    onChange(selected.filter(t => t !== name));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Escribe un tag y presiona Enter para guardar..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void addNew(); } }}
          className="h-9 text-sm"
        />
        <Button type="button" size="sm" variant="outline"
          onClick={() => void addNew()} className="h-9 px-3 shrink-0"
          disabled={createTag.isPending}>
          <FaIcon icon={faPlus} size={12} />
        </Button>
      </div>

      {savedTags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Guardados — click para seleccionar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {savedTags.map(tag => (
              <button key={tag.id} type="button" onClick={() => toggle(tag.name)}
                className={`group flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-all ${
                  selected.includes(tag.name)
                    ? "bg-violet-500/20 border-violet-500 text-violet-300"
                    : "border-border/60 text-muted-foreground hover:border-violet-500/50 hover:text-foreground"
                }`}>
                <FaIcon icon={faTag} size={10} className="shrink-0" />
                {tag.name}
                <span role="button"
                  onClick={(e) => void handleDeleteFromDB(e, tag.id, tag.name)}
                  className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity">
                  <FaIcon icon={faXmark} size={12} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-border/40">
          <p className="w-full text-[10px] text-muted-foreground">Seleccionados:</p>
          {selected.map(t => (
            <span key={t}
              className="flex items-center gap-1 bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
            <FaIcon icon={faTag} size={10} className="shrink-0" />{t}
              <button type="button" onClick={() => toggle(t)}
                className="hover:text-destructive ml-0.5 shrink-0">
                <FaIcon icon={faXmark} size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Formulario de creación/edición ────────────────────────────────────────────

const LOCK_TYPES = [
  { value: "pin",      label: "PIN numérico" },
  { value: "patron",   label: "Patrón" },
  { value: "password", label: "Contraseña" },
  { value: "huella",   label: "Huella / Biométrico" },
];

interface FormState {
  tags:            string[];
  deviceBrand:     string;
  deviceModel:     string;
  imeiSerial:      string;
  hasLock:         boolean;
  lockType:        string;
  lockCode:        string;
  warrantyMonths:  string;
  noWarranty:      boolean;
  warrantyNotes:   string;
  guestMode:       boolean;
  guestFirstName:  string;
  guestLastName:   string;
  guestPhone:      string;
  customerId:      string;
  price:           string;
  provider:        string;
  internalNotes:   string;
}

const EMPTY_FORM: FormState = {
  tags: [], deviceBrand: "", deviceModel: "", imeiSerial: "",
  hasLock: false, lockType: "", lockCode: "",
  warrantyMonths: "12", noWarranty: false, warrantyNotes: "",
  guestMode: true,
  guestFirstName: "", guestLastName: "", guestPhone: "",
  customerId: "",
  price: "", provider: "", internalNotes: "",
};

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: OtroServicioRow | null;
  onClose: () => void;
}

function ServiceForm({ open, onOpenChange, editing, onClose }: ServiceFormProps) {
  const { org, userId, role } = useOrganization();
  const isAdmin = role === "admin" || role === "superadmin";
  const { data: clientes = [] } = useClientes();
  const createMut = useCreateOtroServicio();
  const updateMut = useUpdateOtroServicio();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  React.useEffect(() => {
    if (open) {
      if (editing) {
        const guestNameParts = editing.guest_name?.split(" ") ?? [];
        const guestFirstName = guestNameParts[0] ?? "";
        const guestLastName = guestNameParts.slice(1).join(" ") ?? "";

        setForm({
          tags:          editing.tags ?? [],
          deviceBrand:   editing.device_brand ?? "",
          deviceModel:   editing.device_model ?? "",
          imeiSerial:    editing.imei ?? editing.serial ?? "",
          hasLock:       editing.has_pin ?? false,
          lockType:      editing.pin_code && editing.pin_code.includes(",") ? "patron" : (editing.has_pin ? "pin" : ""),
          lockCode:      editing.pin_code ?? "",
          warrantyMonths: editing.warranty_days === 0
            ? ""
            : editing.warranty_days
              ? String(Math.max(1, Math.round(editing.warranty_days / 30)))
              : String(Math.round((org?.otros_servicios_warranty_days ?? org?.warranty_days ?? 360) / 30)),
          noWarranty:    editing.warranty_days === 0,
          warrantyNotes: editing.warranty_notes ?? "",
          guestMode:     !editing.customer_id,
          guestFirstName: guestFirstName,
          guestLastName:  guestLastName,
          guestPhone:    editing.guest_phone ?? "",
          customerId:    editing.customer_id ?? "",
          price:         String(editing.price ?? ""),
          provider:      editing.provider ?? "",
          internalNotes: editing.internal_notes ?? "",
        });
      } else {
        const orgOSMonths = Math.round((org?.otros_servicios_warranty_days ?? org?.warranty_days ?? 360) / 30);
        setForm({ ...EMPTY_FORM, warrantyMonths: String(orgOSMonths) });
      }
      setErrors({});
    }
  }, [editing, open]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (form.tags.length === 0)                        e.tags        = "Agrega al menos un tag";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0)
                                                        e.price       = "Ingresa un precio valido";
    if (form.guestMode && !form.guestFirstName.trim()) e.guestFirstName = "Ingresa el nombre";
    if (!form.guestMode && !form.customerId)            e.customerId     = "Selecciona un cliente";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const payload: CreateOtroServicioPayload = {
      organization_id: org!.id,
      tags:            form.tags,
      device_brand:    form.deviceBrand.trim() || null,
      device_model:    form.deviceModel.trim() || null,
      imei:            form.imeiSerial.trim() || null,
      serial:          null,
      has_pin:         form.hasLock,
      pin_code:        form.hasLock && form.lockType !== "huella" ? (form.lockCode.trim() || null) : null,
      description:     null,
      warranty_days:   form.noWarranty
        ? 0
        : form.warrantyMonths
          ? parseInt(form.warrantyMonths) * 30
          : (org?.otros_servicios_warranty_days ?? org?.warranty_days ?? 360),

      warranty_notes:  form.warrantyNotes.trim() || null,
      customer_id:     form.guestMode ? null : (form.customerId || null),
      guest_name:      form.guestMode
        ? [form.guestFirstName.trim(), form.guestLastName.trim()].filter(Boolean).join(" ") || null
        : null,
      guest_phone:     form.guestMode ? (form.guestPhone.trim() || null) : null,
      price:           Number(form.price),
      // Status always starts as pendiente — changed later in the workflow
      status:          editing?.status ?? "pendiente",
      // Payment cleared on creation — handled when marking completado
      paid:            editing?.paid ?? false,
      payment_method:  editing?.payment_method ?? null,
      provider:        isAdmin ? (form.provider.trim() || null) : null,
      internal_notes:  isAdmin ? (form.internalNotes.trim() || null) : null,
      created_by:      userId ?? null,
    };

    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast.success("Servicio actualizado");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Servicio registrado");
      }
      onClose();
    } catch {
      toast.error("Error al guardar el servicio");
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaIcon icon={faLockOpen} size={14} className="text-violet-400" />
            {editing ? "Editar servicio" : "Nuevo servicio"}
          </DialogTitle>
        </DialogHeader>

        {/* Banner fiscal (solo lectura) */}
        {org && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border/50 px-3 py-2 text-xs text-muted-foreground">
            <FaIcon icon={faUser} size={10} className="shrink-0 text-violet-400" />
            <span className="font-medium text-foreground">{org.name}</span>
            {org.tax_id_number && (
              <span>&middot; {org.tax_id_name ?? getFiscalConfig(org.currency_code ?? "PEN").taxIdLabel}: {org.tax_id_number}</span>
            )}
            <span>&middot; {org.currency_code ?? "PEN"}</span>
          </div>
        )}

        <div className="space-y-5 py-1">

          {/* ── Tipo de servicio (Tags) ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FaIcon icon={faTag} size={10} className="text-violet-400" /> Tipo de operación
            </p>
            <PersistentTagInput selected={form.tags} onChange={v => set("tags", v)} />
            {errors.tags && <p className="text-xs text-destructive">{errors.tags}</p>}
          </div>

          {/* ── Cliente ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FaIcon icon={faUser} size={10} className="text-blue-400" /> Cliente
              </p>
              <button
                type="button"
                onClick={() => set("guestMode", !form.guestMode)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  form.guestMode
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/40"
                    : "bg-muted text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <FaIcon icon={form.guestMode ? faLockOpen : faUser} size={10} />
                {form.guestMode ? "Sin registro" : "Cliente registrado"}
              </button>
            </div>

            {form.guestMode ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                <p className="text-xs text-amber-600 font-medium">Datos del cliente (para la nota de servicio)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre(s) *</Label>
                    <Input placeholder="Carlos" value={form.guestFirstName}
                      onChange={e => set("guestFirstName", e.target.value)} className="h-8 text-sm" />
                    {errors.guestFirstName && <p className="text-xs text-destructive mt-0.5">{errors.guestFirstName}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Apellido</Label>
                    <Input placeholder="Pérez" value={form.guestLastName}
                      onChange={e => set("guestLastName", e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono</Label>
                  <PhoneInput
                    value={form.guestPhone}
                    onChange={v => set("guestPhone", v)}
                    defaultDialCode={CURRENCY_TO_DIAL[org?.currency_code ?? "PEN"] ?? "+51"}
                  />
                </div>
              </div>
            ) : (
              <ClientCombobox
                clientes={clientes}
                value={form.customerId}
                onChange={(v) => set("customerId", v)}
                error={errors.customerId}
              />
            )}
          </div>

          {/* ── Dispositivo ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FaIcon icon={faMobileScreen} size={10} className="text-primary" /> Dispositivo
              <span className="text-[10px] normal-case font-normal opacity-70">(opcional)</span>
            </p>
            <DeviceSelectorCombobox
              brandText={form.deviceBrand}
              onBrandChange={(name) => { set("deviceBrand", name); set("deviceModel", ""); }}
              modelText={form.deviceModel}
              onModelChange={(name) => set("deviceModel", name)}
            />
            <Input
              placeholder="IMEI / Serial"
              value={form.imeiSerial}
              onChange={e => set("imeiSerial", e.target.value)}
              className="h-9 font-mono text-sm"
            />
          </div>

          {/* ── Clave / Bloqueo de pantalla ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FaIcon icon={faLock} size={10} className="text-amber-400" /> Bloqueo de pantalla
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { set("hasLock", false); set("lockType", ""); set("lockCode", ""); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                  !form.hasLock
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                <FaIcon icon={faLockOpen} size={14} /> Sin clave
              </button>
              <button
                type="button"
                onClick={() => set("hasLock", true)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                  form.hasLock
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                <FaIcon icon={faLock} size={14} /> Tiene clave
              </button>
            </div>

            {form.hasLock && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="space-y-2">
                  <Label>Tipo de clave</Label>
                  <Select value={form.lockType} onValueChange={v => { set("lockType", v); set("lockCode", ""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCK_TYPES.map((lt) => (
                        <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.lockType === "patron" ? (
                  <div className="space-y-2">
                    <Label>Dibuja el patrón</Label>
                    <div className="flex flex-col items-center gap-2">
                      <PatternLock value={form.lockCode} onChange={v => set("lockCode", v)} size={180} />
                      {form.lockCode && (
                        <button
                          type="button"
                          onClick={() => set("lockCode", "")}
                          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                        >
                          Borrar patrón
                        </button>
                      )}
                    </div>
                  </div>
                ) : form.lockType ? (
                  <div className="space-y-2">
                    <Label>
                      Código / Clave
                      {form.lockType === "huella" && (
                        <span className="text-muted-foreground text-xs ml-1">(no aplica)</span>
                      )}
                    </Label>
                    <Input
                      placeholder={form.lockType === "huella" ? "—" : "1234"}
                      value={form.lockCode}
                      onChange={e => set("lockCode", e.target.value)}
                      disabled={form.lockType === "huella"}
                      className="font-mono"
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* ── Garantia ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FaIcon icon={faShieldHalved} size={10} className="text-emerald-400" /> Garantía
              <span className="text-[10px] normal-case font-normal opacity-70">(opcional)</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { set("noWarranty", !form.noWarranty); set("warrantyMonths", ""); }}
                className={`shrink-0 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  form.noWarranty
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
                  value={form.warrantyMonths}
                  disabled={form.noWarranty}
                  onChange={e => { set("warrantyMonths", e.target.value); set("noWarranty", false); }}
                  className="h-9 pr-14 text-sm disabled:opacity-40"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  meses
                </span>
              </div>
            </div>
            <Input
              placeholder="Condiciones de la garantía (opcional)"
              value={form.warrantyNotes}
              onChange={e => set("warrantyNotes", e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              {form.noWarranty
                ? "Sin garantía — no se registrará garantía"
                : form.warrantyMonths
                  ? `${form.warrantyMonths} mes(es) · ${parseInt(form.warrantyMonths) * 30} días`
                  : "Vacío: se usará el default del taller al completar"}
            </p>
          </div>

          {/* ── Precio ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FaIcon icon={faDollarSign} size={10} className="text-emerald-400" /> Precio del servicio
            </p>
            <Input
              type="number" min={0} step="0.01" placeholder="0.00"
              value={form.price}
              onChange={e => set("price", e.target.value)}
              className="h-9 font-mono text-base"
            />
            {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            <p className="text-[11px] text-muted-foreground">
              El cobro se registra al marcar el servicio como Completado.
            </p>
          </div>

          {/* ── Notas internas (solo admin) ── */}
          {isAdmin && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FaIcon icon={faFileLines} size={10} className="text-muted-foreground" /> Notas internas
                <span className="text-[10px] normal-case font-normal opacity-70">(solo visibles para admins)</span>
              </p>
              <Textarea
                placeholder="Notas internas, proveedor, observaciones…"
                rows={2}
                value={form.internalNotes}
                onChange={e => set("internalNotes", e.target.value)}
                className="text-sm resize-none"
              />
            </div>
          )}

        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={isPending} className="gap-2">
            {isPending
              ? <><FaIcon icon={faWrench} size={12} className="animate-spin" /> Guardando...</>
              : editing ? "Actualizar servicio" : "Registrar servicio"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog de cambio de estado (con cobro si aplica) ─────────────────────────

interface StatusChangeDialogProps {
  servicio: OtroServicioRow & Record<string, unknown>;
  targetStatus: ServiceStatus;
  open: boolean;
  onClose: () => void;
}

function StatusChangeDialog({ servicio, targetStatus, open, onClose, onShowPrintDialog }: StatusChangeDialogProps & { onShowPrintDialog: (s: any) => void }) {
  const { formatCurrency, org } = useOrganization();
  const { data: clientes = [] } = useClientes();
  const updateMut = useUpdateOtroServicio();

  // El cobro y garantía ocurren al ENTREGAR, no al completar
  const isEntregando = targetStatus === "entregado";
  const hasRegisteredClient = !!servicio.customer_id;
  const clientName = servicio.guest_name
    ?? clientes.find(c => c.id === servicio.customer_id)?.full_name
    ?? "Cliente";

  // Reset state each time the dialog opens
  const [paymentChoice,  setPaymentChoice]  = useState<"cobrado" | "credito">("cobrado");
  const [paymentMethod,  setPaymentMethod]  = useState("efectivo");
  const [warrantyMonths, setWarrantyMonths] = useState<string>("");
  const [noWarrantyOS,   setNoWarrantyOS]   = useState(false);

  const defaultMonths = org?.otros_servicios_warranty_days
    ? Math.round(org.otros_servicios_warranty_days / 30)
    : org?.warranty_days
      ? Math.round(org.warranty_days / 30)
      : 12;

  React.useEffect(() => {
    if (open) {
      setPaymentChoice("cobrado");
      setPaymentMethod("efectivo");
      // Pre-fill: si warranty_days === 0 activa Sin Garantía, sino pre-fill en meses
      const svcDays = servicio.warranty_days;
      if (svcDays === 0) {
        setNoWarrantyOS(true);
        setWarrantyMonths("");
      } else {
        setNoWarrantyOS(false);
        const months = svcDays ? Math.round(svcDays / 30) : defaultMonths;
        setWarrantyMonths(String(months));
      }
    }
  }, [open, servicio, defaultMonths]);

  const confirm = async () => {
    const warrantyDaysToSave = isEntregando
      ? (noWarrantyOS ? 0 : (parseInt(warrantyMonths) || 0) * 30)
      : undefined;
    const updates: Parameters<typeof updateMut.mutateAsync>[0] = {
      id:           servicio.id,
      status:       targetStatus,
      warranty_days: warrantyDaysToSave,
    };

    if (isEntregando) {
      if (paymentChoice === "cobrado") {
        updates.paid           = true;
        updates.payment_method = paymentMethod;
      } else {
        updates.paid           = false;
        updates.payment_method = null;
      }
    }

    try {
      await updateMut.mutateAsync(updates);
      const label = STATUSES.find(s => s.value === targetStatus)?.label ?? targetStatus;
      toast.success(`Estado actualizado a ${label}`);
      onClose();
      // Show print dialog if payment was recorded at delivery!
      if (isEntregando && updates.paid) {
        onShowPrintDialog(servicio);
      }
    } catch (err: any) {
      toast.error(`Error: ${err?.message ?? "No se pudo actualizar el estado"}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEntregando
              ? "Entregar servicio al cliente"
              : `Cambiar a ${STATUSES.find(s => s.value === targetStatus)?.label}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isEntregando ? (
            <>
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-sm space-y-0.5">
                <p className="font-medium">{clientName}</p>
                <p className="text-muted-foreground">
                  Precio acordado: <span className="font-mono font-semibold text-foreground">{formatCurrency(servicio.price ?? 0)}</span>
                </p>
              </div>

              {/* Cobrado al contado o pendiente — solo cliente registrado puede quedar fiado */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pago</Label>
                <div className={`grid gap-2 ${hasRegisteredClient ? "grid-cols-2" : "grid-cols-1"}`}>
                  <button type="button" onClick={() => setPaymentChoice("cobrado")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                      paymentChoice === "cobrado"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-border/60 text-muted-foreground hover:border-border"
                    }`}>
                    <FaIcon icon={faDollarSign} size={18} />
                    Cobrado ya
                  </button>
                  {/* Fiado SOLO para clientes registrados */}
                  {hasRegisteredClient && (
                    <button type="button" onClick={() => setPaymentChoice("credito")}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                        paymentChoice === "credito"
                          ? "border-amber-500 bg-amber-500/10 text-amber-400"
                          : "border-border/60 text-muted-foreground hover:border-border"
                      }`}>
                      <FaIcon icon={faClock} size={18} />
                      A cuenta
                    </button>
                  )}
                </div>
                {/* Info si es guest */}
                {!hasRegisteredClient && (
                  <p className="text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-lg px-3 py-2">
                    Los clientes sin registro deben pagar al completar el servicio. Para habilitar cuenta corriente, registra el cliente primero.
                  </p>
                )}
                {paymentChoice === "credito" && hasRegisteredClient && (
                  <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    Se registrara en Por Cobrar para {clientName}.
                  </p>
                )}
              </div>

              {/* Garantia */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <FaIcon icon={faShieldHalved} size={12} className="text-emerald-400" />
                  Garantia de este servicio
                </Label>

                <div className="flex items-center gap-2">
                  {/* Sin garantía */}
                  <button
                    type="button"
                    onClick={() => { setNoWarrantyOS(!noWarrantyOS); setWarrantyMonths(""); }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      noWarrantyOS
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
                      disabled={noWarrantyOS}
                      onChange={e => { setWarrantyMonths(e.target.value); setNoWarrantyOS(false); }}
                      className="h-8 pr-10 text-sm disabled:opacity-40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      meses
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  {noWarrantyOS
                    ? "⚠ Sin garantía — no se registrará garantía"
                    : warrantyMonths
                      ? `${warrantyMonths} mes(es) · ${parseInt(warrantyMonths) * 30} días desde hoy`
                      : "Ingresa los meses de garantía"}
                </p>
              </div>

              {/* Metodo de pago (solo si cobrado) */}
              {paymentChoice === "cobrado" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Metodo de pago</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button key={m.value} type="button"
                        onClick={() => setPaymentMethod(m.value)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                          paymentMethod === m.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-border"
                        }`}>
                        <FaIcon icon={m.icon} size={16} />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              El servicio pasara a estado{" "}
              <span className="font-medium text-foreground">
                {STATUSES.find(s => s.value === targetStatus)?.label}
              </span>.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirm} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function OtrosServiciosPage() {
  const router = useRouter();
  const {
    org, userId, role,
    formatCurrency, currencySymbol, currencyCode, taxIdName, taxTypeLabel
  } = useOrganization();
  const isAdmin = role === "admin" || role === "superadmin";

  const { data: serviciosRaw = [], isLoading } = useOtrosServicios();
  const { data: statsData } = useOtrosServiciosStats();
  const { data: clientes = [] } = useClientes();
  const deleteMut = useDeleteOtroServicio();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OtroServicioRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OtroServicioRow | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    row: OtroServicioRow & Record<string, unknown>;
    to: ServiceStatus;
  } | null>(null);

  // Cast to extended type (includes joined customer)
  type ServicioExtended = OtroServicioRow & Record<string, unknown>;
  const servicios = serviciosRaw as ServicioExtended[];

  const filtered = servicios.filter(s => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.device_brand?.toLowerCase().includes(q) ||
        s.device_model?.toLowerCase().includes(q) ||
        s.imei?.toLowerCase().includes(q) ||
        s.guest_name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t: string) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // KPI
  const thisMonth = servicios.filter(
    s => new Date(s.created_at).getMonth() === new Date().getMonth()
  );
  const enProceso    = servicios.filter(s => s.status === "en_proceso").length;
  const pendingAmount = servicios
    .filter(s => s.status !== "entregado" && s.status !== "fallido" && s.status !== "cancelado")
    .reduce((acc, s) => acc + (s.price ?? 0), 0);

  const stats = {
    total:       servicios.length,
    pendientes:  servicios.filter(s => s.status === "pendiente").length,
    enProceso,
    completados: servicios.filter(s => s.status === "completado" || s.status === "entregado").length,
    ingresosMes: thisMonth
      .filter(s => (s.status === "completado" || s.status === "entregado") && s.paid)
      .reduce((acc, s) => acc + (s.price ?? 0), 0),
    pendingAmount,
  };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit   = (s: OtroServicioRow) => { setEditing(s); setFormOpen(true); };
  const closeForm  = () => { setFormOpen(false); setEditing(null); };

  // Count per status for tab badges
  const tabCounts: Record<string, number> = { all: servicios.length };
  STATUSES.forEach(s => { tabCounts[s.value] = servicios.filter(x => x.status === s.value).length; });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync(deleteTarget.id);
    toast.success("Servicio eliminado");
    setDeleteTarget(null);
  };

  const columns: DataColumn<ServicioExtended>[] = [
    {
      key: "order_number",
      header: "#",
      className: "w-12",
      showOnMobile: false,
      cell: row => (
        <span className="text-xs font-mono font-bold text-primary/80">
          {row.order_number != null ? `#${String(row.order_number).padStart(3, "0")}` : "—"}
        </span>
      ),
    },
    {
      key: "tags",
      header: "Servicio",
      primary: true,
      cell: row => (
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap gap-1">
            {(row.tags as string[] ?? []).slice(0, 3).map((t: string) => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 max-w-[130px] truncate">
                <FaIcon icon={faTag} size={9} className="shrink-0" />
                {t}
              </Badge>
            ))}
            {(row.tags as string[] ?? []).length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1">
                +{(row.tags as string[]).length - 3}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={row.status as string} />
            {row.paid
              ? <span className="text-[9px] text-emerald-500 font-semibold">Cobrado</span>
              : <span className="text-[9px] text-amber-500 font-semibold">Pendiente cobro</span>
            }
          </div>
        </div>
      ),
    },
    {
      key: "device_brand",
      header: "Dispositivo",
      showOnMobile: false,
      cell: row => (
        <div className="min-w-0">
          {(row.device_brand || row.device_model) ? (
            <>
              <p className="text-sm font-medium truncate">
                {[row.device_brand, row.device_model].filter(Boolean).join(" ")}
              </p>
              {row.imei && (
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  {(row.imei as string).slice(0, 12)}
                </p>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground italic">Sin dispositivo</span>
          )}
        </div>
      ),
    },
    {
      key: "guest_name",
      header: "Cliente",
      showOnMobile: false,
      cell: row => {
        const name  = row.guest_name ?? (row.customers as any)?.full_name ?? "—";
        const phone = row.guest_phone ?? (row.customers as any)?.phone;
        return (
          <div>
            <p className="text-sm font-medium truncate max-w-[140px]">{name}</p>
            {phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                <FaIcon icon={faPhone} size={10} /> {phone}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "price",
      header: "Precio",
      cell: row => (
        <div className="text-right">
          <p className="font-mono font-semibold text-sm">{formatCurrency(row.price as number ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground">
            {format(new Date(row.created_at as string), "dd MMM", { locale: es })}
          </p>
        </div>
      ),
    },
    {
      key: "id",
      header: "",
      cell: row => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
            onClick={() => printOtroServicioNota(row, org)}>
            <FaIcon icon={faFileLines} size={12} />
            <span className="hidden sm:inline">Nota</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <FaIcon icon={faEllipsisVertical} size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => openEdit(row as OtroServicioRow)}
                disabled={TERMINAL_OS.includes(row.status as ServiceStatus)}
              >
                <FaIcon icon={faWrench} size={12} className="mr-2" /> Editar
              </DropdownMenuItem>
              {row.paid && (
                <DropdownMenuItem onClick={() => printOtroServicioNota(row, org)}>
                  <FaIcon icon={faFileLines} size={12} className="mr-2" /> Imprimir nota
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(row as OtroServicioRow)}
                  >
                    <FaIcon icon={faTrash} size={12} className="mr-2" /> Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="size-7">
            <FaIcon icon={faArrowRight} size={13} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FaIcon icon={faLockOpen} size={18} className="text-violet-400" />
            Otros Servicios
          </h1>
          <p className="text-sm text-muted-foreground">
            Desbloqueos, software y servicios especiales
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <FaIcon icon={faPlus} size={14} /> Nuevo servicio
        </Button>
      </div>

      {/* KPI Cards — estilo inventario */}
      {(() => {
        const kpis = [
          { label: "Total",          value: String(stats.total),                icon: faLockOpen,        colorClass: "text-violet-400", sub: "" },
          { label: "Pendientes",     value: String(stats.pendientes),           icon: faHourglassHalf, colorClass: "text-amber-400",  sub: `${enProceso} en proceso` },
          { label: "En proceso",     value: String(enProceso),                 icon: faWrench,        colorClass: "text-blue-400",   sub: "" },
          { label: "Completados",    value: String(stats.completados),          icon: faCircleCheck,  colorClass: "text-emerald-400", sub: "" },
          { label: "Ingresos mes",   value: formatCurrency(stats.ingresosMes), icon: faArrowTrendUp, colorClass: "text-emerald-400", sub: `${thisMonth.filter(s => s.paid && (s.status === "entregado" || s.status === "completado")).length} cobrados` },
          ...(isAdmin ? [{ label: "Pendiente cobro", value: formatCurrency(stats.pendingAmount), icon: faDollarSign, colorClass: "text-blue-400", sub: "servicios activos" }] : []),
        ];
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1 overflow-hidden transition-all hover:border-primary/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <FaIcon icon={kpi.icon} size={11} className={`shrink-0 ${kpi.colorClass}`} />
                  <span className="truncate">{kpi.label}</span>
                </div>
                {isLoading
                  ? <Skeleton className="h-6 w-16" />
                  : <p className="font-bold font-mono text-lg truncate">{kpi.value}</p>
                }
                {kpi.sub && <p className="text-[10px] text-muted-foreground truncate">{kpi.sub}</p>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Búsqueda */}
      <div className="relative">
        <FaIcon icon={faMagnifyingGlass} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <FaIcon icon={faXmark} size={12} />
          </button>
        )}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por modelo, IMEI, cliente, tag…"
          className="w-full h-9 pl-9 pr-8 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Status tabs con contadores */}
      <div className="flex gap-1 overflow-x-auto border-b border-border/40">
        {(["all", ...STATUSES.map(s => s.value)] as const).map((sv) => {
          const isActive = statusFilter === sv;
          const count    = tabCounts[sv] ?? 0;
          const label    = sv === "all" ? "Todos" : STATUSES.find(s => s.value === sv)?.label ?? sv;
          return (
            <button
              key={sv}
              onClick={() => setStatusFilter(sv)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap -mb-px ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabla */}
      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No hay servicios registrados."
        emptyIcon={<FaIcon icon={faLockOpen} size={28} className="text-muted-foreground/30" />}
        onRowClick={(row) => router.push(`/otros-servicios/${(row as ServicioExtended).id}`)}
      />

      {/* Formulario crear/editar */}
      <ServiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onClose={closeForm}
      />

      {/* Dialog de cambio de estado */}
      {statusChangeTarget && (
        <StatusChangeDialog
          servicio={statusChangeTarget.row}
          targetStatus={statusChangeTarget.to}
          open={!!statusChangeTarget}
          onClose={() => setStatusChangeTarget(null)}
          onShowPrintDialog={(s) => {
            printOtroServicioNota(s, org);
          }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara el servicio
              {deleteTarget?.order_number ? ` ${deleteTarget.order_number}` : ""} permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

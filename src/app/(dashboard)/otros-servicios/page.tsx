"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ghost, Plus, Tag, X, Search, Smartphone, Lock,
  CheckCircle2, Clock, Wrench, ChevronDown, ShieldCheck,
  MoreHorizontal, Trash2, FileText, DollarSign, User, Phone,
  CreditCard, Banknote, Building2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  useDeleteOtroServicio,
  type OtroServicioRow, type CreateOtroServicioPayload,
} from "@/hooks/useOtrosServicios";
import {
  useServicioTags, useCreateServicioTag, useDeleteServicioTag,
} from "@/hooks/useServicioTags";
import { printOtroServicioNota } from "@/components/print/NotaServicioPrint";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ServiceStatus = "pendiente" | "en_proceso" | "completado" | "entregado" | "fallido" | "cancelado";

const STATUSES: { value: ServiceStatus; label: string; color: string }[] = [
  { value: "pendiente",  label: "Pendiente",   color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "en_proceso", label: "En proceso",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "completado", label: "Listo para entregar",  color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "entregado",  label: "Entregado",   color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  { value: "fallido",    label: "Fallido",     color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "cancelado",  label: "Cancelado",   color: "bg-muted text-muted-foreground border-border" },
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
  { value: "efectivo",      label: "Efectivo",       icon: Banknote },
  { value: "transferencia", label: "Transferencia",  icon: Building2 },
  { value: "tarjeta",       label: "Tarjeta",        icon: CreditCard },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find(x => x.value === status);
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${s?.color ?? ""}`}>
      {s?.label ?? status}
    </Badge>
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
          <Plus className="size-3.5" />
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
                <Tag className="size-2.5 shrink-0" />
                {tag.name}
                <span role="button"
                  onClick={(e) => void handleDeleteFromDB(e, tag.id, tag.name)}
                  className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity">
                  <X className="size-3" />
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
              <Tag className="size-2.5 shrink-0" />{t}
              <button type="button" onClick={() => toggle(t)}
                className="hover:text-destructive ml-0.5 shrink-0">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Formulario de creación/edición ────────────────────────────────────────────

type FormState = {
  tags: string[];
  deviceBrand: string; deviceModel: string; imei: string; serial: string;
  hasPin: boolean; pinCode: string;
  description: string;
  warrantyMonths: string;  // meses (libre), '' = usar default, 'none' ignorado
  noWarranty: boolean;     // Sin garantía
  warrantyNotes: string;
  guestMode: boolean; guestName: string; guestPhone: string; customerId: string;
  price: string;
  provider: string;
  internalNotes: string;
};

const EMPTY_FORM: FormState = {
  tags: [],
  deviceBrand: "", deviceModel: "", imei: "", serial: "",
  hasPin: false, pinCode: "",
  description: "",
  warrantyMonths: "", noWarranty: false, warrantyNotes: "",

  guestMode: true, guestName: "", guestPhone: "", customerId: "",
  price: "",
  provider: "",
  internalNotes: "",
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
        setForm({
          tags:          editing.tags ?? [],
          deviceBrand:   editing.device_brand ?? "",
          deviceModel:   editing.device_model ?? "",
          imei:          editing.imei ?? "",
          serial:        editing.serial ?? "",
          hasPin:        editing.has_pin ?? false,
          pinCode:       editing.pin_code ?? "",
          description:   editing.description ?? "",
          warrantyMonths: editing.warranty_days === 0
            ? ""
            : editing.warranty_days
              ? String(Math.max(1, Math.round(editing.warranty_days / 30)))
              : "",
          noWarranty:    editing.warranty_days === 0,

          warrantyNotes: editing.warranty_notes ?? "",
          guestMode:     !editing.customer_id,
          guestName:     editing.guest_name ?? "",
          guestPhone:    editing.guest_phone ?? "",
          customerId:    editing.customer_id ?? "",
          price:         String(editing.price ?? ""),
          provider:      editing.provider ?? "",
          internalNotes: editing.internal_notes ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
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
    if (form.guestMode && !form.guestName.trim())      e.guestName   = "Ingresa el nombre";
    if (!form.guestMode && !form.customerId)           e.customerId  = "Selecciona un cliente";
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
      imei:            form.imei.trim() || null,
      serial:          form.serial.trim() || null,
      has_pin:         form.hasPin,
      pin_code:        form.hasPin ? (form.pinCode.trim() || null) : null,
      description:     form.description.trim() || null,
      warranty_days:   form.noWarranty
        ? 0
        : form.warrantyMonths
          ? parseInt(form.warrantyMonths) * 30
          : undefined,

      warranty_notes:  form.warrantyNotes.trim() || null,
      customer_id:     form.guestMode ? null : (form.customerId || null),
      guest_name:      form.guestMode ? (form.guestName.trim() || null) : null,
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ghost className="size-4 text-violet-400" />
            {editing ? "Editar servicio" : "Nuevo servicio"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* Tags — persistentes en BD */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="size-3.5 text-muted-foreground" />
              Tipo de operacion <span className="text-destructive">*</span>
            </Label>
            <PersistentTagInput selected={form.tags} onChange={v => set("tags", v)} />
            {errors.tags && <p className="text-xs text-destructive">{errors.tags}</p>}
          </div>

          <Separator />

          {/* Dispositivo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Smartphone className="size-3.5 text-muted-foreground" />
              Dispositivo <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Marca" value={form.deviceBrand}
                onChange={e => set("deviceBrand", e.target.value)} className="h-9" />
              <Input placeholder="Modelo" value={form.deviceModel}
                onChange={e => set("deviceModel", e.target.value)} className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="IMEI" value={form.imei}
                onChange={e => set("imei", e.target.value)} className="h-9 font-mono text-sm" />
              <Input placeholder="Serial" value={form.serial}
                onChange={e => set("serial", e.target.value)} className="h-9 font-mono text-sm" />
            </div>
          </div>

          {/* Clave / PIN */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" />
                Clave del dispositivo
              </Label>
              <Switch checked={form.hasPin} onCheckedChange={v => set("hasPin", v)} />
            </div>
            {form.hasPin && (
              <Input placeholder="PIN / patron / contrasena" value={form.pinCode}
                onChange={e => set("pinCode", e.target.value)}
                className="h-9 font-mono" />
            )}
          </div>

          {/* Descripcion — opcional */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1">
              Descripcion
              <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              placeholder="Detalles del servicio, metodo, operadora, region..."
              value={form.description}
              onChange={e => set("description", e.target.value)}
              className="min-h-[60px] text-sm resize-none"
            />
          </div>

          {/* Garantia */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              Garantia
              <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { set("noWarranty", !form.noWarranty); set("warrantyMonths", ""); }}
                className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  form.noWarranty
                    ? "border-amber-500 bg-amber-500/15 text-amber-400"
                    : "border-border/50 text-muted-foreground hover:border-border"
                }`}
              >
                Sin garantia
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
            <div className="grid grid-cols-1 gap-2">
              <Input
                placeholder="Condiciones de la garantia (opcional)"
                value={form.warrantyNotes}
                onChange={e => set("warrantyNotes", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {form.noWarranty
                ? "Sin garantia — no se registrara garantia"
                : form.warrantyMonths
                  ? `${form.warrantyMonths} mes(es) · ${parseInt(form.warrantyMonths) * 30} dias`
                  : "Vacio: se usara el default del taller al completar"}
            </p>
          </div>

          <Separator />

          {/* Cliente */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <User className="size-3.5 text-muted-foreground" />
              Cliente
            </Label>
            {/* Tab selector */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted/40 rounded-lg border border-border/40">
              <button type="button"
                onClick={() => set("guestMode", true)}
                className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                  form.guestMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                Sin registro
              </button>
              <button type="button"
                onClick={() => set("guestMode", false)}
                className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                  !form.guestMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                Registrado
              </button>
            </div>

            {form.guestMode ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input placeholder="Nombre *" value={form.guestName}
                    onChange={e => set("guestName", e.target.value)} className="h-9" />
                  {errors.guestName && <p className="text-xs text-destructive mt-0.5">{errors.guestName}</p>}
                </div>
                <Input placeholder="Telefono" value={form.guestPhone}
                  onChange={e => set("guestPhone", e.target.value)} className="h-9" />
              </div>
            ) : (
              <div>
                <Select value={form.customerId} onValueChange={v => set("customerId", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Buscar cliente registrado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.length === 0 && (
                      <SelectItem value="__none" disabled>No hay clientes registrados</SelectItem>
                    )}
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex flex-col">
                          <span>{c.full_name}</span>
                          {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customerId && <p className="text-xs text-destructive mt-0.5">{errors.customerId}</p>}
              </div>
            )}
          </div>

          {/* Precio */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-muted-foreground" />
              Precio acordado <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number" min={0} step="0.01" placeholder="0.00"
              value={form.price}
              onChange={e => set("price", e.target.value)}
              className="h-9 font-mono"
            />
            {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
            <p className="text-[11px] text-muted-foreground">
              El cobro se registra al marcar el servicio como Completado.
            </p>
          </div>

          {/* Proveedor / Herramienta — solo admin, opcional */}
          {isAdmin && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  Proveedor / Herramienta
                  <span className="text-xs text-muted-foreground font-normal">(interno, opcional)</span>
                </Label>
                <Input
                  placeholder="Ej: GSMHosting, DFT Pro, Chimera Tool..."
                  value={form.provider}
                  onChange={e => set("provider", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  Notas internas
                  <span className="text-xs text-muted-foreground font-normal">(solo admin, opcional)</span>
                </Label>
                <Textarea
                  placeholder="Notas del equipo que el cliente no ve..."
                  value={form.internalNotes}
                  onChange={e => set("internalNotes", e.target.value)}
                  className="min-h-[54px] text-sm resize-none"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Guardando..." : editing ? "Actualizar" : "Registrar"}
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

function StatusChangeDialog({ servicio, targetStatus, open, onClose }: StatusChangeDialogProps) {
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

  const defaultMonths = org?.warranty_days
    ? Math.round(org.warranty_days / 30)
    : 3;

  React.useEffect(() => {
    if (open) {
      setPaymentChoice("cobrado");
      setPaymentMethod("efectivo");
      // Pre-fill: si warranty_days === 0 activa Sin Garantía, sino pre-fill en meses
      const svcDays = (servicio as any).warranty_days as number | null;
      if (svcDays === 0) {
        setNoWarrantyOS(true);
        setWarrantyMonths("");
      } else {
        setNoWarrantyOS(false);
        const months = svcDays ? Math.round(svcDays / 30) : defaultMonths;
        setWarrantyMonths(String(months));
      }
    }
  }, [open]);

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
                    <DollarSign className="size-5" />
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
                      <Clock className="size-5" />
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
                  <ShieldCheck className="size-3.5 text-emerald-400" />
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
                        <m.icon className="size-4" />
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
  const { org, role, formatCurrency } = useOrganization();
  const isAdmin = role === "admin" || role === "superadmin";

  const { data: serviciosRaw = [], isLoading } = useOtrosServicios();
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
  const stats = {
    total:       servicios.length,
    pendientes:  servicios.filter(s => s.status === "pendiente").length,
    completados: servicios.filter(s => s.status === "completado" || s.status === "entregado").length,
    ingresosMes: thisMonth
      .filter(s => (s.status === "completado" || s.status === "entregado") && s.paid)
      .reduce((acc, s) => acc + (s.price ?? 0), 0),
  };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit   = (s: OtroServicioRow) => { setEditing(s); setFormOpen(true); };
  const closeForm  = () => { setFormOpen(false); setEditing(null); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync(deleteTarget.id);
    toast.success("Servicio eliminado");
    setDeleteTarget(null);
  };

  const columns: DataColumn<ServicioExtended>[] = [
    {
      key: "order_number" as keyof ServicioExtended,
      header: "#",
      cell: row => (
        <span className="text-xs font-mono text-muted-foreground">{row.order_number ?? "—"}</span>
      ),
    },
    {
      key: "tags" as keyof ServicioExtended,
      header: "Servicio / Dispositivo",
      cell: row => (
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap gap-1">
            {(row.tags as string[] ?? []).slice(0, 2).map((t: string) => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 max-w-[120px] truncate">
                <Tag className="size-2.5 shrink-0" />
                {t}
              </Badge>
            ))}
            {(row.tags as string[] ?? []).length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1">
                +{(row.tags as string[]).length - 2}
              </Badge>
            )}
          </div>
          {(row.device_brand || row.device_model) && (
            <p className="text-xs text-muted-foreground truncate">
              {[row.device_brand, row.device_model].filter(Boolean).join(" ")}
              {row.imei && (
                <span className="font-mono ml-1 opacity-50">
                  · {(row.imei as string).slice(0, 8)}…
                </span>
              )}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "guest_name" as keyof ServicioExtended,
      header: "Cliente",
      className: "hidden md:table-cell",
      cell: row => {
        const name = row.guest_name ?? (row.customers as any)?.full_name ?? "—";
        const phone = row.guest_phone ?? (row.customers as any)?.phone;
        return (
          <div>
            <p className="text-sm font-medium truncate max-w-[140px]">{name}</p>
            {phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Phone className="size-2.5" />{phone}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "status" as keyof ServicioExtended,
      header: "Estado",
      cell: row => {
        const currentStatus = row.status as ServiceStatus;
        const isTerminalOS  = TERMINAL_OS.includes(currentStatus);
        const allowedNext   = OS_TRANSITIONS[currentStatus] ?? [];

        if (isTerminalOS) {
          return <StatusBadge status={currentStatus} />;
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                <StatusBadge status={currentStatus} />
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {allowedNext.map(sv => (
                <DropdownMenuItem
                  key={sv}
                  onClick={() => setStatusChangeTarget({ row: row as ServicioExtended, to: sv })}
                >
                  <StatusBadge status={sv} />
                  <span className="ml-2 text-xs">{STATUSES.find(s => s.value === sv)?.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      key: "price" as keyof ServicioExtended,
      header: "Precio",
      cell: row => (
        <div className="text-right">
          <p className="font-mono font-semibold text-sm">{formatCurrency(row.price as number ?? 0)}</p>
          {row.paid
            ? <p className="text-[9px] text-emerald-500 font-semibold uppercase">Cobrado</p>
            : <p className="text-[9px] text-amber-500 font-semibold uppercase">Pendiente</p>
          }
        </div>
      ),
    },
    {
      key: "created_at" as keyof ServicioExtended,
      header: "Fecha",
      className: "hidden lg:table-cell",
      cell: row => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.created_at as string), "dd MMM", { locale: es })}
        </span>
      ),
    },
    {
      key: "id" as keyof ServicioExtended,
      header: "",
      cell: row => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
            onClick={() => printOtroServicioNota(row, org)}>
            <FileText className="size-3" />
            <span className="hidden sm:inline">Nota</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => openEdit(row as OtroServicioRow)}
                disabled={TERMINAL_OS.includes(row.status as ServiceStatus)}
              >
                <Wrench className="size-3.5 mr-2" /> Editar
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(row as OtroServicioRow)}
                  >
                    <Trash2 className="size-3.5 mr-2" /> Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
            <Ghost className="size-5 text-violet-400" />
            Otros Servicios
          </h1>
          <p className="text-sm text-muted-foreground">
            Desbloqueos, software y servicios especiales
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="size-4" /> Nuevo servicio
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",       value: String(stats.total),       icon: Ghost,        color: "text-violet-400" },
          { label: "Pendientes",  value: String(stats.pendientes),  icon: Clock,        color: "text-amber-400" },
          { label: "Completados", value: String(stats.completados), icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Ingresos mes",value: formatCurrency(stats.ingresosMes), icon: DollarSign, color: "text-blue-400" },
        ].map(kpi => (
          <Card key={kpi.label} className="border-border/50 overflow-hidden">
            <CardHeader className="pb-1 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground truncate mr-2">{kpi.label}</CardTitle>
              <kpi.icon className={`size-4 shrink-0 ${kpi.color}`} />
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading
                ? <Skeleton className="h-6 w-16 mt-1" />
                : <p className="text-lg font-bold font-mono truncate">{kpi.value}</p>
              }
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por modelo, IMEI, cliente, tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No hay servicios registrados."
        emptyIcon={<Ghost className="size-8 text-muted-foreground/30" />}
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
        />
      )}

      {/* Confirmar eliminacion */}
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

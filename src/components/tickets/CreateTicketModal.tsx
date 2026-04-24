"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  faPlus, faPowerOff, faLock, faLockOpen,
  faCamera, faXmark, faUpload, faSpinner, faUserSlash, faUser,
  faChevronDown, faChevronUp, faShieldHalved, faWandMagicSparkles
} from "@fortawesome/free-solid-svg-icons";
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
import { useCreateTicket, uploadIntakePhoto, type CreateTicketPayload } from "@/hooks/useTickets";
import { useClientes } from "@/hooks/useClientes";
import { useOrganization } from "@/contexts/OrganizationContext";
import { PhoneInput, CURRENCY_TO_DIAL } from "@/components/ui-custom/PhoneInput";
import { getFiscalConfig } from "@/lib/fiscalConfig";
import { ClientCombobox } from "@/components/ui-custom/ClientCombobox";
import { DeviceSelectorCombobox } from "@/components/ui-custom/DeviceSelectorCombobox";
import { PatternLock } from "@/components/ui-custom/PatternLock";
import type { DeviceDetails } from "@/types/domain";
import { toast } from "sonner";

const DEVICE_TYPES = ["Celular", "Tablet", "Laptop", "PC", "Consola", "Smartwatch", "Otro"];

const LOCK_TYPES = [
  { value: "pin",      label: "PIN numérico" },
  { value: "patron",   label: "Patrón" },
  { value: "password", label: "Contraseña" },
  { value: "huella",   label: "Huella / Biométrico" },
];

export interface CreateTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTicketModal({ open, onOpenChange }: CreateTicketModalProps) {
  const { org, currencySymbol, currencyCode } = useOrganization();
  const { data: clientes = [] } = useClientes();
  const createMutation = useCreateTicket();

  // ── Form state ───────────────────────────────────────────────────────────────
  const [customerId,      setCustomerId]      = useState("");
  const [guestMode,       setGuestMode]       = useState(false);
  const [guestFirstName,  setGuestFirstName]  = useState("");
  const [guestLastName,   setGuestLastName]   = useState("");
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
  const [diagnosis,       setDiagnosis]       = useState("");

  const orgWarrantyMonths = org?.warranty_days ? String(Math.round(org.warranty_days / 30)) : "12";
  const [warrantyMonthsCreate, setWarrantyMonthsCreate] = useState<string>(orgWarrantyMonths);
  const [warrantyNotesCreate,  setWarrantyNotesCreate]  = useState("");
  const [noWarranty,           setNoWarranty]           = useState(false);
  const [termsOpen,            setTermsOpen]            = useState(false);

  // Photo upload state
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // AI State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isFixingIssue, setIsFixingIssue] = useState(false);
  const [isFixingDiagnosis, setIsFixingDiagnosis] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setWarrantyMonthsCreate(orgWarrantyMonths);
    }
  }, [open, orgWarrantyMonths]);

  const handleAiAutocomplete = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error de IA");
      
      if (data.device) setDeviceType(data.device);
      if (data.brand) setDeviceBrand(data.brand);
      if (data.model) setDeviceModel(data.model);
      if (data.issue) setIssue(data.issue);
      if (data.diagnosis) setDiagnosis(data.diagnosis);
      if (data.estimatedCost) setFinalAmount(data.estimatedCost.toString());
      if (data.warning) toast.warning(data.warning);
      
      toast.success("Campos autocompletados con IA");
      setAiPrompt("");
    } catch (err: any) {
      toast.error(err.message || "No se pudo autocompletar");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFixText = async (field: "issue" | "diagnosis") => {
    const text = field === "issue" ? issue : diagnosis;
    if (!text || text.length < 3) return;
    
    if (field === "issue") setIsFixingIssue(true);
    else setIsFixingDiagnosis(true);
    
    try {
      const res = await fetch("/api/ai/fix-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, field })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (field === "issue") setIssue(data.text);
      else setDiagnosis(data.text);
      
      toast.success("Texto resumido y mejorado para la boleta");
    } catch (err) {
      toast.error("No se pudo mejorar el texto");
    } finally {
      if (field === "issue") setIsFixingIssue(false);
      else setIsFixingDiagnosis(false);
    }
  };

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
        diagnosis:       diagnosis.trim() || null,
        warranty_days:   noWarranty
          ? 0
          : warrantyMonthsCreate
            ? parseInt(warrantyMonthsCreate) * 30
            : (org?.warranty_days ?? 360),
        warranty_notes:  warrantyNotesCreate.trim() || null,
      };

      const created = await createMutation.mutateAsync(payload);

      if (photoFile && created?.id) {
        try {
          await uploadIntakePhoto(created.id, photoFile, org.id);
        } catch {
          toast.warning("Ticket creado, pero falló la subida de la foto");
        }
      }

      setCustomerId(""); setGuestFirstName(""); setGuestLastName(""); setGuestPhone(""); setGuestMode(false);
      setDeviceType(""); setDeviceBrand(""); setDeviceModel("");
      setImei(""); setIssue(""); setFinalAmount(""); setPowerOn(true);
      setHasLock(false); setLockType(""); setLockCode(""); setIntakeNotes(""); setDiagnosis("");
      setWarrantyMonthsCreate(orgWarrantyMonths); setWarrantyNotesCreate(""); setNoWarranty(false); setTermsOpen(false);
      removePhoto();
      onOpenChange(false);
    } catch {
      // error handled by mutation onError
    } finally {
      setIsSubmitting(false);
    }
  }, [
    customerId, guestMode, guestFirstName, guestLastName, guestPhone,
    deviceType, deviceBrand, deviceModel, imei, issue,
    finalAmount, powerOn, hasLock, lockType, lockCode, intakeNotes, diagnosis,
    warrantyMonthsCreate, warrantyNotesCreate, noWarranty,
    photoFile, org, createMutation, onOpenChange, orgWarrantyMonths
  ]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isSubmitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] overflow-y-auto">
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
                &middot; {org.tax_id_name ?? getFiscalConfig(org.currency_code ?? "PEN").taxIdLabel}: {org.tax_id_number}
              </span>
            )}
            <span className="text-muted-foreground">&middot; {currencySymbol} ({org.currency_code ?? "PEN"})</span>
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
                  <PhoneInput
                    value={guestPhone}
                    onChange={setGuestPhone}
                    placeholder="999 999 999"
                    defaultDialCode={CURRENCY_TO_DIAL[currencyCode] ?? "+51"}
                  />
                </div>
              </div>
            ) : (
              /* Cliente registrado — combobox con búsqueda */
              <ClientCombobox
                clientes={(clientes as { id: string; full_name: string; phone?: string | null; email?: string | null }[])}
                value={customerId}
                onChange={setCustomerId}
                error={errors.customer}
              />
            )}
          </div>

          {/* ── IA Autocomplete ── */}
          <div className="space-y-2 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3">
            <Label className="flex items-center gap-1.5 text-indigo-500 font-semibold">
              <FaIcon icon={faWandMagicSparkles} size={14} /> Escribe aqui para relleno rapido con IA            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ej: aifon 17 con base dañada costo 20"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAiAutocomplete(); } }}
                className="h-9 text-sm border-indigo-500/20 focus-visible:ring-indigo-500/50"
              />
              <Button 
                type="button" 
                onClick={handleAiAutocomplete} 
                disabled={isAiLoading || !aiPrompt.trim()}
                className="bg-indigo-500 hover:bg-indigo-600 h-9"
              >
                {isAiLoading ? <FaIcon icon={faSpinner} size={14} className="animate-spin" /> : "Autocompletar"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Escribe lo que indica el cliente y la IA completará el dispositivo, modelo, problema y precio.
            </p>
          </div>

          {/* ── Dispositivo ── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Dispositivo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={deviceType} onValueChange={setDeviceType}>
                  <SelectTrigger><SelectValue placeholder="Celular..." /></SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.deviceType && <p className="text-xs text-destructive">{errors.deviceType}</p>}
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Marca / Modelo</Label>
                <DeviceSelectorCombobox
                  brandText={deviceBrand}
                  onBrandChange={(name) => { setDeviceBrand(name); setDeviceModel(""); }}
                  modelText={deviceModel}
                  onModelChange={setDeviceModel}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>IMEI / N° de Serie</Label>
              <Input placeholder="35XXXXXXXXX" value={imei} onChange={(e) => setImei(e.target.value)} />
            </div>
          </div>

          {/* ── Problema reportado ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Describe el problema</Label>
              {issue.length > 5 && (
                <button 
                  type="button" 
                  onClick={() => handleFixText("issue")}
                  disabled={isFixingIssue}
                  className="text-[10px] text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full"
                >
                  {isFixingIssue ? <FaIcon icon={faSpinner} className="animate-spin" /> : <FaIcon icon={faWandMagicSparkles} />}
                  Resumir y Mejorar
                </button>
              )}
            </div>
            <Textarea
              placeholder="Pantalla rota, no enciende, batería se agota rápido"
              rows={3}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
            />
            {errors.issue && <p className="text-xs text-destructive">{errors.issue}</p>}
          </div>

          {/* ── Trabajo realizado / Diagnóstico ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                Trabajo / Diagnóstico
                <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
              </Label>
              {diagnosis.length > 5 && (
                <button 
                  type="button" 
                  onClick={() => handleFixText("diagnosis")}
                  disabled={isFixingDiagnosis}
                  className="text-[10px] text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full"
                >
                  {isFixingDiagnosis ? <FaIcon icon={faSpinner} className="animate-spin" /> : <FaIcon icon={faWandMagicSparkles} />}
                  Resumir para Boleta
                </button>
              )}
            </div>
            <Textarea
              placeholder="Cambio de pantalla, limpieza de placa..."
              rows={2}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>

          {/* ── Precio + Notas internas ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="Sin cargador, pantalla rayada"
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
              />
            </div>
          </div>

          {/* ── TOGGLE CAMPOS AVANZADOS ── */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-border/60 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
            >
              {showAdvanced ? "Ocultar Opciones Avanzadas" : "Mostrar Opciones Avanzadas (Garantía, Estado, Fotos)"}
              <FaIcon icon={showAdvanced ? faChevronUp : faChevronDown} size={10} />
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
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

                {/* Detalle de clave */}
                {hasLock && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <div className="space-y-2">
                      <Label>Tipo de clave *</Label>
                      <Select value={lockType} onValueChange={setLockType}>
                        <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                        <SelectContent>
                          {LOCK_TYPES.map((lt) => (
                            <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.lockType && <p className="text-xs text-destructive">{errors.lockType}</p>}
                    </div>
                    {lockType === "patron" ? (
                      <div className="space-y-2 sm:col-span-1">
                        <Label>Dibuja el patrón</Label>
                        <div className="flex flex-col items-center gap-2">
                          <PatternLock value={lockCode} onChange={setLockCode} size={180} />
                          {lockCode && (
                            <button
                              type="button"
                              onClick={() => setLockCode("")}
                              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                            >
                              Borrar patrón
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>
                          Código / Clave
                          {lockType === "huella" && <span className="text-muted-foreground text-xs ml-1">(no aplica)</span>}
                        </Label>
                        <Input
                          placeholder={lockType === "huella" ? "—" : "1234"}
                          value={lockCode}
                          onChange={(e) => setLockCode(e.target.value)}
                          disabled={lockType === "huella"}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Foto del dispositivo ── */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <FaIcon icon={faCamera} size={13} /> Foto del estado de ingreso
                  <span className="text-muted-foreground text-xs font-normal">(opcional · máx 5 MB)</span>
                </Label>
                {photoPreview ? (
                  <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-border group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt="Preview ingreso" className="w-full object-cover max-h-48" />
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
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors"
                    >
                      <FaIcon icon={faUpload} size={18} />
                      <span className="text-xs">Seleccionar foto</span>
                    </button>
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
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={onPhotoChange} />
                <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={onPhotoChange} />
              </div>

              {/* ── Garantia de esta reparacion ── */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm">
                  <FaIcon icon={faShieldHalved} size={13} className="text-emerald-400" />
                  Garantía de esta reparación
                  <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </Label>

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
                    ? "Sin garantía — no se registrará garantía al entregar"
                    : warrantyMonthsCreate
                      ? `${warrantyMonthsCreate} mes(es) · ${parseInt(warrantyMonthsCreate) * 30} días — los Términos globales del taller se añaden automáticamente al comprobante`
                      : `${orgWarrantyMonths} mes(es) por defecto del taller — los Términos globales se añaden automáticamente`}
                </p>

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
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
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
  );
}

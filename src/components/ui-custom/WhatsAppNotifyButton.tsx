"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import {
  faArrowsDownToLine,
  faScrewdriverWrench,
  faCircleCheck,
  faHandshake,
  faCircleXmark,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { PhoneInput, CURRENCY_TO_DIAL } from "@/components/ui-custom/PhoneInput";
import {
  buildWhatsAppUrl, buildWhatsAppMessage,
  type TicketNotifStatus, type WhatsAppMessageOptions, type WhatsAppStyle,
} from "@/lib/whatsapp";
import { useOrganization } from "@/contexts/OrganizationContext";

// ── Status labels ─────────────────────────────────────────────────────────────

const NOTIF_STATUSES: { value: TicketNotifStatus; label: string; icon: IconDefinition; color: string }[] = [
  { value: "recibido",   label: "Equipo recibido",          icon: faArrowsDownToLine, color: "text-blue-400" },
  { value: "en_proceso", label: "En proceso de reparacion", icon: faScrewdriverWrench, color: "text-amber-400" },
  { value: "completado", label: "Listo para retirar",       icon: faCircleCheck,      color: "text-green-400" },
  { value: "entregado",  label: "Entregado al cliente",     icon: faHandshake,        color: "text-emerald-400" },
  { value: "fallido",    label: "No se pudo reparar",       icon: faCircleXmark,      color: "text-destructive" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface WhatsAppNotifyButtonProps {
  currentStatus:  TicketNotifStatus;
  customerName:   string;
  customerPhone:  string | null | undefined;
  orgName:        string;
  orgWhatsapp?:   string | null;
  ticketId:       string;
  device:         string;
  warrantyDays?:       number | null;
  currencyCode?:       string;
  /** Pre-fills the "nota extra" field when the dialog opens (e.g. diagnosis) */
  defaultExtraNote?:   string;
  /** 'full' shows label text; 'icon' shows only icon */
  variant?:            "full" | "icon";
  /**
   * Controlled open state — cuando el padre lo pone en true, el diálogo
   * se abre automáticamente (e.g. al cambiar el status del ticket).
   */
  open?:          boolean;
  onOpenChange?:  (v: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WhatsAppNotifyButton({
  currentStatus,
  customerName,
  customerPhone,
  orgName,
  orgWhatsapp,
  ticketId,
  device,
  warrantyDays,
  currencyCode = "PEN",
  variant = "full",
  open: controlledOpen,
  onOpenChange: onControlledOpenChange,
  defaultExtraNote,
}: WhatsAppNotifyButtonProps) {
  const { org } = useOrganization();
  const waStyle: WhatsAppStyle =
    ((org?.whatsapp_templates as Record<string, string> | null)?.style as WhatsAppStyle) ?? "amigable";

  // Modo no-controlado: el botón maneja su propio estado
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open         = isControlled ? controlledOpen : internalOpen;

  const setOpen = (v: boolean) => {
    if (isControlled) {
      onControlledOpenChange?.(v);
    } else {
      setInternalOpen(v);
    }
  };

  const [status,    setStatus]    = useState<TicketNotifStatus>(currentStatus);
  const [phone,     setPhone]     = useState(customerPhone ?? "");
  const [extraNote, setExtraNote] = useState("");

  // Sincronizar estado del ticket cuando cambia desde el padre
  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  // Cuando el diálogo se abre, inicializar phone y extraNote
  useEffect(() => {
    if (open) {
      setPhone(customerPhone ?? "");
      setExtraNote(defaultExtraNote ?? "");
    }
  }, [open, customerPhone, defaultExtraNote]);

  const opts: WhatsAppMessageOptions = {
    phone,
    customerName,
    orgName,
    ticketId,
    status,
    device,
    orgWhatsapp,
    warrantyDays,
    extraNote: extraNote.trim() || undefined,
    style: waStyle,
  };

  const preview = buildWhatsAppMessage(opts);
  const waUrl   = buildWhatsAppUrl(opts);

  const hasPhone = phone.trim().replace(/\D/g, "").length >= 7;

  const handleSend = () => {
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const statusInfo = NOTIF_STATUSES.find(s => s.value === status);

  return (
    <>
      {/* Botón de disparo manual — siempre visible */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-green-500/40 text-green-500 hover:bg-green-500/10 hover:text-green-400 hover:border-green-400/60 transition-all"
        onClick={() => setOpen(true)}
        title="Enviar notificación por WhatsApp"
      >
        <FaIcon icon={faWhatsapp} size={14} />
        {variant === "full" && "Notificar"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FaIcon icon={faWhatsapp} size={16} className="text-green-500" />
              Enviar notificación por WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">

            {/* Tipo de mensaje */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Tipo de mensaje
              </Label>
              <div className="grid grid-cols-1 gap-1.5">
                {NOTIF_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                      status === s.value
                        ? "border-green-500/50 bg-green-500/8 text-foreground"
                        : "border-border hover:border-green-500/30 text-muted-foreground"
                    }`}
                  >
                    <FaIcon icon={s.icon} size={13} className={`shrink-0 ${s.color}`} />
                    <span className="flex-1">{s.label}</span>
                    {status === s.value && (
                      <FaIcon icon={faCheck} size={11} className="text-green-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Teléfono del cliente */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                WhatsApp del cliente
              </Label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                placeholder="999 999 999"
                defaultDialCode={CURRENCY_TO_DIAL[currencyCode] ?? "+51"}
              />
              {!hasPhone && phone.trim() !== "" && (
                <p className="text-xs text-amber-500">Ingresa un número válido (mín. 7 dígitos).</p>
              )}
              {phone.trim() === "" && (
                <p className="text-xs text-muted-foreground">
                  Sin teléfono registrado — puedes ingresarlo manualmente.
                </p>
              )}
            </div>

            {/* Nota adicional */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Nota adicional <span className="font-normal normal-case opacity-60">(opcional)</span>
              </Label>
              <Input
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder="Ej: El costo de reparación fue S/ 150..."
                className="text-sm"
              />
            </div>

            {/* Preview del mensaje */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Vista previa
              </Label>
              <div className="relative rounded-xl bg-[#0b4619]/20 border border-green-500/20 p-3">
                <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-green-500/60 font-mono">
                  {statusInfo && <FaIcon icon={statusInfo.icon} size={10} className={statusInfo.color} />}
                  {statusInfo?.label}
                </span>
                <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed pt-4">
                  {preview}
                </pre>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Omitir
            </Button>
            <Button
              disabled={!hasPhone}
              onClick={handleSend}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <FaIcon icon={faWhatsapp} size={14} />
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import React, { useState } from "react";
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
  buildWhatsAppUrl, buildWhatsAppMessage,
  type TicketNotifStatus, type WhatsAppMessageOptions,
} from "@/lib/whatsapp";

// ── Status labels for the selector ───────────────────────────────────────────

const NOTIF_STATUSES: { value: TicketNotifStatus; label: string }[] = [
  { value: "recibido",   label: "Equipo recibido" },
  { value: "en_proceso", label: "En proceso de reparacion" },
  { value: "completado", label: "Listo para retirar" },
  { value: "entregado",  label: "Entregado al cliente" },
  { value: "fallido",    label: "No se pudo reparar" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface WhatsAppNotifyButtonProps {
  /** Current ticket status — pre-selects the template */
  currentStatus: TicketNotifStatus;
  customerName:  string;
  customerPhone: string | null | undefined;
  orgName:       string;
  orgWhatsapp?:  string | null;
  ticketId:      string;   // short ID shown in the message
  device:        string;
  warrantyDays?: number | null;
  /** 'full' shows label text; 'icon' shows only icon (for tight spaces) */
  variant?:      "full" | "icon";
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
  variant = "full",
}: WhatsAppNotifyButtonProps) {
  const [open,      setOpen]      = useState(false);
  const [status,    setStatus]    = useState<TicketNotifStatus>(currentStatus);
  const [phone,     setPhone]     = useState(customerPhone ?? "");
  const [extraNote, setExtraNote] = useState("");

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
  };

  const preview = buildWhatsAppMessage(opts);
  const waUrl   = buildWhatsAppUrl(opts);

  const hasPhone = phone.trim().replace(/\D/g, "").length >= 7;

  const handleSend = () => {
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-green-500/40 text-green-500 hover:bg-green-500/10 hover:text-green-400 hover:border-green-400/60 transition-all"
        onClick={() => setOpen(true)}
        title="Enviar notificacion por WhatsApp"
      >
        <FaIcon icon={faWhatsapp} size={14} />
        {variant === "full" && "Notificar"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FaIcon icon={faWhatsapp} size={16} className="text-green-500" />
              Enviar notificacion por WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">

            {/* Template selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Tipo de mensaje
              </Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TicketNotifStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIF_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Numero de WhatsApp del cliente
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+51 999 999 999"
                className="font-mono"
              />
              {!hasPhone && phone.trim() !== "" && (
                <p className="text-xs text-amber-500">Ingresa un numero valido (min 7 digitos).</p>
              )}
              {phone.trim() === "" && (
                <p className="text-xs text-muted-foreground">
                  Este cliente no tiene telefono registrado. Ingresalo manualmente.
                </p>
              )}
            </div>

            {/* Extra note */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Nota adicional <span className="font-normal normal-case opacity-60">(opcional)</span>
              </Label>
              <Input
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder="Ej: El costo de reparacion fue S/ 150..."
                className="text-sm"
              />
            </div>

            {/* Preview */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Vista previa del mensaje
              </Label>
              <div className="relative rounded-xl bg-[#0b4619]/20 border border-green-500/20 p-3">
                <div className="absolute top-2 right-2 text-[10px] text-green-500/60 font-mono">WhatsApp</div>
                <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                  {preview}
                </pre>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
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

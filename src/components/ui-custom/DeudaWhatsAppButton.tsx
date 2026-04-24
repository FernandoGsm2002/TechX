"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { faMoneyBillWave } from "@fortawesome/free-solid-svg-icons";
import { PhoneInput, CURRENCY_TO_DIAL } from "@/components/ui-custom/PhoneInput";
import {
  buildDeudaWhatsAppUrl,
  buildDeudaWhatsAppMessage,
  type DeudaWhatsAppOptions,
} from "@/lib/whatsapp";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DeudaWhatsAppButtonProps {
  customerName:   string;
  customerPhone:  string | null | undefined;
  orgName:        string;
  totalDebt:      number;
  currencySymbol: string;
  currencyCode?:  string;
  /** Lista corta de items pendientes */
  items?:         string[];
  /** 'full' muestra texto; 'icon' solo icono */
  variant?:       "full" | "icon";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DeudaWhatsAppButton({
  customerName,
  customerPhone,
  orgName,
  totalDebt,
  currencySymbol,
  currencyCode = "PEN",
  items = [],
  variant = "full",
}: DeudaWhatsAppButtonProps) {
  const [open,      setOpen]      = useState(false);
  const [phone,     setPhone]     = useState(customerPhone ?? "");
  const [extraNote, setExtraNote] = useState("");

  // Reiniciar al abrir
  useEffect(() => {
    if (open) {
      setPhone(customerPhone ?? "");
      setExtraNote("");
    }
  }, [open, customerPhone]);

  const opts: DeudaWhatsAppOptions = {
    phone,
    customerName,
    orgName,
    totalDebt,
    currencySymbol,
    items,
    extraNote: extraNote.trim() || undefined,
  };

  const preview  = buildDeudaWhatsAppMessage(opts);
  const waUrl    = buildDeudaWhatsAppUrl(opts);
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
        title="Enviar recordatorio de deuda por WhatsApp"
      >
        <FaIcon icon={faWhatsapp} size={14} />
        {variant === "full" && "Recordar deuda"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FaIcon icon={faWhatsapp} size={16} className="text-green-500" />
              Recordatorio de deuda pendiente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">

            {/* Resumen de deuda */}
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
              <FaIcon icon={faMoneyBillWave} size={18} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Deuda pendiente de</p>
                <p className="font-semibold text-sm">{customerName}</p>
              </div>
              <p className="ml-auto font-bold text-amber-400 text-base font-mono">
                {currencySymbol} {totalDebt.toFixed(2)}
              </p>
            </div>

            {/* Items de deuda */}
            {items.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Conceptos incluidos
                </Label>
                <ul className="space-y-1">
                  {items.map((item, i) => (
                    <li
                      key={i}
                      className="text-xs text-foreground/80 flex items-start gap-1.5 px-2 py-1 rounded-md bg-muted/40"
                    >
                      <span className="text-muted-foreground mt-px">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Teléfono */}
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
                placeholder="Ej: Puede pagar por transferencia al número..."
                className="text-sm"
              />
            </div>

            {/* Preview */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                Vista previa
              </Label>
              <div className="relative rounded-xl bg-[#0b4619]/20 border border-green-500/20 p-3">
                <span className="absolute top-2 right-2 text-[10px] text-green-500/60 font-mono">
                  Recordatorio de pago
                </span>
                <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed pt-4">
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
              Enviar recordatorio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

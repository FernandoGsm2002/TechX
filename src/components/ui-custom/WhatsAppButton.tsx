"use client";

import React, { useState } from "react";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import {
  faPaperPlane, faChevronDown, faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { notifyClientWhatsApp, type WaTemplate } from "@/lib/notifyClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WhatsAppButtonProps {
  phone:          string | null | undefined;
  clientName?:    string | null;
  ticketNumber?:  string | number | null;
  device?:        string | null;
  orgName?:       string | null;
  /** Si se pasa, se usa como template por defecto al hacer clic directo */
  defaultTemplate?: WaTemplate;
  size?:          "sm" | "default";
  className?:     string;
}

// ── Template items ─────────────────────────────────────────────────────────────

const TEMPLATE_ITEMS: { template: WaTemplate; label: string; emoji: string }[] = [
  { template: "recibido",   label: "Dispositivo recibido",     emoji: "👋" },
  { template: "en_proceso", label: "En proceso de reparación", emoji: "🔧" },
  { template: "completado", label: "Listo para retirar",       emoji: "✅" },
  { template: "entregado",  label: "Entregado al cliente",     emoji: "🎉" },
  { template: "custom",     label: "Mensaje personalizado…",   emoji: "✏️" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function WhatsAppButton({
  phone,
  clientName,
  ticketNumber,
  device,
  orgName,
  defaultTemplate = "completado",
  size = "sm",
  className,
}: WhatsAppButtonProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customMsg,  setCustomMsg]  = useState("");
  const [sent,       setSent]       = useState<WaTemplate | null>(null);

  const hasPhone = !!phone?.trim();

  function send(template: WaTemplate, customMessage?: string) {
    const ok = notifyClientWhatsApp({
      phone: phone ?? "",
      clientName: clientName ?? undefined,
      ticketNumber: ticketNumber ?? undefined,
      device: device ?? undefined,
      orgName: orgName ?? undefined,
      template,
      customMessage,
    });
    if (ok) {
      setSent(template);
      toast.success("WhatsApp abierto para enviar mensaje");
      setTimeout(() => setSent(null), 3000);
    } else {
      toast.error("Teléfono del cliente no disponible");
    }
  }

  if (!hasPhone) {
    return (
      <Button
        size={size}
        variant="outline"
        disabled
        className={cn("gap-1.5 opacity-50", className)}
        title="Sin teléfono registrado"
      >
        <FaIcon icon={faWhatsapp} size={13} />
        WhatsApp
      </Button>
    );
  }

  return (
    <>
      <div className={cn("flex items-center", className)}>
        {/* Quick-send botón */}
        <Button
          size={size}
          variant="outline"
          className="gap-1.5 rounded-r-none border-r-0 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10 hover:border-[#25D366]/60"
          onClick={() => send(defaultTemplate)}
        >
          {sent === defaultTemplate ? (
            <FaIcon icon={faCheck} size={12} className="text-emerald-400" />
          ) : (
            <FaIcon icon={faWhatsapp} size={14} />
          )}
          <span className="text-foreground">Avisar</span>
        </Button>

        {/* Dropdown otros templates */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size={size}
              variant="outline"
              className="rounded-l-none px-2 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10 hover:border-[#25D366]/60"
            >
              <FaIcon icon={faChevronDown} size={10} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <p className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
              Plantillas — {clientName ?? phone}
            </p>
            <DropdownMenuSeparator />
            {TEMPLATE_ITEMS.map((item) => (
              <DropdownMenuItem
                key={item.template}
                className="gap-2 cursor-pointer"
                onClick={() => {
                  if (item.template === "custom") {
                    setCustomOpen(true);
                  } else {
                    send(item.template);
                  }
                }}
              >
                <span>{item.emoji}</span>
                <span className="text-xs">{item.label}</span>
                {sent === item.template && (
                  <FaIcon icon={faCheck} size={10} className="ml-auto text-emerald-400" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Custom message dialog */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaIcon icon={faWhatsapp} size={16} className="text-[#25D366]" />
              Mensaje personalizado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Para: <strong>{clientName ?? phone}</strong> · {phone}
            </p>
            <Textarea
              rows={5}
              placeholder="Escribe tu mensaje aquí…"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="resize-none text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white border-0"
              disabled={!customMsg.trim()}
              onClick={() => {
                send("custom", customMsg);
                setCustomOpen(false);
                setCustomMsg("");
              }}
            >
              <FaIcon icon={faPaperPlane} size={13} />
              Enviar por WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

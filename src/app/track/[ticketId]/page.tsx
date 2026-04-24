"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  faWrench, faSpinner, faCircleCheck, faCircleXmark,
  faBoxOpen, faClock, faPhone,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: typeof faWrench;
  description: string;
}> = {
  recibido: {
    label: "Recibido",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    icon: faBoxOpen,
    description: "Tu dispositivo ha sido recibido en el taller y está en espera de revisión.",
  },
  en_proceso: {
    label: "En proceso",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    icon: faWrench,
    description: "Un técnico está trabajando en tu reparación en este momento.",
  },
  completado: {
    label: "Listo para retirar",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    icon: faCircleCheck,
    description: "¡Tu reparación está lista! Puedes pasar a retirar tu dispositivo.",
  },
  entregado: {
    label: "Entregado",
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    border: "border-border",
    icon: faCircleCheck,
    description: "El dispositivo fue entregado al cliente.",
  },
  fallido: {
    label: "No reparable",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    icon: faCircleXmark,
    description: "No fue posible completar la reparación. Contacta al taller para más información.",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrackingData {
  ticket_number: string;
  status: string;
  updated_at: string;
  device_brand: string | null;
  device_model: string | null;
  org_name: string;
  org_phone: string | null;
  org_logo: string | null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TrackPage() {
  const params = useParams();
  const ticketId = params?.ticketId as string;

  const [data, setData]       = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) return;

    fetch(`/api/track/${ticketId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Ticket no encontrado");
        return r.json();
      })
      .then((d: TrackingData) => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [ticketId]);

  const cfg = data ? (STATUS_CONFIG[data.status] ?? STATUS_CONFIG.recibido) : null;
  const device = [data?.device_brand, data?.device_model].filter(Boolean).join(" ") || null;
  const timeAgo = data
    ? formatDistanceToNow(new Date(data.updated_at), { addSuffix: true, locale: es })
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Org header */}
        {data && (
          <div className="flex flex-col items-center gap-3 text-center">
            {data.org_logo && (
              <img
                src={data.org_logo}
                alt={data.org_name}
                className="h-14 w-auto object-contain rounded-lg"
              />
            )}
            <h1 className="text-lg font-bold text-foreground">{data.org_name}</h1>
            <p className="text-sm text-muted-foreground">Seguimiento de reparación</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-12">
            <FaIcon icon={faSpinner} size={28} className="text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Buscando tu reparación…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
            <FaIcon icon={faCircleXmark} size={32} className="text-red-400/60 mx-auto" />
            <p className="font-semibold text-sm">No encontramos esta reparación</p>
            <p className="text-xs text-muted-foreground">
              Verifica que el enlace sea correcto o contacta al taller.
            </p>
          </div>
        )}

        {/* Tracking card */}
        {!loading && data && cfg && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            {/* Ticket number */}
            <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Orden</p>
                <p className="font-mono font-bold text-foreground text-base">{data.ticket_number}</p>
              </div>
              {device && (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Dispositivo</p>
                  <p className="text-sm font-semibold text-foreground">{device}</p>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="px-6 py-6 space-y-4">
              <div className={`flex items-center gap-3 rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
                <div className={`size-10 rounded-full flex items-center justify-center ${cfg.bg}`}>
                  <FaIcon icon={cfg.icon} size={18} className={cfg.color} />
                </div>
                <div>
                  <p className={`font-bold text-base ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                </div>
              </div>

              {/* Status timeline */}
              <div className="space-y-1.5">
                {Object.entries(STATUS_CONFIG)
                  .filter(([k]) => k !== "fallido")
                  .map(([key, s], idx, arr) => {
                    const statusOrder = ["recibido", "en_proceso", "completado", "entregado"];
                    const currentIdx = statusOrder.indexOf(data.status);
                    const stepIdx    = statusOrder.indexOf(key);
                    const isDone     = stepIdx <= currentIdx || data.status === "entregado";
                    const isCurrent  = key === data.status;
                    const isLast     = idx === arr.length - 1;

                    return (
                      <div key={key} className="flex items-start gap-2.5">
                        <div className="flex flex-col items-center">
                          <div className={`size-5 rounded-full flex items-center justify-center shrink-0 border ${
                            isCurrent
                              ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                              : isDone
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "bg-muted border-border text-muted-foreground"
                          }`}>
                            <FaIcon icon={isDone && !isCurrent ? faCircleCheck : s.icon} size={10} />
                          </div>
                          {!isLast && (
                            <div className={`w-[1px] h-4 mt-0.5 ${isDone ? "bg-emerald-500/40" : "bg-border"}`} />
                          )}
                        </div>
                        <p className={`text-xs pt-0.5 ${isCurrent ? "font-semibold " + cfg.color : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                          {s.label}
                          {isCurrent && timeAgo && (
                            <span className="ml-1.5 font-normal opacity-70">
                              <FaIcon icon={faClock} size={9} className="mr-0.5" />
                              {timeAgo}
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Contact CTA */}
            {data.org_phone && (
              <div className="px-6 py-4 border-t border-border/60 bg-muted/20">
                <a
                  href={`tel:${data.org_phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FaIcon icon={faPhone} size={12} className="text-primary" />
                  <span>¿Preguntas? Llama al <strong>{data.org_phone}</strong></span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Powered by */}
        <p className="text-center text-[10px] text-muted-foreground/40">
          Powered by TechX
        </p>
      </div>
    </div>
  );
}

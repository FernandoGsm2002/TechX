"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useOrganization } from "@/contexts/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  faGear, faUsers, faCircleCheck, faTimes,
  faWandMagicSparkles, faChevronRight, faTicket, faBox,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";

// ── Lightweight count queries ─────────────────────────────────────────────────

function useOnboardingCounts(orgId: string | undefined) {
  const ticketCount = useQuery({
    queryKey: ["onboarding-ticket-count", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!);
      return count ?? 0;
    },
  });

  const inventoryCount = useQuery({
    queryKey: ["onboarding-inv-count", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const { count } = await supabase
        .from("inventory")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!);
      return count ?? 0;
    },
  });

  return {
    hasTicket: (ticketCount.data ?? 0) > 0,
    hasInventory: (inventoryCount.data ?? 0) > 0,
  };
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function GettingStartedWidget() {
  const { role, org } = useOrganization();
  const { data: techs = [] } = useTechnicians();
  const { hasTicket, hasInventory } = useOnboardingCounts(org?.id);

  const [isOpen, setIsOpen]               = useState(false);
  const [isMounted, setIsMounted]         = useState(false);
  const [minimized, setMinimized]         = useState(false);
  const [dismissedSession, setDismissedSession] = useState(false);
  const [celebrated, setCelebrated]       = useState(false);

  const hasConfigured  = !!org?.tax_id_number;
  const hasTechnicians = techs.length > 0;

  const steps = [
    {
      id:   "config",
      title: "Configura tu negocio",
      desc:  "Divisa, identificación, impuestos y logo.",
      icon:  faGear,
      href:  "/configuracion",
      done:  hasConfigured,
    },
    {
      id:   "team",
      title: "Invita a tu equipo",
      desc:  "Cuentas para tus técnicos.",
      icon:  faUsers,
      href:  "/perfil",
      done:  hasTechnicians,
    },
    {
      id:   "ticket",
      title: "Crea tu primer ticket",
      desc:  "Registra una reparación de prueba.",
      icon:  faTicket,
      href:  "/tickets",
      done:  hasTicket,
    },
    {
      id:   "inventory",
      title: "Agrega repuestos",
      desc:  "Carga tu inventario de piezas.",
      icon:  faBox,
      href:  "/inventario",
      done:  hasInventory,
    },
  ];

  const progress   = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  const allDone    = progress === 100;

  useEffect(() => {
    setIsMounted(true);
    if (role !== "admin" && role !== "superadmin") return;
    const skippedForever = localStorage.getItem("techx_onboarding_skipped");
    if (skippedForever !== "true" && !dismissedSession) {
      setIsOpen(true);
    }
  }, [role, dismissedSession]);

  // Auto-dismiss after celebrating completion
  useEffect(() => {
    if (!allDone || celebrated || !isOpen) return;
    setCelebrated(true);
    const t = setTimeout(() => setIsOpen(false), 4000);
    return () => clearTimeout(t);
  }, [allDone, celebrated, isOpen]);

  if (!isMounted || !isOpen) return null;

  const handlePermanentDismiss = () => {
    localStorage.setItem("techx_onboarding_skipped", "true");
    setIsOpen(false);
  };

  const handleSessionDismiss = () => {
    setDismissedSession(true);
    setIsOpen(false);
  };

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
        <Button
          onClick={() => setMinimized(false)}
          className="rounded-full shadow-xl bg-card border border-border/60 hover:bg-muted text-foreground p-3 h-auto gap-2"
        >
          <div className="flex bg-primary/20 text-primary rounded-full size-6 items-center justify-center">
            <FaIcon icon={faWandMagicSparkles} size={12} />
          </div>
          <span className="text-sm font-semibold pr-2">Continuar Configuración</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[340px] max-w-[calc(100vw-2rem)] shadow-2xl rounded-2xl border border-border/60 bg-background overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-background p-4 flex items-start justify-between">
        {allDone ? (
          <div className="space-y-0.5 pr-12">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-emerald-500">
              <FaIcon icon={faCircleCheck} size={14} />
              ¡Todo listo!
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tu taller está configurado y operativo.
            </p>
          </div>
        ) : (
          <div className="space-y-1 pr-12">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
              <FaIcon icon={faWandMagicSparkles} size={14} className="text-amber-500" />
              Configuración Inicial
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pasos necesarios para iniciar tu gestión y operación.
            </p>
          </div>
        )}

        <div className="flex items-center gap-0.5 absolute top-3 right-3">
          {!allDone && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
              onClick={() => setMinimized(true)}
              title="Minimizar"
            >
              <span className="block w-2.5 h-[1.5px] bg-current rounded-full" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
            onClick={handleSessionDismiss}
            title="Cerrar ventana"
          >
            <FaIcon icon={faTimes} size={12} />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-1">
        <div className="flex justify-between text-[10px] font-semibold text-muted-foreground mb-1">
          <span>Progreso</span>
          <span className={progress === 100 ? "text-emerald-500 font-bold" : ""}>{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-in-out",
              progress === 100 ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="px-4 py-3 space-y-2">
        {steps.map((step) => (
          <Link key={step.id} href={step.href} onClick={() => setMinimized(true)} className="block group">
            <div className={cn(
              "relative flex items-center justify-between rounded-xl border p-2.5 transition-all duration-300",
              step.done
                ? "bg-muted/30 border-border/40"
                : "bg-card hover:bg-emerald-500/5 hover:border-emerald-500/30 border-border shadow-sm hover:shadow-md"
            )}>
              <div className="flex gap-3 items-center min-w-0 pr-4">
                <div className={cn(
                  "flex size-8 items-center justify-center rounded-full shrink-0 transition-colors",
                  step.done
                    ? "bg-emerald-500 text-white"
                    : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                )}>
                  <FaIcon icon={step.done ? faCircleCheck : step.icon} size={12} />
                </div>
                <div className="min-w-0">
                  <h4 className={cn("text-xs font-bold truncate", step.done && "line-through text-muted-foreground")}>
                    {step.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{step.desc}</p>
                </div>
              </div>
              {!step.done && (
                <div className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 duration-300 ml-2">
                  <FaIcon icon={faChevronRight} size={10} />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <Separator />

      {/* Footer */}
      <div className="px-4 py-2.5 bg-muted/20 flex items-center justify-between">
        {allDone ? (
          <p className="text-[10px] text-muted-foreground">Cerrando automáticamente…</p>
        ) : (
          <button
            type="button"
            onClick={handlePermanentDismiss}
            className="text-[10px] font-medium text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Omitir anuncio para siempre
          </button>
        )}
      </div>
    </div>
  );
}

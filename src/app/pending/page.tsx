"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  faClock, faRightFromBracket, faRotate, faCircleCheck, faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [noOrg, setNoOrg] = useState(false); // true when registration was incomplete

  useEffect(() => {
    const loadInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, organizations(name, is_approved, is_active)")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        setNoOrg(true);
        return;
      }

      const org = (profile?.organizations as { name?: string; is_approved?: boolean; is_active?: boolean } | null);
      setOrgName(org?.name ?? null);

      // If already approved since last check → send to dashboard
      if (org?.is_approved && org?.is_active) {
        router.replace("/inicio");
      }
    };
    loadInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setChecking(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, organizations(name, is_approved, is_active)")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      setNoOrg(true);
      setChecking(false);
      return;
    }

    const org = (profile?.organizations as { name?: string; is_approved?: boolean; is_active?: boolean } | null);

    if (org?.is_approved && org?.is_active) {
      toast.success("¡Tu cuenta fue aprobada! Entrando al sistema...");
      router.replace("/inicio");
    } else {
      toast.info("Tu cuenta aún está en revisión. Vuelve a intentarlo pronto.");
    }
    setChecking(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  //No-org state: incomplete registration
  if (noOrg) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex size-24 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5">
              <FaIcon icon={faRightFromBracket} size={40} className="text-destructive/70" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Registro incompleto</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tu cuenta fue creada pero el registro del taller no se completó.
              Vuelve al formulario para completarlo.
            </p>
          </div>
          {email && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <FaIcon icon={faEnvelope} size={13} className="shrink-0" />
              <span>Cuenta: <strong className="text-foreground">{email}</strong></span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button className="w-full gap-2" asChild>
              <Link href="/register">Completar registro del taller</Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <FaIcon icon={faRightFromBracket} size={14} />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">

        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="flex size-24 items-center justify-center rounded-full bg-amber-500/10 ring-8 ring-amber-500/5">
              <FaIcon icon={faClock} size={48} className="text-amber-400 animate-pulse" />
            </div>
            {/* Orbiting dot */}
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{ animationDuration: "3s" }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 size-3 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Cuenta en Revisión</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tu solicitud para{" "}
            {orgName ? (
              <strong className="text-foreground">{orgName}</strong>
            ) : (
              "tu taller"
            )}{" "}
            está siendo revisada por el equipo de TechX. Te notificaremos cuando sea aprobada.
          </p>
        </div>

        {/* Status card */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 text-left space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Estado de tu solicitud
          </p>

          <div className="space-y-2.5">
            {[
              { label: "Solicitud enviada", done: true },
              { label: "Revisión por TechX", done: false, active: true },
              { label: "Configuración de cuenta", done: false },
              { label: "Acceso al sistema", done: false },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                <div
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                    step.done
                      ? "bg-emerald-500"
                      : step.active
                      ? "bg-amber-500 animate-pulse"
                      : "bg-muted"
                  }`}
                >
                  {step.done && <FaIcon icon={faCircleCheck} size={10} className="text-white" />}
                  {step.active && <div className="size-2 rounded-full bg-white" />}
                </div>
                <span
                  className={`text-sm ${
                    step.done
                      ? "text-emerald-400"
                      : step.active
                      ? "text-amber-400 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Email notice */}
        {email && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <FaIcon icon={faEnvelope} size={13} className="shrink-0" />
            <span>
              Te avisaremos a <strong className="text-foreground">{email}</strong>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            className="w-full gap-2"
            onClick={handleRefresh}
            disabled={checking}
          >
            <FaIcon icon={faRotate} size={14} className={checking ? "animate-spin" : ""} />
            {checking ? "Verificando..." : "Verificar estado"}
          </Button>
          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <FaIcon icon={faRightFromBracket} size={14} />
            Cerrar sesión
          </Button>
        </div>

      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, LogOut, RefreshCw, CheckCircle2, Mail } from "lucide-react";
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

      const org = (profile?.organizations as { name?: string; is_approved?: boolean; is_active?: boolean } | null);
      setOrgName(org?.name ?? null);

      // If already approved since last check → send to dashboard
      if (org?.is_approved && org?.is_active) {
        router.replace("/");
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

    const org = (profile?.organizations as { name?: string; is_approved?: boolean; is_active?: boolean } | null);

    if (org?.is_approved && org?.is_active) {
      toast.success("¡Tu cuenta fue aprobada! Entrando al sistema...");
      router.replace("/");
    } else {
      toast.info("Tu cuenta aún está en revisión. Vuelve a intentarlo pronto.");
    }
    setChecking(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">

        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="flex size-24 items-center justify-center rounded-full bg-amber-500/10 ring-8 ring-amber-500/5">
              <Clock className="size-12 text-amber-400 animate-pulse" />
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
                  {step.done && <CheckCircle2 className="size-3 text-white" />}
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
            <Mail className="size-3.5 shrink-0" />
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
            <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Verificando..." : "Verificar estado"}
          </Button>
          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>

      </div>
    </div>
  );
}

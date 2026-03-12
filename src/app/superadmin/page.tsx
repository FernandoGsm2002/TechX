import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ShieldCheck, Building2, Clock, CheckCircle2, CreditCard, AlertTriangle,
} from "lucide-react";
import { SuperadminOrgsClient } from "./SuperadminOrgsClient";

const SUPERADMIN_EMAIL = "fernandoapple2002@gmail.com";

export const metadata: Metadata = {
  title: "Superadmin · TechX",
  description: "Panel de administración de subscripciones y organizaciones",
};

export default async function SuperadminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.email !== SUPERADMIN_EMAIL) redirect("/");

  const { data: orgs } = await supabase
    .from("organizations")
    .select("*")
    .order("is_approved", { ascending: true })
    .order("created_at", { ascending: false });

  const allOrgs = orgs ?? [];
  const pending   = allOrgs.filter((o) => !o.is_approved);
  const active    = allOrgs.filter((o) => o.is_approved && o.is_active !== false);
  const suspended = allOrgs.filter((o) => o.is_active === false && o.is_approved);
  const expiring  = allOrgs.filter((o) => {
    if (!o.subscription_end || !o.is_approved) return false;
    // eslint-disable-next-line react-compiler/react-compiler
    const days = (new Date(o.subscription_end).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 7;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/20">
          <ShieldCheck className="size-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel Superadmin</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de suscripciones y organizaciones · <span className="font-mono text-xs">{user?.email}</span>
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-1 pt-4 px-4 flex-row items-center gap-2 space-y-0">
            <Building2 className="size-4 text-blue-400" />
            <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold">{allOrgs.length}</p>
            <p className="text-[11px] text-muted-foreground">organizaciones</p>
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card className={`border-amber-500/20 ${pending.length > 0 ? "bg-amber-500/5" : "bg-card/50"}`}>
          <CardHeader className="pb-1 pt-4 px-4 flex-row items-center gap-2 space-y-0">
            <Clock className="size-4 text-amber-400" />
            <CardTitle className="text-xs font-medium text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-3xl font-bold ${pending.length > 0 ? "text-amber-400" : ""}`}>
              {pending.length}
            </p>
            <p className="text-[11px] text-muted-foreground">por aprobar</p>
          </CardContent>
        </Card>

        {/* Activas */}
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-1 pt-4 px-4 flex-row items-center gap-2 space-y-0">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <CardTitle className="text-xs font-medium text-muted-foreground">Activas</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold text-emerald-400">{active.length}</p>
            <p className="text-[11px] text-muted-foreground">en producción</p>
          </CardContent>
        </Card>

        {/* Por vencer / Suspendidas */}
        <Card className={`${expiring.length > 0 || suspended.length > 0 ? "border-red-500/20 bg-red-500/5" : "border-border/50 bg-card/50"}`}>
          <CardHeader className="pb-1 pt-4 px-4 flex-row items-center gap-2 space-y-0">
            <AlertTriangle className="size-4 text-red-400" />
            <CardTitle className="text-xs font-medium text-muted-foreground">Atención</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-3xl font-bold ${expiring.length > 0 || suspended.length > 0 ? "text-red-400" : ""}`}>
              {expiring.length + suspended.length}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {suspended.length} susp. · {expiring.length} por vencer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Panel ── */}
      <Card className="border-border/50">
        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-4">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
            <CreditCard className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Organizaciones y Suscripciones</CardTitle>
            <CardDescription className="text-xs">
              Aprueba, suspende, elimina y gestiona los planes de cada empresa
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <SuperadminOrgsClient initialOrgs={allOrgs} />
        </CardContent>
      </Card>
    </div>
  );
}

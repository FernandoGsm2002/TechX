"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  faCircleCheck, faCircleXmark, faClock, faBuilding, faSpinner, faRotate,
  faShieldHalved, faTrash, faCreditCard, faCalendarDays, faChevronDown,
  faChevronUp, faMagnifyingGlass, faGlobe, faPhone, faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
type Organization = Database["public"]["Tables"]["organizations"]["Row"];
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type PlanType = "free" | "basic" | "pro" | "enterprise" | "3_meses" | "6_meses" | "1_anio";

const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  free:       { label: "Free",       color: "text-muted-foreground", bg: "bg-muted/30",           border: "border-border/50" },
  basic:      { label: "Basic",      color: "text-blue-400",        bg: "bg-blue-500/10",         border: "border-blue-500/30" },
  pro:        { label: "Pro",        color: "text-violet-400",      bg: "bg-violet-500/10",       border: "border-violet-500/30" },
  enterprise: { label: "Enterprise", color: "text-amber-400",       bg: "bg-amber-500/10",        border: "border-amber-500/30" },
  "3_meses":  { label: "3 Meses",    color: "text-blue-400",        bg: "bg-blue-500/10",         border: "border-blue-500/30" },
  "6_meses":  { label: "6 Meses",    color: "text-violet-400",      bg: "bg-violet-500/10",       border: "border-violet-500/30" },
  "1_anio":   { label: "1 Año",      color: "text-amber-400",       bg: "bg-amber-500/10",        border: "border-amber-500/30" },
};

const STATUS_META = {
  active:   { label: "Activa",    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  pending:  { label: "Pendiente", color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  suspended:{ label: "Suspendida",color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30" },
};

function getOrgStatus(org: Organization) {
  if (!org.is_approved) return "pending";
  if (org.is_active === false) return "suspended";
  return "active";
}

// ── Plan Badge ────────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return null;
  const m = PLAN_META[plan] ?? PLAN_META["free"];
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize", m.color, m.bg, m.border)}>
      {m.label}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ org }: { org: Organization }) {
  const status = getOrgStatus(org);
  const m = STATUS_META[status];
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", m.color, m.bg, m.border)}>
      {m.label}
    </span>
  );
}

// ── Subscription Dialog ───────────────────────────────────────────────────────

function SubscriptionDialog({
  org,
  open,
  onOpenChange,
  onSave,
}: {
  org: Organization;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: () => void;
}) {
  const supabase = createClient();
  const [plan, setPlan] = useState<string>(
    (org.plan_type ?? "free") as string
  );
  const [endDate,  setEndDate]  = useState<string>(
    org.subscription_end ? org.subscription_end.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        plan_type:        plan as any,
        subscription_end: endDate ? new Date(endDate).toISOString() : null,
      })
      .eq("id", org.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Suscripción de "${org.name}" actualizada`);
    onSave();
    onOpenChange(false);
  };

  // Quick presets
  const addMonths = (n: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    setEndDate(d.toISOString().slice(0, 10));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FaIcon icon={faCreditCard} size={14} className="text-violet-400" />
            Gestionar suscripción
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{org.name}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Plan selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(PLAN_META) as [string, typeof PLAN_META[string]][]).map(([key, m]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPlan(key)}
                  className={cn(
                    "flex items-center justify-center py-2.5 rounded-xl border text-sm font-semibold transition-all",
                    plan === key
                      ? cn(m.color, m.bg, m.border, "scale-[0.98]")
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry date */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vencimiento</p>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="[color-scheme:dark]"
            />
            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {[1, 3, 6, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => addMonths(n)}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  +{n} mes{n > 1 ? "es" : ""}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setEndDate("")}
                className="text-[10px] px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors"
              >
                Sin vencimiento
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 space-y-1">
            <p className="text-xs text-muted-foreground">Vista previa</p>
            <div className="flex items-center gap-2 flex-wrap">
              <PlanBadge plan={plan as string} />
              {endDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FaIcon icon={faCalendarDays} size={10} />
                  Vence {format(new Date(endDate), "d MMM yyyy", { locale: es })}
                </span>
              )}
              {!endDate && <span className="text-xs text-muted-foreground">Sin fecha de vencimiento</span>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <FaIcon icon={faSpinner} size={12} className="animate-spin" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Org Row Card ──────────────────────────────────────────────────────────────

function OrgCard({
  org,
  onAction,
}: {
  org: Organization;
  onAction: () => void;
}) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [expanded,  setExpanded]  = useState(false);
  const [subOpen,   setSubOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const status = getOrgStatus(org);

  const handleApprove = () => {
    startTransition(async () => {
      const { error } = await supabase.rpc("approve_organization", { org_id: org.id });
      if (error) toast.error(error.message);
      else { toast.success(`"${org.name}" aprobada ✅`); onAction(); }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const { error } = await supabase.rpc("reject_organization", { org_id: org.id });
      if (error) toast.error(error.message);
      else { toast.warning(`"${org.name}" rechazada`); onAction(); }
    });
  };

  const handleSuspend = () => {
    startTransition(async () => {
      const newActive = org.is_active !== false; // toggle
      const { error } = await supabase
        .from("organizations")
        .update({ is_active: !newActive })
        .eq("id", org.id);
      if (error) toast.error(error.message);
      else {
        toast[newActive ? "warning" : "success"](`"${org.name}" ${newActive ? "suspendida" : "reactivada"}`);
        onAction();
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const { error } = await supabase.from("organizations").delete().eq("id", org.id);
      if (error) toast.error(error.message);
      else { toast.success(`"${org.name}" eliminada`); onAction(); }
    });
  };

  // eslint-disable-next-line react-compiler/react-compiler
  const isExpired = org.subscription_end && new Date(org.subscription_end).getTime() < Date.now();
  // eslint-disable-next-line react-compiler/react-compiler
  const daysLeft = org.subscription_end
    ? Math.ceil((new Date(org.subscription_end).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <>
      {/* ── Card ── */}
      <div className={cn(
        "rounded-2xl border transition-all duration-200",
        status === "pending"   ? "border-amber-500/25 bg-amber-500/3" :
        status === "suspended" ? "border-red-500/20 bg-red-500/3"    :
        "border-border/50 bg-card/40"
      )}>
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Avatar */}
          <div className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
            status === "pending"   ? "bg-amber-500/15 text-amber-400" :
            status === "suspended" ? "bg-red-500/15 text-red-400"     :
            "bg-primary/15 text-primary"
          )}>
            {org.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{org.name}</p>
              <StatusBadge org={org} />
              <PlanBadge plan={(org.plan_type as PlanType) ?? "free"} />
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
              {org.owner_name && <span>{org.owner_name}</span>}
              {org.tax_id_number && <span className="font-mono">{org.tax_id_name}: {org.tax_id_number}</span>}
              <span className="font-mono opacity-60">{org.currency_code}</span>
              {daysLeft !== null && (
                <span className={cn(
                  "flex items-center gap-0.5",
                  isExpired ? "text-red-400" : daysLeft < 7 ? "text-amber-400" : "text-muted-foreground"
                )}>
                  <FaIcon icon={faCalendarDays} size={10} />
                  {isExpired ? "Vencida" : `${daysLeft}d restantes`}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Pending actions */}
            {status === "pending" && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={handleReject}
                  disabled={isPending}
                  title="Rechazar"
                >
                  <FaIcon icon={faCircleXmark} size={14} />
                </Button>
                <Button
                  size="icon"
                  className="size-8 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleApprove}
                  disabled={isPending}
                  title="Aprobar"
                >
                  {isPending ? <FaIcon icon={faSpinner} size={13} className="animate-spin" /> : <FaIcon icon={faCircleCheck} size={14} />}
                </Button>
              </>
            )}

            {/* Active/Suspended actions */}
            {status !== "pending" && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-violet-400 hover:bg-violet-500/10"
                  onClick={() => setSubOpen(true)}
                  title="Gestionar suscripción"
                >
                  <FaIcon icon={faCreditCard} size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "size-8",
                    status === "suspended"
                      ? "text-emerald-400 hover:bg-emerald-500/10"
                      : "text-amber-400 hover:bg-amber-500/10"
                  )}
                  onClick={handleSuspend}
                  disabled={isPending}
                  title={status === "suspended" ? "Reactivar" : "Suspender"}
                >
                  {isPending ? <FaIcon icon={faSpinner} size={13} className="animate-spin" /> : <FaIcon icon={faShieldHalved} size={14} />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-red-400 hover:bg-red-500/10"
                  onClick={() => setDeleteOpen(true)}
                  title="Eliminar organización"
                >
                  <FaIcon icon={faTrash} size={14} />
                </Button>
              </>
            )}

            {/* Expand toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {expanded ? <FaIcon icon={faChevronUp} size={12} /> : <FaIcon icon={faChevronDown} size={12} />}
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-border/30 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            {org.address && (
              <span className="flex items-center gap-1.5">
                <FaIcon icon={faLocationDot} size={10} className="shrink-0" /> {org.address}
              </span>
            )}
            {org.phone && (
              <span className="flex items-center gap-1.5">
                <FaIcon icon={faPhone} size={10} className="shrink-0" /> {org.phone}
              </span>
            )}
            {org.website && (
              <span className="flex items-center gap-1.5">
                <FaIcon icon={faGlobe} size={10} className="shrink-0" />
                <a href={org.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                  {org.website}
                </a>
              </span>
            )}
            <span className="flex items-center gap-1.5 font-mono text-[10px] opacity-60 sm:col-span-2">
              ID: {org.id}
            </span>
            <span className="flex items-center gap-1.5">
              <FaIcon icon={faCalendarDays} size={10} className="shrink-0" />
              Registrada: {format(new Date(org.created_at!), "d MMM yyyy", { locale: es })}
            </span>
            {org.subscription_end && (
              <span className={cn(
                "flex items-center gap-1.5",
                isExpired ? "text-red-400" : ""
              )}>
                <FaIcon icon={faCreditCard} size={10} className="shrink-0" />
                Vence: {format(new Date(org.subscription_end), "d MMM yyyy", { locale: es })}
                {isExpired && " ⚠️ Vencida"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subscription dialog */}
      <SubscriptionDialog
        org={org}
        open={subOpen}
        onOpenChange={setSubOpen}
        onSave={onAction}
      />

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar organización?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente <strong>{org.name}</strong> y todos sus datos.
              Esta operación no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────

interface SuperadminOrgsClientProps {
  initialOrgs: Organization[];
}

export function SuperadminOrgsClient({ initialOrgs }: SuperadminOrgsClientProps) {
  const supabase = createClient();
  const [orgs,        setOrgs]        = useState<Organization[]>(initialOrgs);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search,      setSearch]      = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "active" | "suspended">("all");

  const refresh = async () => {
    setIsRefreshing(true);
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .order("is_approved", { ascending: true })
      .order("created_at", { ascending: false });
    if (data) setOrgs(data);
    setIsRefreshing(false);
  };

  // Filter/search
  const filtered = orgs.filter((o) => {
    const matchStatus =
      filterStatus === "all" ? true :
      filterStatus === "pending"   ? !o.is_approved :
      filterStatus === "suspended" ? o.is_active === false && o.is_approved :
      o.is_approved && o.is_active !== false;

    if (!matchStatus) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.owner_name ?? "").toLowerCase().includes(q) ||
      (o.tax_id_number ?? "").toLowerCase().includes(q)
    );
  });

  const counts = {
    all:       orgs.length,
    pending:   orgs.filter((o) => !o.is_approved).length,
    active:    orgs.filter((o) => o.is_approved && o.is_active !== false).length,
    suspended: orgs.filter((o) => o.is_active === false && o.is_approved).length,
  };

  const TABS: Array<{ key: typeof filterStatus; label: string }> = [
    { key: "all",       label: `Todas (${counts.all})` },
    { key: "pending",   label: `Pendientes (${counts.pending})` },
    { key: "active",    label: `Activas (${counts.active})` },
    { key: "suspended", label: `Suspendidas (${counts.suspended})` },
  ];

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <FaIcon icon={faMagnifyingGlass} size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Buscar empresa, dueño, RUC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8 shrink-0"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <FaIcon icon={faRotate} size={12} className={isRefreshing ? "animate-spin" : ""} />
          Actualizar
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              filterStatus === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground rounded-2xl border border-dashed border-border">
          <FaIcon icon={faBuilding} size={28} className="opacity-30" />
          <p className="text-sm">
            {search ? "Sin resultados para tu búsqueda" : "No hay organizaciones en esta categoría"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((org) => (
            <OrgCard key={org.id} org={org} onAction={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

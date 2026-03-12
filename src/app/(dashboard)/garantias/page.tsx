"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck, ShieldX, ShieldAlert, Search, Clock,
  TicketCheck, ArrowLeft, Ghost, AlertTriangle,
  ChevronRight, RefreshCw, Ban, History, Smartphone,
  Phone, User, CheckCircle2, XCircle, Info,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  useGarantias, useGarantiasStats, useVoidGuarantee, useReactivateGuarantee,
  useClaimWarranty, useGarantiaByImei,
  type GarantiaExtended,
} from "@/hooks/useGarantias";
import { GuaranteePaymentsPanel } from "@/components/ui-custom/GuaranteePaymentsPanel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysLabel(days: number): string {
  if (days === 0) return "Vence hoy";
  if (days > 0)  return `${days} dia${days !== 1 ? "s" : ""} restante${days !== 1 ? "s" : ""}`;
  return `Vencida hace ${Math.abs(days)} dia${Math.abs(days) !== 1 ? "s" : ""}`;
}

function deviceLabel(g: GarantiaExtended): string {
  const d = g.ticket?.device_details as Record<string, unknown> | undefined;
  if (d) return [d.brand, d.model].filter(Boolean).join(" ") || "Dispositivo";
  const s = g.servicio;
  if (s) return [s.device_brand, s.device_model].filter(Boolean).join(" ") || (s.tags ?? []).join(", ") || "Servicio";
  return "—";
}

function clientName(g: GarantiaExtended): string {
  if (g.ticket?.customers?.full_name) return g.ticket.customers.full_name;
  if (g.ticket?.guest_name)           return g.ticket.guest_name;
  if (g.servicio?.customers?.full_name) return g.servicio.customers.full_name;
  if (g.servicio?.guest_name)         return g.servicio.guest_name;
  return "Sin registro";
}

function clientPhone(g: GarantiaExtended): string | null {
  return g.ticket?.customers?.phone ?? g.servicio?.customers?.phone ?? null;
}

function imeiLabel(g: GarantiaExtended): string | null {
  const d = g.ticket?.device_details as Record<string, unknown> | undefined;
  if (d?.imei) return String(d.imei);
  if (g.servicio?.imei) return g.servicio.imei;
  return null;
}

// ── Status badge de garantia ──────────────────────────────────────────────────

function GarantiaBadge({ g }: { g: GarantiaExtended }) {
  if (!g.is_active) return (
    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border gap-1">
      <Ban className="size-2.5" /> Anulada
    </Badge>
  );
  if (g.days_remaining < 0) return (
    <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30 gap-1">
      <XCircle className="size-2.5" /> Vencida
    </Badge>
  );
  if (g.days_remaining <= 7) return (
    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1">
      <AlertTriangle className="size-2.5" /> Por vencer
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1">
      <CheckCircle2 className="size-2.5" /> Vigente
    </Badge>
  );
}

// ── Stat Cards ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, colorClass, loading }: {
  label: string; value: number; icon: React.ElementType;
  colorClass: string; loading: boolean;
}) {
  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`flex size-8 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-16" /> : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Card de garantia individual ───────────────────────────────────────────────

function GarantiaCard({
  g, onClaim, onVoid, onReactivate, isAdmin,
}: {
  g: GarantiaExtended;
  onClaim: (g: GarantiaExtended) => void;
  onVoid: (g: GarantiaExtended) => void;
  onReactivate: (id: string) => void;
  isAdmin: boolean;
}) {
  const device  = deviceLabel(g);
  const client  = clientName(g);
  const phone   = clientPhone(g);
  const imei    = imeiLabel(g);
  const [showPayments, setShowPayments] = useState(false);
  const linkHref = g.source === "ticket" && g.ticket_id
    ? `/tickets/${g.ticket_id}`
    : null;

  return (
    <Card className={`border-border/50 bg-card/60 backdrop-blur transition-all hover:border-border ${
      !g.is_active ? "opacity-60" : ""
    }`}>
      <CardContent className="pt-4 pb-3 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${
              g.source === "ticket"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-violet-500/20 text-violet-400"
            }`}>
              {g.source === "ticket"
                ? <TicketCheck className="size-4" />
                : <Ghost className="size-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{device}</p>
              <p className="text-xs text-muted-foreground truncate">{client}</p>
            </div>
          </div>
          <GarantiaBadge g={g} />
        </div>

        {/* Info row */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {imei && (
            <span className="flex items-center gap-1 col-span-2 font-mono text-foreground/70">
              <Smartphone className="size-3 shrink-0" /> {imei}
            </span>
          )}
          {phone && (
            <span className="flex items-center gap-1">
              <Phone className="size-3 shrink-0" /> {phone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="size-3 shrink-0" />
            {format(parseISO(g.end_date), "dd MMM yyyy", { locale: es })}
          </span>
          {g.claim_count > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <History className="size-3 shrink-0" /> {g.claim_count} reclamo{g.claim_count !== 1 ? "s" : ""}
            </span>
          )}
          <span className={`flex items-center gap-1 font-medium ${
            !g.is_active ? "text-muted-foreground" :
            g.days_remaining < 0 ? "text-red-400" :
            g.days_remaining <= 7 ? "text-amber-400" : "text-emerald-400"
          }`}>
            <ShieldCheck className="size-3 shrink-0" />
            {daysLabel(g.days_remaining)}
          </span>
        </div>

        {/* Voided info */}
        {!g.is_active && g.voided_reason && (
          <div className="bg-muted/40 rounded px-2 py-1.5 text-xs text-muted-foreground">
            <span className="font-medium">Motivo:</span> {g.voided_reason}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {linkHref && (
            <Link href={linkHref}>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <TicketCheck className="size-3" /> Ver ticket
                <ChevronRight className="size-3" />
              </Button>
            </Link>
          )}
          {g.is_valid && (
            <Button
              size="sm" variant="default"
              className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => onClaim(g)}
            >
              <ShieldAlert className="size-3" /> Reclamar garantia
            </Button>
          )}
          {isAdmin && g.is_active && (
            <Button
              size="sm" variant="ghost"
              className="h-7 text-xs gap-1 hover:text-destructive"
              onClick={() => onVoid(g)}
            >
              <Ban className="size-3" /> Anular
            </Button>
          )}
          {isAdmin && !g.is_active && (
            <Button
              size="sm" variant="ghost"
              className="h-7 text-xs gap-1 hover:text-emerald-400"
              onClick={() => onReactivate(g.id)}
            >
              <RefreshCw className="size-3" /> Reactivar
            </Button>
          )}
          {/* Toggle cobros */}
          {g.is_active && (
            <Button
              size="sm" variant="ghost"
              className={`h-7 text-xs gap-1 ml-auto ${
                showPayments ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => setShowPayments(v => !v)}
            >
              <User className="size-3" />
              {showPayments ? "Ocultar cobros" : "Ver cobros"}
            </Button>
          )}
        </div>

        {/* Payments panel — expandible */}
        {showPayments && g.is_active && (
          <div className="pt-2 border-t border-border/40 mt-1">
            <GuaranteePaymentsPanel
              guaranteeId={g.id}
              isAdmin={isAdmin}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── IMEI Search Panel ─────────────────────────────────────────────────────────

function ImeiSearchPanel({ onSelect }: { onSelect: (g: GarantiaExtended) => void }) {
  const [imei, setImei] = useState("");
  const [query, setQuery] = useState("");
  const { data: results = [], isLoading } = useGarantiaByImei(query);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Ingresa el IMEI del dispositivo..."
          value={imei}
          onChange={e => setImei(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") setQuery(imei.trim()); }}
          className="h-9 font-mono text-sm"
        />
        <Button size="sm" variant="outline" onClick={() => setQuery(imei.trim())}
          className="h-9 px-3 gap-1">
          <Search className="size-3.5" /> Buscar
        </Button>
      </div>
      {isLoading && <Skeleton className="h-16 w-full" />}
      {!isLoading && query && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Sin garantias encontradas para IMEI {query}
        </p>
      )}
      {results.map(g => (
        <div key={g.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 bg-card/40">
          <div>
            <p className="text-sm font-medium">{deviceLabel(g)}</p>
            <p className="text-xs text-muted-foreground">{clientName(g)}</p>
            <p className={`text-xs font-medium mt-0.5 ${g.is_valid ? "text-emerald-400" : "text-red-400"}`}>
              {daysLabel(g.days_remaining)}
            </p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <GarantiaBadge g={g} />
            {g.is_valid && (
              <Button size="sm" className="h-6 text-[11px] bg-blue-600 hover:bg-blue-700 gap-1"
                onClick={() => onSelect(g)}>
                <ShieldAlert className="size-3" /> Reclamar
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Claim Dialog ──────────────────────────────────────────────────────────────

function ClaimDialog({
  open, onOpenChange, garantia,
}: { open: boolean; onOpenChange: (v: boolean) => void; garantia: GarantiaExtended | null }) {
  const [issue, setIssue] = useState("");
  const { userId } = useOrganization();
  const { org }    = useOrganization();
  const claimMut   = useClaimWarranty();

  const handleClaim = async () => {
    if (!garantia || !issue.trim() || !org) return;
    if (!garantia.ticket_id) {
      // Otros servicios — no creamos ticket, solo registramos reclamo
      return;
    }
    await claimMut.mutateAsync({
      parentTicketId: garantia.ticket_id,
      orgId:          org.id,
      guaranteeId:    garantia.id,
      reportedIssue:  issue.trim(),
      assignedTo:     userId ?? null,
    });
    setIssue("");
    onOpenChange(false);
  };

  if (!garantia) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-blue-400" />
            Reclamar Garantia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Info del equipo */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-sm font-semibold">{deviceLabel(garantia)}</p>
            <p className="text-xs text-muted-foreground">{clientName(garantia)}</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="size-3" /> {daysLabel(garantia.days_remaining)}
            </p>
          </div>

          {/* Info importante */}
          <div className="flex gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <p>Se creara un nuevo ticket de reparacion vinculado a este, sin cargo al cliente. Los repuestos usados se registran como gasto interno.</p>
          </div>

          {/* Motivo del reclamo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Motivo del reclamo <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="Describe el problema que reporta el cliente..."
              value={issue}
              onChange={e => setIssue(e.target.value)}
              className="min-h-[80px] text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 gap-2"
            disabled={!issue.trim() || claimMut.isPending}
            onClick={handleClaim}
          >
            <TicketCheck className="size-4" />
            {claimMut.isPending ? "Creando..." : "Crear ticket de garantia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Void Dialog ───────────────────────────────────────────────────────────────

function VoidDialog({
  open, onOpenChange, garantia,
}: { open: boolean; onOpenChange: (v: boolean) => void; garantia: GarantiaExtended | null }) {
  const [reason, setReason] = useState("");
  const { userId } = useOrganization();
  const voidMut = useVoidGuarantee();

  const VOID_REASONS = [
    "Daño externo (golpe, caida)",
    "Daño por agua o humedad",
    "Manipulacion por terceros",
    "Garantia vencida",
    "Incumplimiento de condiciones",
    "Otro",
  ];

  const handleVoid = async () => {
    if (!garantia || !reason.trim() || !userId) return;
    await voidMut.mutateAsync({ id: garantia.id, reason, userId });
    setReason("");
    onOpenChange(false);
  };

  if (!garantia) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Ban className="size-4 text-destructive" /> Anular Garantia
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta accion marca la garantia de <strong>{deviceLabel(garantia)}</strong> como anulada. El motivo quedara registrado.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {VOID_REASONS.map(r => (
              <button key={r} type="button"
                onClick={() => setReason(r)}
                className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                  reason === r
                    ? "bg-destructive/20 border-destructive text-destructive"
                    : "border-border text-muted-foreground hover:border-destructive/50"
                }`}>
                {r}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Agrega detalles adicionales (opcional)..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            disabled={!reason.trim() || voidMut.isPending}
            onClick={handleVoid}
          >
            {voidMut.isPending ? "Anulando..." : "Confirmar anulacion"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type FilterTab = "active" | "expired" | "voided" | "all";

export default function GarantiasPage() {
  const { role, userId } = useOrganization();
  const isAdmin = role === "admin" || role === "superadmin";

  const [tab,        setTab]        = useState<FilterTab>("active");
  const [search,     setSearch]     = useState("");
  const [imeiMode,   setImeiMode]   = useState(false);
  const [claimG,     setClaimG]     = useState<GarantiaExtended | null>(null);
  const [voidG,      setVoidG]      = useState<GarantiaExtended | null>(null);

  const { data: garantias = [], isLoading } = useGarantias(tab);
  const { data: stats,        isLoading: loadingStats } = useGarantiasStats();
  const reactivateMut = useReactivateGuarantee();

  const filtered = useMemo(() => {
    if (!search.trim()) return garantias;
    const q = search.toLowerCase();
    return garantias.filter(g => {
      const dev    = deviceLabel(g).toLowerCase();
      const client = clientName(g).toLowerCase();
      const imei   = (imeiLabel(g) ?? "").toLowerCase();
      return dev.includes(q) || client.includes(q) || imei.includes(q);
    });
  }, [garantias, search]);

  const TAB_CONFIG: { value: FilterTab; label: string; icon: React.ElementType }[] = [
    { value: "active",  label: "Vigentes",  icon: ShieldCheck },
    { value: "expired", label: "Vencidas",  icon: ShieldX },
    { value: "voided",  label: "Anuladas",  icon: Ban },
    { value: "all",     label: "Todas",     icon: History },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-400" /> Garantias
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion de garantias de reparaciones y servicios
          </p>
        </div>
        <Button
          variant={imeiMode ? "default" : "outline"}
          size="sm" className="gap-1.5"
          onClick={() => setImeiMode(v => !v)}
        >
          <Search className="size-3.5" />
          {imeiMode ? "Cerrar busqueda IMEI" : "Buscar por IMEI"}
        </Button>
      </div>

      {/* ── IMEI Search Panel ── */}
      {imeiMode && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Smartphone className="size-4 text-blue-400" />
              Verificacion de garantia por IMEI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImeiSearchPanel onSelect={g => { setClaimG(g); setImeiMode(false); }} />
          </CardContent>
        </Card>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Vigentes"    value={stats?.vigentes  ?? 0} icon={ShieldCheck}  colorClass="bg-emerald-500/20 text-emerald-400" loading={loadingStats} />
        <StatCard label="Por vencer"  value={stats?.porVencer ?? 0} icon={AlertTriangle} colorClass="bg-amber-500/20 text-amber-400"   loading={loadingStats} />
        <StatCard label="Vencidas"    value={stats?.vencidas  ?? 0} icon={ShieldX}       colorClass="bg-red-500/20 text-red-400"       loading={loadingStats} />
        <StatCard label="Anuladas"    value={stats?.anuladas  ?? 0} icon={Ban}           colorClass="bg-muted text-muted-foreground"   loading={loadingStats} />
        <StatCard label="Total"       value={stats?.total     ?? 0} icon={History}       colorClass="bg-blue-500/20 text-blue-400"     loading={loadingStats} />
        <StatCard label="Reclamos"    value={stats?.reclamos  ?? 0} icon={ShieldAlert}   colorClass="bg-violet-500/20 text-violet-400" loading={loadingStats} />
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex flex-wrap gap-2">
        {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => setTab(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              tab === value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}>
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por dispositivo, cliente, IMEI..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ── Garantias grid ── */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <ShieldCheck className="size-12 opacity-20" />
          <p className="text-sm">
            {search ? `Sin resultados para "${search}"` : "Sin garantias en esta categoria"}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(g => (
            <GarantiaCard
              key={g.id}
              g={g}
              isAdmin={isAdmin}
              onClaim={setClaimG}
              onVoid={setVoidG}
              onReactivate={(id) => reactivateMut.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      <ClaimDialog
        open={!!claimG}
        onOpenChange={v => { if (!v) setClaimG(null); }}
        garantia={claimG}
      />
      <VoidDialog
        open={!!voidG}
        onOpenChange={v => { if (!v) setVoidG(null); }}
        garantia={voidG}
      />
    </div>
  );
}

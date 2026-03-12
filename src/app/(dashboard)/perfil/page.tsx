"use client";

import React, { useState } from "react";
import {
  User, UserPlus, Shield, Wrench, Phone, Mail, Calendar,
  Ticket, Store, TrendingUp, Clock, CheckCircle2, MoreVertical,
  Eye, EyeOff, Loader2, ChevronRight, X, UserX, Edit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TicketStatusBadge } from "@/components/ui-custom/TicketStatusBadge";
import type { TicketStatus } from "@/types/domain";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  useTechnicians, useCreateTechnician, useDeactivateTechnician,
  useTechnicianStats, type TechnicianRow,
} from "@/hooks/useTechnicians";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { DeviceDetails } from "@/types/domain";

// ── Mini stat card ────────────────────────────────────────────────────────────

function MiniStat({
  label, value, icon: Icon, color,
}: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${color}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <Icon className="size-4 opacity-60" />
      </div>
      <p className="text-2xl font-bold font-mono">{value}</p>
    </div>
  );
}

// ── Create Technician Dialog ──────────────────────────────────────────────────

function CreateTechDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createTech = useCreateTechnician();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "" });
  const [showPwd, setShowPwd] = useState(false);

  const field = (key: keyof typeof form) => ({
    value:    form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTech.mutateAsync({
      email:     form.email.trim(),
      password:  form.password,
      full_name: form.full_name.trim(),
      phone:     form.phone.trim() || undefined,
    });
    setForm({ email: "", password: "", full_name: "", phone: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" /> Crear Técnico
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-1">
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 px-4 py-3 text-xs text-blue-400/80 space-y-1">
            <p className="font-semibold">Permisos del técnico:</p>
            <ul className="space-y-0.5 list-inside">
              {[
                "✅ Crear y editar clientes",
                "✅ Crear y gestionar tickets propios",
                "✅ Ver inventario (sin modificar)",
                "✅ Realizar ventas POS",
                "✅ Ver su propio dashboard",
                "❌ Ver reportes financieros",
                "❌ Agregar/quitar inventario",
                "❌ Ver datos de otros técnicos",
              ].map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre completo</Label>
              <Input placeholder="Juan Pérez" required {...field("full_name")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="juan@taller.com" required {...field("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input placeholder="+51 999 999" {...field("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña</Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                  {...field("password")}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createTech.isPending} className="gap-2">
              {createTech.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {createTech.isPending ? "Creando…" : "Crear técnico"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Technician Card ───────────────────────────────────────────────────────────

function TechCard({ tech, onViewStats }: { tech: TechnicianRow; onViewStats: (t: TechnicianRow) => void }) {
  const deactivate = useDeactivateTechnician();
  const initials   = (tech.full_name ?? "?")
    .split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 hover:bg-card transition-colors">
      {/* Avatar */}
      <div className="size-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{tech.full_name ?? "Sin nombre"}</p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <Mail className="size-3 shrink-0" /> {tech.email ?? "—"}
        </p>
        {tech.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="size-3 shrink-0" /> {tech.phone}
          </p>
        )}
      </div>

      {/* Badge + actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
          <Wrench className="size-2.5 mr-1" /> Técnico
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewStats(tech)}>
              <TrendingUp className="size-4 mr-2" /> Ver estadísticas
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => deactivate.mutate(tech.id)}
            >
              <UserX className="size-4 mr-2" /> Desactivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Technician Stats Dialog ───────────────────────────────────────────────────

function TechStatsDialog({ tech, open, onClose }: {
  tech: TechnicianRow | null; open: boolean; onClose: () => void;
}) {
  const { formatCurrency } = useOrganization();
  const { data: stats, isLoading } = useTechnicianStats(tech?.id ?? null);
  const fmt = formatCurrency;

  if (!tech) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            Estadísticas — {tech.full_name ?? tech.email}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Tickets activos"     value={stats?.activeTickets  ?? 0} icon={Clock}       color="border-blue-500/30   bg-blue-500/5   text-blue-400"    />
              <MiniStat label="Entregados este mes" value={stats?.deliveredMonth ?? 0} icon={CheckCircle2} color="border-emerald-500/30 bg-emerald-500/5 text-emerald-400" />
              <MiniStat label="Ingresos (tickets)"  value={fmt(stats?.monthRevenue ?? 0)} icon={Ticket}  color="border-amber-500/30  bg-amber-500/5  text-amber-400"   />
              <MiniStat label="Ingresos (POS)"      value={fmt(stats?.posRevenue  ?? 0)} icon={Store}    color="border-violet-500/30 bg-violet-500/5 text-violet-400"  />
            </div>

            {/* Recent tickets */}
            {(stats?.recentTickets?.length ?? 0) > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Tickets recientes
                  </p>
                  <div className="space-y-2">
                    {stats!.recentTickets.map((t) => {
                      const d = (t.device_details ?? {}) as DeviceDetails;
                      return (
                        <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">
                              {(t.customers as { full_name: string } | null)?.full_name ?? "Sin cliente"}
                            </p>
                            <p className="text-xs text-muted-foreground">{d.brand} {d.model}</p>
                          </div>
                          <TicketStatusBadge status={t.status as TicketStatus} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Admin View ────────────────────────────────────────────────────────────────

function AdminView() {
  const { fullName, email, role } = useOrganization();
  const { data: techs = [], isLoading } = useTechnicians();
  const [createOpen, setCreateOpen] = useState(false);
  const [statsFor,   setStatsFor]   = useState<TechnicianRow | null>(null);

  return (
    <div className="space-y-6">

      {/* Profile Card */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/60">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center shrink-0 text-2xl font-bold text-primary">
              {(fullName ?? email ?? "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl font-bold">{fullName ?? "Sin nombre"}</p>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                  <Shield className="size-3 mr-1" />
                  {role === "superadmin" ? "Super Admin" : "Admin"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="size-3.5" /> {email}
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="rounded-lg bg-muted/30 px-3 py-2">
              <p className="font-medium text-foreground mb-1">Próximamente</p>
              <p>📊 Descargar reportes por rango de fechas</p>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2">
              <p className="font-medium text-foreground mb-1">Tu equipo</p>
              <p>{techs.length} técnico{techs.length !== 1 ? "s" : ""} activo{techs.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technicians Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Wrench className="size-4 text-primary" /> Técnicos
            </h2>
            <p className="text-xs text-muted-foreground">
              Gestiona el equipo de tu taller
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
            <UserPlus className="size-4" /> Agregar técnico
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : techs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-xl border border-dashed border-border text-muted-foreground">
            <User className="size-10 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">Sin técnicos aún</p>
              <p className="text-xs">Agrega tu primer técnico para asignarle tickets y ventas.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-2">
              <UserPlus className="size-4" /> Crear técnico
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {techs.map((t) => (
              <TechCard key={t.id} tech={t} onViewStats={setStatsFor} />
            ))}
          </div>
        )}
      </div>

      <CreateTechDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <TechStatsDialog tech={statsFor} open={!!statsFor} onClose={() => setStatsFor(null)} />
    </div>
  );
}

// ── Technician View ───────────────────────────────────────────────────────────

function TechnicianView() {
  const { userId, fullName, email, formatCurrency } = useOrganization();
  const { data: stats, isLoading }                  = useTechnicianStats(userId);
  const fmt = formatCurrency;

  return (
    <div className="space-y-6">

      {/* Profile Card */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/60">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 flex items-center justify-center shrink-0 text-2xl font-bold text-blue-400">
              {(fullName ?? email ?? "T").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl font-bold">{fullName ?? "Sin nombre"}</p>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                  <Wrench className="size-3 mr-1" /> Técnico
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="size-3.5" /> {email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div>
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" /> Mi desempeño este mes
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Tickets activos"     value={stats?.activeTickets  ?? 0}        icon={Clock}       color="border-blue-500/30   bg-blue-500/5   text-blue-400"    />
            <MiniStat label="Entregados este mes" value={stats?.deliveredMonth ?? 0}        icon={CheckCircle2} color="border-emerald-500/30 bg-emerald-500/5 text-emerald-400" />
            <MiniStat label="Ingresos reparaciones" value={fmt(stats?.monthRevenue ?? 0)}  icon={Ticket}      color="border-amber-500/30  bg-amber-500/5  text-amber-400"   />
            <MiniStat label="Ingresos ventas POS" value={fmt(stats?.posRevenue  ?? 0)}     icon={Store}       color="border-violet-500/30 bg-violet-500/5 text-violet-400"  />
          </div>
        )}
      </div>

      {/* Recent tickets */}
      <div>
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Ticket className="size-4 text-muted-foreground" /> Mis tickets recientes
        </h2>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : (stats?.recentTickets?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-xl border border-dashed border-border text-muted-foreground">
            <Ticket className="size-8 opacity-20" />
            <p className="text-sm">No tienes tickets asignados aún</p>
          </div>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="space-y-2 pr-1">
              {stats!.recentTickets.map((t) => {
                const d = (t.device_details ?? {}) as DeviceDetails;
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-card/60 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0">
                        <Clock className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {(t.customers as { full_name: string } | null)?.full_name ?? "Sin cliente"}
                        </p>
                        <p className="text-xs text-muted-foreground">{d.brand} {d.model}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TicketStatusBadge status={t.status as TicketStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Recent POS Sales */}
      <div>
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Store className="size-4 text-muted-foreground" /> Mis ventas POS (este mes)
        </h2>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : (stats?.recentSales?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-xl border border-dashed border-border text-muted-foreground">
            <Store className="size-8 opacity-20" />
            <p className="text-sm">Sin ventas POS este mes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats!.recentSales.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-card/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 shrink-0">
                    <Store className="size-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.customer_name ?? "Venta directa"}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {s.payment_method} · {formatDistanceToNow(new Date(s.created_at), { locale: es, addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  + {fmt(s.total_amount)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { role, isLoading } = useOrganization();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <User className="size-5 text-primary" /> Mi Perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Administra tu cuenta y tu equipo" : "Tu cuenta y estadísticas personales"}
        </p>
      </div>

      {isAdmin ? <AdminView /> : <TechnicianView />}
    </div>
  );
}

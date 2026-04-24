"use client";

import React, { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  faHandHoldingDollar, faCircleCheck, faMagnifyingGlass, faUser,
  faBellConcierge, faClockRotateLeft, faCheckDouble,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/contexts/OrganizationContext";
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import { useFiados, usePayFiado, useFiadoHistory, type FiadoRow, type FiadoPagadoRow } from "@/hooks/useFiados";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useAssignCollectionTask } from "@/hooks/useCollectionTasks";

const PAYMENT_METHODS = [
  { value: "efectivo",      label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta",       label: "Tarjeta (POS)" },
];

function SourceBadge({ source }: { source: FiadoRow["source"] }) {
  if (source === "pos") return (
    <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/10 text-[10px]">POS</Badge>
  );
  if (source === "servicio") return (
    <Badge variant="outline" className="text-violet-500 border-violet-500/20 bg-violet-500/10 text-[10px]">SERVICIO</Badge>
  );
  return (
    <Badge variant="outline" className="text-purple-500 border-purple-500/20 bg-purple-500/10 text-[10px]">TICKET</Badge>
  );
}

function methodLabel(m: string | null) {
  if (!m) return "—";
  const map: Record<string, string> = {
    efectivo:      "Efectivo",
    transferencia: "Transferencia",
    tarjeta:       "Tarjeta",
  };
  return map[m] ?? m;
}

export default function FiadosPage() {
  const { data: fiados = [], isLoading }           = useFiados();
  const { data: historial = [], isLoading: isHist } = useFiadoHistory(50);
  const { formatCurrency, org } = useOrganization();
  const payMutation    = usePayFiado();
  const assignMutation = useAssignCollectionTask();
  const { data: technicians = [] } = useTechnicians();

  const [search,        setSearch]        = useState("");
  const [payTarget,     setPayTarget]     = useState<FiadoRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [assignTarget,    setAssignTarget]    = useState<FiadoRow | null>(null);
  const [assignedTechId,  setAssignedTechId]  = useState("");

  const totalPorCobrar = fiados.reduce((acc, f) => acc + f.amount, 0);

  const filtered = fiados.filter(f =>
    f.description?.toLowerCase().includes(search.toLowerCase()) ||
    f.detail?.toLowerCase().includes(search.toLowerCase())
  );

  const handlePay = () => {
    if (!payTarget) return;
    payMutation.mutate({ id: payTarget.id, source: payTarget.source, payment_method: paymentMethod }, {
      onSuccess: () => setPayTarget(null),
    });
  };

  const handleAssign = () => {
    if (!assignTarget || !assignedTechId || !org?.id) return;
    const tech = technicians.find((t) => t.id === assignedTechId);
    assignMutation.mutate({
      organizationId: org.id,
      fiado:          assignTarget,
      assignedToId:   assignedTechId,
      assignedToName: tech?.full_name ?? "",
    }, {
      onSuccess: () => { setAssignTarget(null); setAssignedTechId(""); },
    });
  };

  // ── Pending columns ────────────────────────────────────────────────────────

  const columns: DataColumn<FiadoRow>[] = [
    {
      key: "id",
      header: "Descripción",
      primary: true,
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SourceBadge source={row.source} />
            <span className="font-medium text-sm text-foreground truncate max-w-[150px] sm:max-w-none">
              {row.detail}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            #{row.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      key: "customer_name",
      header: "Cliente Deudor",
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm">
          <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
            <FaIcon icon={faUser} size={13} className="text-muted-foreground" />
          </div>
          <span className="truncate">{row.description || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Fiado hace",
      className: "hidden md:table-cell",
      showOnMobile: false,
      cell: (row) => {
        const days = differenceInDays(new Date(), new Date(row.created_at));
        const agingColor =
          days <= 3  ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" :
          days <= 7  ? "text-amber-400 bg-amber-400/10 border-amber-400/20" :
                       "text-red-400 bg-red-400/10 border-red-400/20";
        return (
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border w-fit ${agingColor}`}>
              {days === 0 ? "Hoy" : days === 1 ? "Ayer" : `${days} días`}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(row.created_at), "dd MMM, HH:mm", { locale: es })}
            </span>
          </div>
        );
      },
    },
    {
      key: "amount",
      header: "Deuda",
      cell: (row) => (
        <span className="font-mono font-semibold text-amber-500 text-sm">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  // ── History columns ────────────────────────────────────────────────────────

  const historialColumns: DataColumn<FiadoPagadoRow>[] = [
    {
      key: "id",
      header: "Descripción",
      primary: true,
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SourceBadge source={row.source} />
            <span className="font-medium text-sm text-foreground truncate max-w-[150px] sm:max-w-none">
              {row.detail}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            #{row.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Cliente",
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm">
          <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
            <FaIcon icon={faUser} size={13} className="text-muted-foreground" />
          </div>
          <span className="truncate">{row.description || "—"}</span>
        </div>
      ),
    },
    {
      key: "paid_at",
      header: "Cobrado el",
      className: "hidden md:table-cell",
      showOnMobile: false,
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-foreground font-medium">
            {format(new Date(row.paid_at), "dd MMM yyyy", { locale: es })}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(row.paid_at), "HH:mm", { locale: es })}
          </span>
        </div>
      ),
    },
    {
      key: "paid_by_name",
      header: "Cobrado por",
      className: "hidden md:table-cell",
      showOnMobile: false,
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <FaIcon icon={faUser} size={10} className="text-primary/60" />
          </div>
          <span className="text-xs text-muted-foreground">
            {row.paid_by_name ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "payment_method",
      header: "Método",
      cell: (row) => (
        <span className="text-xs border border-border/50 px-2 py-0.5 rounded-full text-muted-foreground">
          {methodLabel(row.payment_method)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Monto",
      cell: (row) => (
        <span className="font-mono font-semibold text-emerald-400 text-sm">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FaIcon icon={faHandHoldingDollar} size={18} className="text-amber-500" /> Cuentas por Cobrar
          </h1>
          <p className="text-sm text-muted-foreground">
            {fiados.length} deuda(s) activa(s)
          </p>
        </div>

        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
          <span className="text-xs font-medium text-amber-500/80 uppercase">Por Recaudar</span>
          <span className="font-mono text-xl font-bold text-amber-500">
            {formatCurrency(totalPorCobrar)}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="pendientes">
        <TabsList className="h-9">
          <TabsTrigger value="pendientes" className="gap-1.5 text-xs">
            <FaIcon icon={faHandHoldingDollar} size={12} />
            Pendientes
            {fiados.length > 0 && (
              <span className="ml-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {fiados.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-1.5 text-xs">
            <FaIcon icon={faClockRotateLeft} size={12} />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* ── Pendientes ── */}
        <TabsContent value="pendientes" className="mt-4 space-y-3">
          <div className="relative max-w-sm">
            <FaIcon icon={faMagnifyingGlass} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Buscar cliente, ticket o producto..."
              className="pl-9 h-10 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            isLoading={isLoading}
            searchKeys={[]}
            emptyMessage="No hay cuentas pendientes por cobrar."
            emptyIcon={<FaIcon icon={faCircleCheck} size={28} className="text-emerald-500/40" />}
            actions={(row) => (
              <div className="flex justify-end gap-2">
                {technicians.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => { setAssignTarget(row); setAssignedTechId(""); }}
                  >
                    <FaIcon icon={faBellConcierge} size={11} />
                    <span className="hidden sm:inline">Asignar</span>
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-none shadow-sm shadow-amber-500/20"
                  onClick={() => { setPayTarget(row); setPaymentMethod("efectivo"); }}
                >
                  Liquidar <span className="hidden sm:inline">Deuda</span>
                </Button>
              </div>
            )}
          />
        </TabsContent>

        {/* ── Historial ── */}
        <TabsContent value="historial" className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border/50">
            <FaIcon icon={faCheckDouble} size={12} className="text-emerald-400" />
            Últimos 50 cobros registrados — muestra quién cobró, cuándo y cómo pagó el cliente.
          </div>

          {isHist ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : (
            <DataTable
              data={historial}
              columns={historialColumns}
              isLoading={false}
              searchKeys={["description", "detail", "paid_by_name"]}
              searchPlaceholder="Buscar por cliente, servicio o cobrador..."
              pageSize={15}
              emptyMessage="No hay cobros registrados aún."
              emptyIcon={<FaIcon icon={faClockRotateLeft} size={28} className="text-muted-foreground/30" />}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* ── Assign Collection Dialog ── */}
      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaIcon icon={faBellConcierge} size={14} /> Asignar cobro a técnico
            </DialogTitle>
          </DialogHeader>
          {assignTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{assignTarget.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deuda:</span>
                  <span className="font-mono font-bold text-amber-500">{formatCurrency(assignTarget.amount)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Técnico que cobrará</Label>
                <Select value={assignedTechId} onValueChange={setAssignedTechId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar técnico..." />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name ?? t.email ?? t.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2 sm:justify-between">
                <Button variant="ghost" onClick={() => setAssignTarget(null)}>Cancelar</Button>
                <Button onClick={handleAssign} disabled={!assignedTechId || assignMutation.isPending}>
                  {assignMutation.isPending ? "Asignando..." : "Enviar alerta"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Pay Fiado Dialog ── */}
      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Liquidar cuenta</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium text-right line-clamp-1">{payTarget.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Detalle:</span>
                  <span className="text-xs text-right line-clamp-1">{payTarget.detail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fiado el:</span>
                  <span className="text-xs">
                    {format(new Date(payTarget.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                  </span>
                </div>
                <div className="bg-amber-500/10 text-amber-500 p-3 rounded-lg flex items-center justify-between mt-1">
                  <span className="text-sm font-medium">Deuda a cobrar</span>
                  <span className="font-mono font-bold text-lg">{formatCurrency(payTarget?.amount ?? 0)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
                  El cobro quedará registrado con tu usuario y la fecha de hoy en el historial.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">¿Cómo pagó el cliente?</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2 sm:justify-between">
                <Button variant="ghost" onClick={() => setPayTarget(null)}>Cancelar</Button>
                <Button onClick={handlePay} disabled={payMutation.isPending}>
                  {payMutation.isPending ? "Aplicando..." : "Registrar Pago"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

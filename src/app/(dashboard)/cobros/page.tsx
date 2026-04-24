"use client";

import React, { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  faHandHoldingDollar, faCircleCheck, faUser, faSpinner,
  faClockRotateLeft, faBan,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  useCollectionTasks, useCollectionTasksHistory,
  useProcessCollectionTask, type CollectionTask,
} from "@/hooks/useCollectionTasks";

const PAYMENT_METHODS = [
  { value: "efectivo",      label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta",       label: "Tarjeta (POS)" },
];

const METHOD_LABEL: Record<string, string> = {
  efectivo:      "Efectivo",
  transferencia: "Transferencia",
  tarjeta:       "Tarjeta",
};

export default function CobrosPage() {
  const { data: tasks = [],   isLoading }         = useCollectionTasks();
  const { data: history = [], isLoading: loadHist } = useCollectionTasksHistory();
  const { formatCurrency, role } = useOrganization();
  const processMutation = useProcessCollectionTask();

  const [target,        setTarget]        = useState<CollectionTask | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

  const handleProcess = () => {
    if (!target) return;
    processMutation.mutate(
      { taskId: target.id, paymentMethod },
      { onSuccess: () => setTarget(null) }
    );
  };

  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FaIcon icon={faHandHoldingDollar} size={18} className="text-amber-500" />
          {isAdmin ? "Cobros" : "Mis Cobros Asignados"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tasks.length} cobro(s) pendiente(s)
        </p>
      </div>

      <Tabs defaultValue="pendientes">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pendientes" className="flex-1 sm:flex-none gap-2">
            Pendientes
            {tasks.length > 0 && (
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {tasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex-1 sm:flex-none gap-2">
            <FaIcon icon={faClockRotateLeft} size={12} />
            Historial
            {history.length > 0 && (
              <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Pendientes ── */}
        <TabsContent value="pendientes" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <FaIcon icon={faCircleCheck} size={32} className="text-emerald-500/40" />
              <p className="text-sm">No hay cobros pendientes.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <PendingCard
                key={task.id}
                task={task}
                isAdmin={isAdmin}
                formatCurrency={formatCurrency}
                onProcess={() => { setTarget(task); setPaymentMethod("efectivo"); }}
              />
            ))
          )}
        </TabsContent>

        {/* ── Historial ── */}
        <TabsContent value="historial" className="mt-4 space-y-3">
          {loadHist ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <FaIcon icon={faBan} size={28} className="opacity-20" />
              <p className="text-sm">Sin cobros completados aún.</p>
            </div>
          ) : (
            history.map((task) => (
              <HistoryCard
                key={task.id}
                task={task}
                isAdmin={isAdmin}
                formatCurrency={formatCurrency}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* ── Process Payment Dialog ── */}
      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Registrar Cobro</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium text-right">{target.customer_name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Detalle:</span>
                  <span className="text-xs text-right line-clamp-1">{target.detail ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between bg-amber-500/10 text-amber-500 p-3 rounded-lg mt-1">
                  <span className="text-sm font-medium">Monto a cobrar</span>
                  <span className="font-mono font-bold text-lg">{formatCurrency(target.amount)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">¿Cómo pagó el cliente?</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2 sm:justify-between">
                <Button variant="ghost" onClick={() => setTarget(null)}>Cancelar</Button>
                <Button
                  onClick={handleProcess}
                  disabled={processMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {processMutation.isPending ? "Procesando..." : "Confirmar Cobro"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PendingCard({
  task, isAdmin, formatCurrency, onProcess,
}: {
  task: CollectionTask;
  isAdmin: boolean;
  formatCurrency: (n: number) => string;
  onProcess: () => void;
}) {
  const days = differenceInDays(new Date(), new Date(task.created_at));
  const agingColor =
    days <= 3  ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" :
    days <= 7  ? "text-amber-400 bg-amber-400/10 border-amber-400/20" :
                 "text-red-400 bg-red-400/10 border-red-400/20";

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="size-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
          <FaIcon icon={faUser} size={14} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{task.customer_name ?? "Cliente"}</p>
            <Badge variant="outline" className={`text-[10px] ${agingColor}`}>
              {days === 0 ? "Hoy" : days === 1 ? "Ayer" : `${days} días`}
            </Badge>
            {isAdmin && task.assignee && (
              <Badge variant="secondary" className="text-[10px]">
                → {(task.assignee as { full_name?: string | null }).full_name ?? "Técnico"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{task.detail ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Asignado el {format(new Date(task.created_at), "dd MMM, HH:mm", { locale: es })}
          </p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-2">
          <span className="font-mono font-bold text-amber-500 text-base">
            {formatCurrency(task.amount)}
          </span>
          {!isAdmin && (
            <Button
              size="sm"
              className="h-8 bg-amber-500 hover:bg-amber-600 text-white border-none text-xs"
              onClick={onProcess}
            >
              Registrar Cobro
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryCard({
  task, isAdmin, formatCurrency,
}: {
  task: CollectionTask;
  isAdmin: boolean;
  formatCurrency: (n: number) => string;
}) {
  const METHOD_LABEL: Record<string, string> = {
    efectivo: "Efectivo", transferencia: "Transferencia", tarjeta: "Tarjeta",
  };

  return (
    <Card className="border-border/50 opacity-90">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="size-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
          <FaIcon icon={faCircleCheck} size={14} className="text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{task.customer_name ?? "Cliente"}</p>
            <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
              Cobrado
            </Badge>
            {isAdmin && task.assignee && (
              <Badge variant="secondary" className="text-[10px]">
                por {(task.assignee as { full_name?: string | null }).full_name ?? "Técnico"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{task.detail ?? "—"}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {task.payment_method && (
              <span className="text-[10px] text-muted-foreground">
                {METHOD_LABEL[task.payment_method] ?? task.payment_method}
              </span>
            )}
            {task.paid_at && (
              <span className="text-[10px] text-muted-foreground">
                · {format(new Date(task.paid_at), "dd MMM yyyy, HH:mm", { locale: es })}
              </span>
            )}
          </div>
        </div>
        <span className="font-mono font-bold text-emerald-400 text-base shrink-0">
          {formatCurrency(task.amount)}
        </span>
      </CardContent>
    </Card>
  );
}

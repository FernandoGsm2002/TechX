"use client";

/**
 * GuaranteePaymentsPanel
 * Panel para registrar cobros en una garantía.
 * Se muestra dentro de la card de detalle de garantía.
 * Permite: ver historial de cobros, agregar nuevo cobro, eliminar cobro.
 */

import React, { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  faDollarSign, faPlus, faTrash, faSpinner, faReceipt, faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  useGuaranteePayments,
  useCreateGuaranteePayment,
  useDeleteGuaranteePayment,
  CONCEPT_LABELS,
  METHOD_LABELS,
  type PaymentConcept,
  type PaymentMethod,
} from "@/hooks/useGuaranteePayments";
import { useOrganization } from "@/contexts/OrganizationContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const CONCEPTS = Object.entries(CONCEPT_LABELS) as [PaymentConcept, string][];
const METHODS  = Object.entries(METHOD_LABELS)  as [PaymentMethod, string][];

// ── Add Payment Dialog ────────────────────────────────────────────────────────

function AddPaymentDialog({
  open,
  onOpenChange,
  guaranteeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guaranteeId: string;
}) {
  const { org, userId, formatCurrency } = useOrganization();
  const createMut = useCreateGuaranteePayment();

  const [amount,  setAmount]  = useState("");
  const [concept, setConcept] = useState<PaymentConcept>("diagnostico");
  const [method,  setMethod]  = useState<PaymentMethod>("efectivo");
  const [notes,   setNotes]   = useState("");

  const reset = () => { setAmount(""); setConcept("diagnostico"); setMethod("efectivo"); setNotes(""); };

  const handleSave = async () => {
    if (!org?.id || !amount || isNaN(parseFloat(amount))) return;
    await createMut.mutateAsync({
      guarantee_id:    guaranteeId,
      organization_id: org.id,
      amount:          parseFloat(amount),
      concept,
      payment_method:  method,
      notes:           notes.trim() || undefined,
      registered_by:   userId ?? undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FaIcon icon={faDollarSign} size={16} className="text-emerald-400" />
            Registrar cobro en garantía
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Monto */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Monto cobrado *
            </Label>
            <div className="relative">
              <FaIcon icon={faDollarSign} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 text-lg font-bold font-mono"
              />
            </div>
            {amount && !isNaN(parseFloat(amount)) && (
              <p className="text-xs text-emerald-400 font-medium">
                = {formatCurrency(parseFloat(amount))}
              </p>
            )}
          </div>

          {/* Concepto */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Concepto *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {CONCEPTS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setConcept(key)}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-medium text-left transition-all",
                    concept === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Método de pago */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Método de pago
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {METHODS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={cn(
                    "px-2.5 py-1 rounded-full border text-xs font-medium transition-all",
                    method === key
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notas <span className="text-muted-foreground/60 normal-case">(opcional)</span>
            </Label>
            <Textarea
              placeholder="Detalle adicional del cobro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
            />
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
            <FaIcon icon={faCircleExclamation} size={14} className="text-amber-400 mt-0.5" />
            <p className="text-xs text-amber-300">
              Este cobro se registrará como ingreso en finanzas y quedará vinculado a la garantía.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={!amount || isNaN(parseFloat(amount)) || createMut.isPending}
            onClick={handleSave}
          >
            {createMut.isPending
              ? <FaIcon icon={faSpinner} size={14} className="animate-spin" />
              : <FaIcon icon={faReceipt} size={14} />
            }
            {createMut.isPending ? "Guardando..." : "Registrar cobro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface GuaranteePaymentsPanelProps {
  guaranteeId: string;
  isAdmin:     boolean;
}

export function GuaranteePaymentsPanel({ guaranteeId, isAdmin }: GuaranteePaymentsPanelProps) {
  const { formatCurrency } = useOrganization();
  const { data: payments = [], isLoading } = useGuaranteePayments(guaranteeId);
  const deleteMut = useDeleteGuaranteePayment(guaranteeId);

  const [addOpen,    setAddOpen]    = useState(false);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaIcon icon={faReceipt} size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cobros en garantía
          </span>
          {payments.length > 0 && (
            <span className="text-xs bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full font-mono">
              {formatCurrency(total)} total
            </span>
          )}
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setAddOpen(true)}
          >
            <FaIcon icon={faPlus} size={12} /> Agregar cobro
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      ) : payments.length === 0 ? (
        <div className="flex items-center justify-center py-6 rounded-xl border border-dashed border-border/50 text-muted-foreground">
          <p className="text-xs">Sin cobros registrados en esta garantía</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-3 py-2.5 group"
            >
              {/* Icon */}
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <FaIcon icon={faDollarSign} size={16} className="text-emerald-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold font-mono text-emerald-400">
                    {formatCurrency(p.amount)}
                  </span>
                  <span className="text-[10px] bg-primary/10 text-primary/80 px-1.5 py-0.5 rounded capitalize">
                    {CONCEPT_LABELS[p.concept] ?? p.concept}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 border border-border/40 px-1.5 py-0.5 rounded capitalize">
                    {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{format(new Date(p.created_at), "d MMM yyyy · HH:mm", { locale: es })}</span>
                  {p.notes && <span className="truncate">· {p.notes}</span>}
                </div>
              </div>

              {/* Delete */}
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteId(p.id)}
                >
                  <FaIcon icon={faTrash} size={14} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary bar */}
      {payments.length > 1 && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-2.5">
          <span className="text-xs text-muted-foreground">
            {payments.length} cobros registrados
          </span>
          <span className="text-sm font-bold font-mono text-emerald-400">
            Total: {formatCurrency(total)}
          </span>
        </div>
      )}

      {/* Dialogs */}
      <AddPaymentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        guaranteeId={guaranteeId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cobro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el cobro registrado. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteMut.mutate(deleteId); setDeleteId(null); } }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

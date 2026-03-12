"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  faHandHoldingDollar, faCircleCheck, faMagnifyingGlass, faBox, faTicket, faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/contexts/OrganizationContext";
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import { useFiados, usePayFiado, type FiadoRow } from "@/hooks/useFiados";

const PAYMENT_METHODS = [
  { value: "efectivo",      label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta",       label: "Tarjeta (POS)" },
];

export default function FiadosPage() {
  const { data: fiados = [], isLoading } = useFiados();
  const { formatCurrency } = useOrganization();
  const payMutation = usePayFiado();

  const [search, setSearch] = useState("");
  const [payTarget, setPayTarget] = useState<FiadoRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

  // Suma total por cobrar
  const totalPorCobrar = fiados.reduce((acc, f) => acc + f.amount, 0);

  // Filtrado
  const filtered = fiados.filter(f => 
    f.description?.toLowerCase().includes(search.toLowerCase()) || 
    f.detail?.toLowerCase().includes(search.toLowerCase())
  );

  const handlePay = () => {
    if (!payTarget) return;
    payMutation.mutate({
      id: payTarget.id,
      source: payTarget.source,
      payment_method: paymentMethod
    }, {
      onSuccess: () => setPayTarget(null)
    });
  };

  const columns: DataColumn<FiadoRow>[] = [
    {
      key: "id",
      header: "Descripción",
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {row.source === "pos" ? (
              <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/10">POS</Badge>
            ) : (
              <Badge variant="outline" className="text-purple-500 border-purple-500/20 bg-purple-500/10">TICKET</Badge>
            )}
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
      header: "Fecha Fiado",
      className: "hidden md:table-cell",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.created_at), "dd MMM, HH:mm", { locale: es })}
        </span>
      ),
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
        
        {/* Resumen Total */}
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
          <span className="text-xs font-medium text-amber-500/80 uppercase">Por Recaudar</span>
          <span className="font-mono text-xl font-bold text-amber-500">
            {formatCurrency(totalPorCobrar)}
          </span>
        </div>
      </div>

      <div className="relative max-w-sm">
        <FaIcon icon={faMagnifyingGlass} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        <Input 
          placeholder="Buscar cliente, ticket o producto..." 
          className="pl-9 h-10 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Table ── */}
      <DataTable
        data={filtered as FiadoRow[]}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="" // using custom search above
        searchKeys={[]} 
        emptyMessage="No hay cuentas pendientes por cobrar."
        emptyIcon={<FaIcon icon={faCircleCheck} size={28} className="text-emerald-500/40" />}
        actions={(row) => (
          <div className="flex justify-end">
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-none shadow-sm shadow-amber-500/20"
              onClick={() => {
                setPayTarget(row);
                setPaymentMethod("efectivo");
              }}
            >
              Liquidar <span className="hidden sm:inline">Deuda</span>
            </Button>
          </div>
        )}
      />

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
                <div className="bg-amber-500/10 text-amber-500 p-3 rounded-lg flex items-center justify-between mt-1 mb-2">
                  <span className="text-sm font-medium">Deuda Actual</span>
                  <span className="font-mono font-bold text-lg">{formatCurrency(payTarget?.amount ?? 0)}</span>
                </div>
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

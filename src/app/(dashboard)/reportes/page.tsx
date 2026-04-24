"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  faChartBar, faArrowTrendUp, faBagShopping, faScrewdriverWrench,
  faHandHoldingDollar, faCalendar, faDownload, faChevronDown,
  faFile, faFileExcel, faCartShopping, faWrench, faBolt, faFileLines, faFilePdf,
  faMoneyBillWave, faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
const FaIconInline = FaIcon;
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  useReporteSummary,
  type DatePreset,
  getDateRange,
  exportToCSV,
  formatDateForExport,
  type GastoReportRow,
} from "@/hooks/useReportes";
import { exportReportePDF } from "@/lib/exportPDF";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cn } from "@/lib/utils";

// ── Date Presets ──────────────────────────────────────────────────────────────

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Hoy",          value: "today"     },
  { label: "Ayer",         value: "yesterday" },
  { label: "Esta semana",  value: "week"      },
  { label: "Este mes",     value: "month"     },
];

// ── KPI Card — mismo estilo que DashCard del dashboard ───────────────────────

function KpiCard({
  label, value, sub, icon, color, loading,
}: {
  label: string; value: string; sub?: string;
  icon: IconDefinition; color: string; loading?: boolean;
}) {
  const textColor = color.split(' ').find(c => c.startsWith('text-')) || 'text-muted-foreground';
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1 overflow-hidden transition-all hover:border-primary/50">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <FaIcon icon={icon} size={12} className={`shrink-0 ${textColor}`} />
        <span className="truncate">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <p className="font-bold font-mono text-lg tracking-tight truncate">{value}</p>
      )}
      {sub && !loading && (
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      )}
    </div>
  );
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const statusLabel: Record<string, { label: string; cls: string }> = {
  pagado:    { label: "Pagado",     cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  fiado:     { label: "Fiado",      cls: "bg-amber-500/10  text-amber-400  border-amber-500/20"  },
  pendiente: { label: "Pendiente",  cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  entregado: { label: "Entregado",  cls: "bg-blue-500/10   text-blue-400   border-blue-500/20"   },
  en_proceso:{ label: "En proceso", cls: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  listo:     { label: "Listo",      cls: "bg-cyan-500/10   text-cyan-400   border-cyan-500/20"   },
  completado:{ label: "Completado", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  recibido:  { label: "Recibido",   cls: "bg-slate-500/10  text-slate-400  border-slate-500/20"  },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusLabel[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0", s.cls)}>
      {s.label}
    </Badge>
  );
}

function CurrencyCell({ value, currency }: { value: number | null; currency: string }) {
  if (value == null) return <span className="text-muted-foreground/50">—</span>;
  return <span className="font-mono text-sm">{currency} {value.toFixed(2)}</span>;
}

// ── Excel export general ───────────────────────────────────────────────────────

function exportGeneralExcel(
  org: { name?: string | null; address?: string | null; phone?: string | null; tax_id?: string | null } | null,
  from: Date,
  to: Date,
  currencyCode: string,
  salesData:    ReturnType<typeof useReporteSummary>["sales"]["data"],
  ticketsData:  ReturnType<typeof useReporteSummary>["tickets"]["data"],
  serviciosData:ReturnType<typeof useReporteSummary>["servicios"]["data"],
  gastosData?: { description: string; amount: number; category: string; date: string }[],
) {
  const wb = XLSX.utils.book_new();
  const periodLabel = `${format(from, "dd/MM/yyyy")} al ${format(to, "dd/MM/yyyy")}`;

  const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E293B" } } };

  // ── Hoja 1: Resumen ──────────────────────────────────────────────────────────
  const totalIngresos =
    (salesData ?? []).filter(s => s.payment_status === "pagado").reduce((a,s)=>a+s.total_amount,0) +
    (ticketsData ?? []).filter(t => t.payment_status === "pagado").reduce((a,t)=>a+t.total_amount,0) +
    (serviciosData ?? []).filter(s => s.payment_status === "pagado").reduce((a,s)=>a+(s.price??0),0);

  const totalFiados =
    (salesData ?? []).filter(s => s.payment_status === "fiado").reduce((a,s)=>a+s.total_amount,0) +
    (ticketsData ?? []).filter(t => t.payment_status === "fiado").reduce((a,t)=>a+t.total_amount,0) +
    (serviciosData ?? []).filter(s => s.payment_status === "fiado").reduce((a,s)=>a+(s.price??0),0);

  const totalGastos = (gastosData ?? []).reduce((a,g)=>a+g.amount,0);
  const balance = totalIngresos - totalGastos;

  const resumenData = [
    // Info tienda
    ["REPORTE FINANCIERO GENERAL", "", ""],
    ["", "", ""],
    ["Empresa:", org?.name ?? "—", ""],
    ["Dirección:", org?.address ?? "—", ""],
    ["Teléfono:", org?.phone ?? "—", ""],
    ["RUC / NIT / RUT:", org?.tax_id ?? "—", ""],
    ["Período:", periodLabel, ""],
    ["Generado:", format(new Date(), "dd/MM/yyyy HH:mm"), ""],
    ["Moneda:", currencyCode, ""],
    ["", "", ""],
    // Resumen numérico
    ["CONCEPTO", "MONTO", ""],
    ["Ingresos cobrados (POS)", `${currencyCode} ${(salesData ?? []).filter(s=>s.payment_status==="pagado").reduce((a,s)=>a+s.total_amount,0).toFixed(2)}`, ""],
    ["Ingresos cobrados (Tickets)", `${currencyCode} ${(ticketsData ?? []).filter(t=>t.payment_status==="pagado").reduce((a,t)=>a+t.total_amount,0).toFixed(2)}`, ""],
    ["Ingresos cobrados (Otros Servicios)", `${currencyCode} ${(serviciosData ?? []).filter(s=>s.payment_status==="pagado").reduce((a,s)=>a+(s.price??0),0).toFixed(2)}`, ""],
    ["TOTAL INGRESOS COBRADOS", `${currencyCode} ${totalIngresos.toFixed(2)}`, ""],
    ["", "", ""],
    ["Por cobrar (Fiados)", `${currencyCode} ${totalFiados.toFixed(2)}`, ""],
    ["Total Gastos", `${currencyCode} ${totalGastos.toFixed(2)}`, ""],
    ["", "", ""],
    ["BALANCE NETO (Ingresos - Gastos)", `${currencyCode} ${balance.toFixed(2)}`, balance >= 0 ? "✅ Positivo" : "⚠️ Negativo"],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen["!cols"] = [{ wch: 40 }, { wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  // ── Hoja 2: Ventas POS ───────────────────────────────────────────────────────
  const salesRows = [
    ["Fecha", "Cliente", "Artículos", "Método de pago", "Estado", `Monto (${currencyCode})`],
    ...(salesData ?? []).map(s => [
      format(new Date(s.created_at), "dd/MM/yyyy HH:mm"),
      s.customer_name ?? "Directo",
      s.items_summary,
      s.payment_method,
      s.payment_status,
      s.total_amount,
    ]),
    [],
    ["", "", "", "", "TOTAL",
      (salesData ?? []).reduce((a,s)=>a+s.total_amount,0)],
  ];
  const wsSales = XLSX.utils.aoa_to_sheet(salesRows);
  wsSales["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 35 }, { wch: 18 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSales, "Ventas POS");

  // ── Hoja 3: Tickets ──────────────────────────────────────────────────────────
  const ticketRows = [
    ["Fecha", "Cliente", "Dispositivo", "Repuestos Usados", "Técnico", "Estado", "Estado Pago", `Mano de obra (${currencyCode})`, `Total Repuestos (${currencyCode})`, `Total (${currencyCode})`],
    ...(ticketsData ?? []).map(t => [
      format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
      t.customer_name ?? "—",
      t.device,
      t.parts_summary || "—",
      t.technician ?? "—",
      t.status,
      t.payment_status,
      t.final_amount ?? 0,
      t.parts_amount,
      t.total_amount,
    ]),
    [],
    ["", "", "", "", "", "TOTAL COBRADO", "", "",
      (ticketsData ?? []).filter(t=>t.payment_status==="pagado").reduce((a,t)=>a+t.total_amount,0)],
  ];
  const wsTickets = XLSX.utils.aoa_to_sheet(ticketRows);
  wsTickets["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsTickets, "Tickets");

  // ── Hoja 4: Otros Servicios ───────────────────────────────────────────────────
  const servicioRows = [
    ["Fecha", "Orden", "Cliente", "Servicio", "Estado", "Estado Pago", "Método Pago", `Monto (${currencyCode})`],
    ...(serviciosData ?? []).map(s => [
      format(new Date(s.created_at), "dd/MM/yyyy HH:mm"),
      s.order_number,
      s.customer_name ?? "—",
      (s.tags ?? []).join(", ") || s.description || "—",
      s.status,
      s.payment_status ?? "—",
      s.payment_method ?? "—",
      s.price ?? 0,
    ]),
    [],
    ["", "", "", "", "", "TOTAL",
      (serviciosData ?? []).reduce((a,s)=>a+(s.price??0),0)],
  ];
  const wsServicios = XLSX.utils.aoa_to_sheet(servicioRows);
  wsServicios["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsServicios, "Otros Servicios");

  // Guardar
  XLSX.writeFile(wb, `Balance_General_${formatDateForExport(from)}_${formatDateForExport(to)}.xlsx`);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const { org, currencyCode = "USD" } = useOrganization();

  const [preset, setPreset]           = useState<DatePreset>("today");
  const [customFrom, setCustomFrom]   = useState<Date | undefined>();
  const [customTo, setCustomTo]       = useState<Date | undefined>();
  const [calOpen, setCalOpen]         = useState(false);
  const [pickingFrom, setPickingFrom] = useState(true);

  const { from, to } = useMemo(
    () => getDateRange(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const { summary, isLoading, sales, tickets, servicios, gastos } = useReporteSummary(from, to);

  const dateLabel = useMemo(() => {
    if (preset === "today")     return `Hoy, ${format(from, "d 'de' MMMM yyyy", { locale: es })}`;
    if (preset === "yesterday") return `Ayer, ${format(from, "d 'de' MMMM yyyy", { locale: es })}`;
    if (preset === "week")      return `${format(from, "d MMM")} – ${format(to, "d MMM yyyy", { locale: es })}`;
    if (preset === "month")     return format(from, "MMMM yyyy", { locale: es });
    return `${format(from, "d MMM")} – ${format(to, "d MMM yyyy", { locale: es })}`;
  }, [preset, from, to]);

  // ── Exports ────────────────────────────────────────────────────────────────
  function doExportSales() {
    exportToCSV(
      `ventas_${formatDateForExport(from)}_${formatDateForExport(to)}.csv`,
      ["Fecha", "Cliente", "Artículos", "Método", "Estado", "Monto"],
      (sales.data ?? []).map(s => [
        format(new Date(s.created_at), "dd/MM/yyyy HH:mm"),
        s.customer_name ?? "—", s.items_summary,
        s.payment_method, s.payment_status, s.total_amount.toFixed(2),
      ])
    );
  }
  function doExportTickets() {
    exportToCSV(
      `tickets_${formatDateForExport(from)}_${formatDateForExport(to)}.csv`,
      ["Fecha", "Cliente", "Dispositivo", "Técnico", "Estado", "Pago", "Mano de obra", "Repuestos", "Total", "Detalle repuestos"],
      (tickets.data ?? []).map(t => [
        format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
        t.customer_name ?? "—", t.device, t.technician ?? "—",
        t.status, t.payment_status,
        (t.final_amount ?? 0).toFixed(2),
        t.parts_amount.toFixed(2),
        t.total_amount.toFixed(2),
        t.parts_summary || "—",
      ])
    );
  }
  function doExportServicios() {
    exportToCSV(
      `servicios_${formatDateForExport(from)}_${formatDateForExport(to)}.csv`,
      ["Fecha", "Orden", "Cliente", "Servicio", "Estado", "Estado Pago", "Método Pago", "Monto"],
      (servicios.data ?? []).map(s => [
        format(new Date(s.created_at), "dd/MM/yyyy HH:mm"),
        s.order_number, s.customer_name ?? "—",
        (s.tags ?? []).join(", ") || s.description || "—",
        s.status, s.payment_status ?? "—",
        s.payment_method ?? "—", (s.price ?? 0).toFixed(2),
      ])
    );
  }
  function doExportGeneral() {
    const gastosRows = (gastos.data ?? []).map((g: GastoReportRow) => ({
      description: g.description,
      amount:      g.amount,
      category:    g.category ?? "—",
      date:        g.expense_date,
    }));
    exportGeneralExcel(
      org ?? null, from, to, currencyCode,
      sales.data, tickets.data, servicios.data,
      gastosRows,
    );
  }
  function doExportPDF() {
    exportReportePDF({
      org: org ?? null,
      from, to, currencyCode,
      summary,
      sales:     sales.data,
      tickets:   tickets.data,
      servicios: servicios.data,
      gastos:    gastos.data ?? [],
    });
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FaIcon icon={faChartBar} size={18} />
            Reportes
          </h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{dateLabel}</p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Preset buttons */}
          {PRESETS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={preset === p.value ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}

          {/* Custom range calendar */}
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={preset === "custom" ? "default" : "outline"}
                className="h-8 text-xs gap-1.5"
              >
                <FaIcon icon={faCalendar} size={11} />
                {preset === "custom" && customFrom
                  ? `${format(customFrom, "d MMM")}${customTo ? ` – ${format(customTo, "d MMM")}` : ""}`
                  : "Rango"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <div className="mb-2 flex gap-2">
                <Button size="sm" variant={pickingFrom ? "default" : "outline"} className="h-7 text-xs" onClick={() => setPickingFrom(true)}>Desde</Button>
                <Button size="sm" variant={!pickingFrom ? "default" : "outline"} className="h-7 text-xs" onClick={() => setPickingFrom(false)}>Hasta</Button>
              </div>
              {pickingFrom ? (
                <CalendarUI
                  mode="single"
                  selected={customFrom}
                  onSelect={(d: Date | undefined) => { setCustomFrom(d); setPickingFrom(false); setPreset("custom"); }}
                  locale={es}
                />
              ) : (
                <CalendarUI
                  mode="single"
                  selected={customTo}
                  onSelect={(d: Date | undefined) => { setCustomTo(d); setCalOpen(false); setPreset("custom"); }}
                  locale={es}
                  disabled={(d: Date) => customFrom ? d < customFrom : false}
                />
              )}
            </PopoverContent>
          </Popover>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                <FaIcon icon={faDownload} size={11} />
                Exportar
                <FaIcon icon={faChevronDown} size={9} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {/* PDF */}
              <DropdownMenuItem onClick={doExportPDF} className="gap-2 font-medium text-red-400 focus:text-red-400 focus:bg-red-500/10">
                <FaIcon icon={faFilePdf} size={13} className="text-red-400" />
                Reporte completo (.pdf)
              </DropdownMenuItem>
              {/* Opción destacada: Balance general */}
              <DropdownMenuItem onClick={doExportGeneral} className="gap-2 font-medium text-emerald-400 focus:text-emerald-400 focus:bg-emerald-500/10">
                <FaIcon icon={faFileExcel} size={13} className="text-emerald-400" />
                Balance general (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={doExportSales} className="gap-2">
                <FaIcon icon={faFile} size={13} /> Ventas POS (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={doExportTickets} className="gap-2">
                <FaIcon icon={faFile} size={13} /> Tickets (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={doExportServicios} className="gap-2">
                <FaIcon icon={faFile} size={13} /> Otros Servicios (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard
          label="Ingresos totales"
          value={`${currencyCode} ${summary.total_revenue.toFixed(2)}`}
          sub={`${summary.sales_count + summary.tickets_count + summary.servicios_count} transacciones`}
          icon={faArrowTrendUp}
          color="bg-emerald-500/20 text-emerald-400"
          loading={isLoading}
        />
        <KpiCard
          label="Ventas POS"
          value={`${currencyCode} ${summary.total_sales_revenue.toFixed(2)}`}
          sub={`${summary.sales_count} venta${summary.sales_count !== 1 ? "s" : ""}`}
          icon={faBagShopping}
          color="bg-blue-500/20 text-blue-400"
          loading={isLoading}
        />
        <KpiCard
          label="Tickets reparación"
          value={`${currencyCode} ${summary.total_ticket_revenue.toFixed(2)}`}
          sub={`${summary.tickets_count} ticket${summary.tickets_count !== 1 ? "s" : ""}`}
          icon={faScrewdriverWrench}
          color="bg-violet-500/20 text-violet-400"
          loading={isLoading}
        />
        <KpiCard
          label="Otros servicios"
          value={`${currencyCode} ${summary.total_servicio_revenue.toFixed(2)}`}
          sub={`${summary.servicios_count} servicio${summary.servicios_count !== 1 ? "s" : ""}`}
          icon={faFileLines}
          color="bg-cyan-500/20 text-cyan-400"
          loading={isLoading}
        />
        <KpiCard
          label="Por cobrar (fiados)"
          value={`${currencyCode} ${summary.pending_collection.toFixed(2)}`}
          sub="pendiente de cobro"
          icon={faHandHoldingDollar}
          color="bg-amber-500/20 text-amber-400"
          loading={isLoading}
        />
        <KpiCard
          label="Gastos"
          value={`${currencyCode} ${summary.total_gastos.toFixed(2)}`}
          sub={`${summary.gastos_count} gasto${summary.gastos_count !== 1 ? "s" : ""}`}
          icon={faMoneyBillWave}
          color="bg-red-500/20 text-red-400"
          loading={isLoading}
        />
        <KpiCard
          label="Utilidad neta"
          value={`${currencyCode} ${summary.net_profit.toFixed(2)}`}
          sub={summary.net_profit >= 0 ? "positivo" : "negativo"}
          icon={faChartLine}
          color={summary.net_profit >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}
          loading={isLoading}
        />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="sales" className="text-xs gap-1.5">
            <FaIconInline icon={faCartShopping} size={11} /> Ventas POS
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{sales.data?.length ?? 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs gap-1.5">
            <FaIconInline icon={faWrench} size={11} /> Tickets
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{tickets.data?.length ?? 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="servicios" className="text-xs gap-1.5">
            <FaIconInline icon={faBolt} size={11} /> Otros Servicios
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{servicios.data?.length ?? 0}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Ventas POS ── */}
        <TabsContent value="sales">
          <TableCard
            title="Ventas del período"
            icon={<FaIconInline icon={faCartShopping} size={14} className="text-blue-400" />}
            onExport={doExportSales}
            loading={sales.isLoading}
            empty={!sales.data?.length}
            footer={
              <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">{sales.data?.length ?? 0} ventas</span>
                <span className="font-bold font-mono">
                  {currencyCode} {(sales.data ?? []).filter(s=>s.payment_status==="pagado").reduce((a,s)=>a+s.total_amount,0).toFixed(2)}
                </span>
              </div>
            }
          >
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {(sales.data ?? []).map((s) => (
                <div key={s.id} className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">
                      {s.customer_name ?? <span className="italic text-muted-foreground">Directo</span>}
                    </p>
                    <span className="font-mono text-sm font-semibold shrink-0">{currencyCode} {s.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={s.payment_status} />
                    {s.payment_method && <span className="text-[10px] text-muted-foreground capitalize">{s.payment_method}</span>}
                    <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(s.created_at), "dd/MM HH:mm")}</span>
                  </div>
                  {s.items_summary && <p className="text-[10px] text-muted-foreground truncate">{s.items_summary}</p>}
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b bg-muted/20">
                  <Th>Fecha</Th>
                  <Th>Cliente</Th>
                  <Th className="hidden md:table-cell">Artículos</Th>
                  <Th className="hidden sm:table-cell">Método</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Monto</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(sales.data ?? []).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <Td className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(s.created_at), "dd/MM HH:mm")}
                    </Td>
                    <Td>
                      <p className="font-medium text-sm truncate max-w-[140px]">
                        {s.customer_name ?? <span className="italic text-muted-foreground">Directo</span>}
                      </p>
                      {s.seller_name && <p className="text-xs text-muted-foreground">por {s.seller_name}</p>}
                    </Td>
                    <Td className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                      {s.items_summary || "—"}
                    </Td>
                    <Td className="hidden sm:table-cell text-xs capitalize">{s.payment_method}</Td>
                    <Td><StatusBadge status={s.payment_status} /></Td>
                    <Td className="text-right"><CurrencyCell value={s.total_amount} currency={currencyCode} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </TabsContent>

        {/* ── Tickets ── */}
        <TabsContent value="tickets">
          <TableCard
            title="Tickets del período"
            icon={<FaIconInline icon={faWrench} size={14} className="text-violet-400" />}
            onExport={doExportTickets}
            loading={tickets.isLoading}
            empty={!tickets.data?.length}
            footer={
              <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">{(tickets.data ?? []).filter(t=>t.status==="entregado").length} entregados</span>
                <span className="font-bold font-mono">
                  {currencyCode} {(tickets.data ?? []).filter(t=>t.payment_status==="pagado").reduce((a,t)=>a+t.total_amount,0).toFixed(2)}
                </span>
              </div>
            }
          >
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {(tickets.data ?? []).map((t) => (
                <button
                  key={t.id}
                  className="w-full text-left p-3 space-y-1.5 hover:bg-muted/30 transition-colors"
                  onClick={() => window.open(`/tickets/${t.id}`, "_blank")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {t.customer_name ?? <span className="italic text-muted-foreground">—</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{t.device}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-semibold">{currencyCode} {t.total_amount.toFixed(2)}</p>
                      {t.parts_amount > 0 && (
                        <p className="text-[10px] text-amber-400/70">
                          M.obra {currencyCode} {(t.total_amount - t.parts_amount).toFixed(2)} · Rep. {currencyCode} {t.parts_amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={t.status} />
                    <StatusBadge status={t.payment_status} />
                    <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(t.created_at), "dd/MM HH:mm")}</span>
                  </div>
                  {t.parts_summary && <p className="text-[10px] text-amber-400/60 truncate">{t.parts_summary}</p>}
                </button>
              ))}
            </div>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b bg-muted/20">
                  <Th>Fecha</Th>
                  <Th>Cliente</Th>
                  <Th className="hidden md:table-cell">Dispositivo</Th>
                  <Th className="hidden xl:table-cell">Repuestos</Th>
                  <Th className="hidden lg:table-cell">Técnico</Th>
                  <Th>Estado</Th>
                  <Th className="hidden sm:table-cell">Pago</Th>
                  <Th className="text-right">Monto</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(tickets.data ?? []).map((t) => (
                  <tr key={t.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => window.open(`/tickets/${t.id}`, "_blank")}
                  >
                    <Td className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(t.created_at), "dd/MM HH:mm")}
                    </Td>
                    <Td>
                      <p className="font-medium text-sm">
                        {t.customer_name ?? <span className="italic text-muted-foreground">—</span>}
                      </p>
                    </Td>
                    <Td className="hidden md:table-cell text-xs text-muted-foreground">{t.device}</Td>
                    <Td className="hidden xl:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{t.parts_summary || "—"}</Td>
                    <Td className="hidden lg:table-cell text-xs text-muted-foreground">{t.technician ?? "—"}</Td>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td className="hidden sm:table-cell"><StatusBadge status={t.payment_status} /></Td>
                    <Td className="text-right">
                      <CurrencyCell value={t.total_amount} currency={currencyCode} />
                      {t.parts_amount > 0 && (
                        <p className="text-[10px] text-amber-400/70 mt-0.5">
                          +{currencyCode} {t.parts_amount.toFixed(2)} repuestos
                        </p>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </TabsContent>

        {/*Otros Servicios*/}
        <TabsContent value="servicios">
          <TableCard
            title="Otros servicios del período"
            icon={<FaIconInline icon={faBolt} size={14} className="text-cyan-400" />}
            onExport={doExportServicios}
            loading={servicios.isLoading}
            empty={!servicios.data?.length}
            footer={
              <div className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">{servicios.data?.length ?? 0} servicios</span>
                <span className="font-bold font-mono">
                  {currencyCode} {(servicios.data ?? []).filter(s=>s.payment_status==="pagado").reduce((a,s)=>a+(s.price??0),0).toFixed(2)}
                </span>
              </div>
            }
          >
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {(servicios.data ?? []).map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left p-3 space-y-1.5 hover:bg-muted/30 transition-colors"
                  onClick={() => window.open(`/otros-servicios/${s.id}`, "_blank")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {s.customer_name ?? <span className="italic text-muted-foreground">—</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {(s.tags ?? []).length > 0 ? s.tags.join(" · ") : (s.description || "—")}
                      </p>
                      {(s.device_brand || s.device_model) && (
                        <p className="text-[10px] text-muted-foreground/70 truncate">
                          {[s.device_brand, s.device_model].filter(Boolean).join(" ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-semibold">{currencyCode} {(s.price ?? 0).toFixed(2)}</p>
                      <Badge variant="outline" className="text-[10px] font-mono mt-0.5">{s.order_number}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={s.status} />
                    {s.payment_status && <StatusBadge status={s.payment_status} />}
                    <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(s.created_at), "dd/MM HH:mm")}</span>
                  </div>
                </button>
              ))}
            </div>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b bg-muted/20">
                  <Th>Fecha</Th>
                  <Th>Orden</Th>
                  <Th>Cliente</Th>
                  <Th className="hidden md:table-cell">Servicio</Th>
                  <Th>Estado</Th>
                  <Th className="hidden sm:table-cell">Pago</Th>
                  <Th className="text-right">Precio</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(servicios.data ?? []).map((s) => (
                  <tr key={s.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => window.open(`/otros-servicios/${s.id}`, "_blank")}
                  >
                    <Td className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(s.created_at), "dd/MM HH:mm")}
                    </Td>
                    <Td>
                      <Badge variant="outline" className="text-[10px] font-mono">{s.order_number}</Badge>
                    </Td>
                    <Td className="font-medium text-sm">
                      {s.customer_name ?? <span className="italic text-muted-foreground">—</span>}
                    </Td>
                    <Td className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px]">
                      <p className="truncate">
                        {(s.tags ?? []).length > 0 ? s.tags.join(" · ") : (s.description || "—")}
                      </p>
                      {(s.device_brand || s.device_model) && (
                        <p className="text-[10px] opacity-60 truncate">
                          {[s.device_brand, s.device_model].filter(Boolean).join(" ")}
                        </p>
                      )}
                    </Td>
                    <Td><StatusBadge status={s.status} /></Td>
                    <Td className="hidden sm:table-cell">
                      {s.payment_status ? <StatusBadge status={s.payment_status} /> : <span className="text-muted-foreground/40">—</span>}
                    </Td>
                    <Td className="text-right"><CurrencyCell value={s.price} currency={currencyCode} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── TableCard wrapper ──────────────────────────────────────────────────────────

function TableCard({
  title, icon, onExport, loading, empty, footer, children,
}: {
  title: string;
  icon: React.ReactNode;
  onExport: () => void;
  loading: boolean;
  empty: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <span className="text-sm font-medium flex items-center gap-2">
          {icon}{title}
        </span>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onExport}>
          <FaIconInline icon={faDownload} size={11} /> CSV
        </Button>
      </div>
      {loading ? (
        <div className="space-y-3 p-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <FaIconInline icon={faFileLines} size={28} className="opacity-30" />
          <p className="text-sm">Sin registros en este período</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">{children}</div>
          {footer && <div className="border-t bg-muted/20">{footer}</div>}
        </>
      )}
    </div>
  );
}

// ── Table cell helpers ─────────────────────────────────────────────────────────

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-2.5 text-left font-medium", className)}>{children}</th>
  );
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3", className)}>{children}</td>
  );
}


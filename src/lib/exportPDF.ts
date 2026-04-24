/**
 * exportPDF.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Genera un PDF de balance financiero usando jsPDF + jspdf-autotable.
 * Se llama únicamente en el cliente (browser).
 */

import { format } from "date-fns";
import { es }     from "date-fns/locale";
import type { SaleReportRow, TicketReportRow, ServicioReportRow, GastoReportRow } from "@/hooks/useReportes";

// ── Colores ───────────────────────────────────────────────────────────────────
const C = {
  primary:   [99,  102, 241] as [number, number, number],   // indigo-500
  emerald:   [16,  185, 129] as [number, number, number],
  red:       [239,  68,  68] as [number, number, number],
  amber:     [245, 158,  11] as [number, number, number],
  text:      [15,   23,  42] as [number, number, number],   // slate-900
  muted:     [100, 116, 139] as [number, number, number],   // slate-500
  border:    [226, 232, 240] as [number, number, number],   // slate-200
  bg:        [248, 250, 252] as [number, number, number],   // slate-50
  white:     [255, 255, 255] as [number, number, number],
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrgInfo {
  name?:         string | null;
  address?:      string | null;
  phone?:        string | null;
  currency_code?: string | null;
}

interface Summary {
  total_revenue:         number;
  total_sales_revenue:   number;
  total_ticket_revenue:  number;
  total_servicio_revenue:number;
  sales_count:           number;
  tickets_count:         number;
  servicios_count:       number;
  total_gastos:          number;
  net_profit:            number;
  gastos_count:          number;
}

export async function exportReportePDF(opts: {
  org:         OrgInfo | null;
  from:        Date;
  to:          Date;
  currencyCode:string;
  summary:     Summary;
  sales:       SaleReportRow[]        | undefined;
  tickets:     TicketReportRow[]      | undefined;
  servicios:   ServicioReportRow[]    | undefined;
  gastos:      GastoReportRow[]       | undefined;
}) {
  const { org, from, to, currencyCode, summary, sales = [], tickets = [], servicios = [], gastos = [] } = opts;
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const cur = (v: number) => `${currencyCode} ${v.toFixed(2)}`;
  const fmtDate = (d: Date) => format(d, "dd/MM/yyyy", { locale: es });

  // ── Header band ────────────────────────────────────────────────────────────
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 24, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.text(org?.name ?? "TechX", 14, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Reporte Financiero", 14, 16);
  doc.text(`Período: ${fmtDate(from)} — ${fmtDate(to)}`, 14, 21);
  doc.text(`Generado: ${fmtDate(new Date())}`, W - 14, 21, { align: "right" });

  // ── Org sub-info ──────────────────────────────────────────────────────────
  let y = 32;
  if (org?.address || org?.phone) {
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    if (org.address) { doc.text(`Dir: ${org.address}`, 14, y); y += 5; }
    if (org.phone)   { doc.text(`Tel: ${org.phone}`,   14, y); y += 5; }
    y += 2;
  }

  // ── KPI Summary cards ──────────────────────────────────────────────────────
  const kpis = [
    { label: "Ingresos Totales", value: cur(summary.total_revenue),          color: C.emerald },
    { label: "Ventas POS",       value: cur(summary.total_sales_revenue),    color: C.primary },
    { label: "Reparaciones",     value: cur(summary.total_ticket_revenue),   color: C.amber   },
    { label: "Otros Servicios",  value: cur(summary.total_servicio_revenue), color: C.muted   },
    { label: "Gastos",           value: cur(summary.total_gastos),           color: C.red     },
    { label: "Utilidad Neta",    value: cur(summary.net_profit),             color: summary.net_profit >= 0 ? C.emerald : C.red },
  ];

  const cardW = (W - 28 - 5 * 3) / 6;
  kpis.forEach((k, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(...C.bg);
    doc.roundedRect(x, y, cardW, 18, 2, 2, "F");
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, 18, 2, 2, "S");
    // colored top bar
    doc.setFillColor(...k.color);
    doc.roundedRect(x, y, cardW, 3, 1, 1, "F");
    // label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(k.label, x + 3, y + 8);
    // value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text(k.value, x + 3, y + 15);
  });
  y += 26;

  // ── Transactions count badges ─────────────────────────────────────────────
  const counts = [
    { label: `${summary.sales_count} ventas POS` },
    { label: `${summary.tickets_count} tickets` },
    { label: `${summary.servicios_count} servicios` },
  ];
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.muted);
  doc.text(counts.map(c => c.label).join("   ·   "), 14, y);
  y += 7;

  // ── Section: Top Tickets ──────────────────────────────────────────────────
  if (tickets.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text("Reparaciones", 14, y);
    y += 3;

    const tRows = tickets.slice(0, 30).map(t => [
      format(new Date(t.created_at), "dd/MM/yy"),
      t.customer_name ?? "—",
      t.device.substring(0, 22),
      t.technician ?? "—",
      t.status,
      cur(t.total_amount),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Cliente", "Dispositivo", "Técnico", "Estado", "Total"]],
      body: tRows,
      styles:     { fontSize: 7, cellPadding: 2, textColor: C.text },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 5: { halign: "right", fontStyle: "bold" } },
      margin: { left: 14, right: 14 },
      tableLineColor: C.border,
      tableLineWidth: 0.2,
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ── Section: Top Ventas POS ───────────────────────────────────────────────
  if (sales.length > 0 && y < 240) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text("Ventas POS", 14, y);
    y += 3;

    const sRows = sales.slice(0, 20).map(s => [
      format(new Date(s.created_at), "dd/MM/yy"),
      s.customer_name ?? "Venta directa",
      s.items_summary.substring(0, 28),
      s.payment_method,
      cur(s.total_amount),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Cliente", "Artículos", "Método", "Total"]],
      body: sRows,
      styles:     { fontSize: 7, cellPadding: 2, textColor: C.text },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 4: { halign: "right", fontStyle: "bold" } },
      margin: { left: 14, right: 14 },
      tableLineColor: C.border,
      tableLineWidth: 0.2,
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ── Section: Otros Servicios ──────────────────────────────────────────────
  if (servicios.length > 0 && y < 240) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text("Otros Servicios", 14, y);
    y += 3;

    const svRows = servicios.slice(0, 15).map(s => [
      format(new Date(s.created_at), "dd/MM/yy"),
      s.customer_name ?? "—",
      ((s.tags ?? []).join(", ") || s.description || "—").substring(0, 28),
      s.status,
      cur(s.price ?? 0),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Cliente", "Servicio", "Estado", "Monto"]],
      body: svRows,
      styles:     { fontSize: 7, cellPadding: 2, textColor: C.text },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 4: { halign: "right", fontStyle: "bold" } },
      margin: { left: 14, right: 14 },
      tableLineColor: C.border,
      tableLineWidth: 0.2,
    });
  }

  // ── Section: Gastos ──────────────────────────────────────────────────────────
  if (gastos.length > 0 && y < 240) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text("Gastos", 14, y);
    y += 3;

    const gRows = gastos.slice(0, 20).map(g => [
      format(new Date(g.expense_date), "dd/MM/yy"),
      g.description.substring(0, 30),
      g.category ?? "—",
      g.payment_method ?? "—",
      cur(g.amount),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Descripción", "Categoría", "Método", "Monto"]],
      body: gRows,
      styles:     { fontSize: 7, cellPadding: 2, textColor: C.text },
      headStyles: { fillColor: C.red, textColor: C.white, fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: C.bg },
      columnStyles: { 4: { halign: "right", fontStyle: "bold" } },
      margin: { left: 14, right: 14 },
      tableLineColor: C.border,
      tableLineWidth: 0.2,
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    // Net profit summary line
    if (y < 270) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...(summary.net_profit >= 0 ? C.emerald : C.red));
      doc.text(
        `Utilidad Neta: ${cur(summary.net_profit)}  (Ingresos ${cur(summary.total_revenue)} - Gastos ${cur(summary.total_gastos)})`,
        14, y,
      );
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(`${org?.name ?? "TechX"} · Reporte generado el ${fmtDate(new Date())}`, 14, 292);
    doc.text(`Pág. ${i} / ${pageCount}`, W - 14, 292, { align: "right" });
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  doc.save(`Reporte_${fmtDate(from).replace(/\//g, "-")}_${fmtDate(to).replace(/\//g, "-")}.pdf`);
}

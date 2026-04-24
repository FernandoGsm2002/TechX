"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import {
  faPrint, faFileInvoice, faReceipt, faFileLines, faShareNodes
} from "@fortawesome/free-solid-svg-icons";
import {
  getFiscalConfig, getDocPrintLabel,
  formatNumberGlobal, formatMoneyGlobal,
  type FiscalDocType,
} from "@/lib/fiscalConfig";
import { ClientCombobox } from "@/components/ui-custom/ClientCombobox";
import { PhoneInput, CURRENCY_TO_DIAL } from "@/components/ui-custom/PhoneInput";

// Re-export for backward compat
export type DocType = string;   // boleta | factura | nota_venta | nota_fiscal | factura_b | …

// ── Receipt Data ───────────────────────────────────────────────────────────────

export interface ReceiptData {
  docType:       string;
  docNumber:     string;           // e.g. "B001-00042"
  date:          string;           // ISO
  currencyCode?: string;           // PEN | COP | CLP | MXN | BRL | ARS | USD
  // Org info
  orgName:       string;
  orgAddress?:   string | null;
  orgPhone?:     string | null;
  orgTaxId?:     string | null;
  orgTaxLabel?:  string | null;
  orgLogoUrl?:   string | null;
  showLogo?:     boolean;
  printWidth:    58 | 80;
  // Customer
  customerName:  string;
  customerTaxId?: string | null;   // RUC/NIT for facturas
  customerPhone?: string | null;
  // Items
  items: {
    name:      string;
    qty:       number;
    unitPrice: number;
  }[];
  // Totals
  subtotal:    number;
  taxPct:      number;
  taxLabel:    string;
  showIgv:     boolean;
  total:       number;
  paymentMethod?: string | null;
  // Footer
  notes?:        string | null;
  footer?:       string | null;
  warrantyDays?:  number | null;
  /** Condiciones especificas de garantia de este ticket (imprime tras los dias) */
  warrantyNotes?: string | null;
  /** SVG string del QR de seguimiento (generado externamente con react-qr-code) */
  trackingQrSvg?: string | null;
  /** URL de seguimiento que se muestra bajo el QR */
  trackingUrl?:   string | null;
}

// ── CSS for thermal printer ────────────────────────────────────────────────────

export function buildReceiptCss(width: 58 | 80): string {
  const mmWidth = `${width}mm`;
  const pxWidth = width === 58 ? 220 : 302;
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* ── Screen: gray bg, receipt centered as paper slip ── */
    html, body { margin: 0; padding: 0; background: #52525b; min-height: 100vh; }
    body { display: flex; justify-content: center; padding: 28px 16px 48px; }

    .paper-wrap {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${width === 58 ? "7.5pt" : "8pt"};
      color: #000;
      background: #fff;
      width: ${pxWidth}px;
      flex-shrink: 0;
      align-self: flex-start;
      padding: 6mm 4mm 10mm;
      box-shadow: 0 8px 32px rgba(0,0,0,0.55);
    }

    /* ── Print: exact thermal paper, no chrome ── */
    @page { size: ${mmWidth} auto; margin: 2mm; }
    @media print {
      html, body {
        background: #fff !important;
        padding: 0; margin: 0;
        display: block;
        min-height: unset; height: auto;
        width: ${mmWidth};
      }
      .paper-wrap {
        box-shadow: none;
        padding: 2mm;
        width: ${mmWidth};
        margin: 0;
      }
    }

    .receipt { width: 100%; }
    .center  { text-align: center; }
    .right   { text-align: right; }
    .bold    { font-weight: bold; }
    .small   { font-size: ${width === 58 ? "6pt" : "6.5pt"}; }
    .large   { font-size: ${width === 58 ? "10pt" : "11pt"}; font-weight: bold; }
    .divider { border: none; border-top: 1px dashed #000; margin: 3px 0; }
    .logo { max-width: 100%; max-height: ${width === 58 ? "28mm" : "35mm"}; display: block; margin: 0 auto 3px; }
    table { width: 100%; border-collapse: collapse; font-size: inherit; }
    .th-desc { text-align: left; }
    .th-qty  { text-align: center; width: 18px; }
    .th-up   { text-align: right; width: 46px; }
    .th-tot  { text-align: right; width: 52px; }
    td, th   { padding: 1px 0; vertical-align: top; }
    .totals-row  { display: flex; justify-content: space-between; }
    .grand-total { font-size: ${width === 58 ? "9.5pt" : "10.5pt"}; font-weight: bold; }
    .footer-text { font-size: ${width === 58 ? "5.5pt" : "6pt"}; color: #444; margin-top: 2px; }
    .tag {
      display: inline-block; border: 1px solid #000; padding: 0px 3px;
      font-size: ${width === 58 ? "6.5pt" : "7pt"}; letter-spacing: 0.5px;
    }
  `;
}

// ── Receipt HTML builder ──────────────────────────────────────────────────────

export function buildReceiptHtml(d: ReceiptData): string {
  const locale = getFiscalConfig(d.currencyCode ?? "PEN").dateFormat;
  const dateStr = new Date(d.date).toLocaleDateString(locale, {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const timeStr = new Date(d.date).toLocaleTimeString(locale, {
    hour: "2-digit", minute: "2-digit",
  });

  const payLabel: Record<string, string> = {
    efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia",
    cash: "Cash", card: "Card", pix: "Pix", debito: "Debito", credito: "Credito",
  };

  const docLabel = getDocPrintLabel(d.docType, d.currencyCode ?? "PEN");

  // !! Always compute total from item lines — prevents P.U. vs Total mismatch !!
  const computedTotal = d.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  // Use computed total; fall back to d.total only if no items (e.g. ticket with only labor)
  const grandTotal = d.items.length > 0 ? computedTotal : d.total;

  const rows = d.items.map((i) => `
    <tr>
      <td class="th-desc">${i.name}</td>
      <td class="th-qty" style="text-align:center">${i.qty}</td>
      <td class="th-up">${formatMoneyGlobal(i.unitPrice, d.currencyCode)}</td>
      <td class="th-tot">${formatMoneyGlobal(i.qty * i.unitPrice, d.currencyCode)}</td>
    </tr>
  `).join("");

  const logoHtml = d.showLogo && d.orgLogoUrl
    ? `<img src="${d.orgLogoUrl}" alt="logo" class="logo" />`
    : "";

  // Recalculate tax from grand total for consistency
  const taxAmount = d.showIgv && d.taxPct > 0
    ? grandTotal - (grandTotal / (1 + d.taxPct / 100))
    : 0;
  const subtotalForDisplay = grandTotal - taxAmount;

  // nota_venta: solo muestra el TOTAL, sin desglose de impuesto
  const isNotaVenta = d.docType === "nota_venta" || d.docType === "nota_fiscal" || d.docType === "cupom";
  const taxLine = !isNotaVenta && d.showIgv && d.taxPct > 0 && taxAmount > 0
    ? `<div class="totals-row small">
         <span>${d.taxLabel} (${d.taxPct}%)</span>
         <span>${formatMoneyGlobal(taxAmount, d.currencyCode)}</span>
       </div>
       <div class="totals-row small">
         <span>Subtotal sin ${d.taxLabel}</span>
         <span>${formatMoneyGlobal(subtotalForDisplay, d.currencyCode)}</span>
       </div>`
    : "";

  const warrantyLine = d.warrantyDays && d.warrantyDays > 0
    ? `<p class="footer-text">Garantia: ${d.warrantyDays} dias desde la fecha de emision.${
        d.warrantyNotes ? ` ${d.warrantyNotes}` : ""
      }</p>`
    : d.warrantyNotes
      ? `<p class="footer-text">Condicion de garantia: ${d.warrantyNotes}</p>`
      : "";

  const notesHtml = d.notes
    ? `<p class="footer-text" style="margin-top:2px">${d.notes.replace(/\n/g, "<br/>")}</p>`
    : "";

  const footerHtml = d.footer
    ? `<p class="center bold small" style="margin-top:4px">${d.footer}</p>`
    : "";

  const customerTaxLine = d.customerTaxId
    ? `<p class="small">${d.orgTaxLabel ?? getFiscalConfig(d.currencyCode ?? "PEN").taxIdLabel} cliente: ${d.customerTaxId}</p>`
    : "";

  return `
    <div class="receipt">
      ${logoHtml}
      <p class="center bold">${d.orgName.toUpperCase()}</p>
      ${d.orgAddress ? `<p class="center small">${d.orgAddress}</p>` : ""}
      ${d.orgPhone ? `<p class="center small">Tel: ${d.orgPhone}</p>` : ""}
      ${d.orgTaxId ? `<p class="center small">${d.orgTaxLabel ?? "RUC"}: ${d.orgTaxId}</p>` : ""}

      <hr class="divider" />

      <p class="center large">${docLabel}</p>
      <p class="center tag">${d.docNumber}</p>

      <hr class="divider" />

      <p class="small">Fecha: ${dateStr}  ${timeStr}</p>
      <p class="small">Cliente: <span class="bold">${d.customerName}</span></p>
      ${customerTaxLine}
      ${d.customerPhone ? `<p class="small">Tel: ${d.customerPhone}</p>` : ""}
      ${d.paymentMethod ? `<p class="small">Pago: ${payLabel[d.paymentMethod] ?? d.paymentMethod}</p>` : ""}

      <hr class="divider" />

      <table>
        <thead>
          <tr class="small">
            <th class="th-desc">Descripcion</th>
            <th class="th-qty">Und</th>
            <th class="th-up">P.U.</th>
            <th class="th-tot">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <hr class="divider" />

      ${taxLine}
      <div class="totals-row grand-total">
        <span>TOTAL</span>
        <span>${formatMoneyGlobal(grandTotal, d.currencyCode)}</span>
      </div>

      <hr class="divider" />

      ${warrantyLine}
      ${notesHtml}
      ${d.trackingQrSvg ? `
      <hr class="divider" />
      <div class="center" style="padding:4px 0 2px">
        <p class="small" style="margin-bottom:3px">Sigue tu reparación:</p>
        <div style="display:inline-block;background:#fff;padding:4px;border-radius:4px">
          ${d.trackingQrSvg}
        </div>
        ${d.trackingUrl ? `<p style="font-size:7px;margin-top:2px;word-break:break-all;color:#666">${d.trackingUrl}</p>` : ""}
      </div>` : ""}
      ${footerHtml}

      <p class="center small" style="margin-top:6px">* * * Gracias por su compra * * *</p>
    </div>
  `;
}

// ── Print utility ─────────────────────────────────────────────────────────────

function printViaIframe(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 300);
}

export function printReceipt(data: ReceiptData) {
  const popupW = data.printWidth === 58 ? 252 : 334; // px equivalente a 58mm/80mm @96dpi + margen
  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${getDocPrintLabel(data.docType, data.currencyCode ?? "PEN")}</title>
        <style>${buildReceiptCss(data.printWidth)}</style>
      </head>
      <body><div class="paper-wrap">${buildReceiptHtml(data)}</div></body>
    </html>
  `;
  const win = window.open("", "_blank", `width=${popupW},height=700,toolbar=0,menubar=0,scrollbars=yes`) as unknown as Window | null;
  if (!win) {
    printViaIframe(fullHtml);
    return;
  }
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

// ── Share as PDF utility ──────────────────────────────────────────────────────

export async function shareReceiptAsPdf(data: ReceiptData) {
  return new Promise<void>((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    
    // Pixel sizes for perfectly crisp canvas capture without font/border overlaps
    const baseW = data.printWidth === 58 ? 320 : 450;
    
    iframe.style.width = `${baseW + 40}px`;
    iframe.style.height = "2500px";
    iframe.style.left = "-9999px";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return reject(new Error("No se pudo crear el iframe de captura"));
    }

    doc.open();
    // Use pixel-based custom CSS instead of the relative pt/mm CSS to ensure 100% stable capture
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 13px; 
              line-height: 1.25;
              background: #fff; 
              color: #000;
              width: ${baseW}px;
              padding: 15px; 
            }
            .receipt { width: 100%; display: flex; flex-direction: column; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .small { font-size: 11px; }
            .large { font-size: 16px; font-weight: bold; }
            .divider {
              border: none;
              border-top: 1px dashed #000;
              margin: 8px 0;
              height: 1px;
            }
            .logo { max-width: 100%; max-height: 120px; display: block; margin: 0 auto 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 4px 0; }
            .th-desc { text-align: left; }
            .th-qty { text-align: center; width: 35px; }
            .th-up { text-align: right; width: 65px; }
            .th-tot { text-align: right; width: 75px; }
            td, th { padding: 4px 0; vertical-align: top; }
            .totals-row { display: flex; justify-content: space-between; align-items: center; margin: 3px 0; }
            .grand-total { font-size: 15px; font-weight: bold; margin: 8px 0; }
            .footer-text { font-size: 10px; color: #444; margin-top: 6px; }
            .tag {
              display: inline-block;
              border: 1px solid #000;
              padding: 2px 6px;
              font-size: 12px;
              line-height: 1.1;
              letter-spacing: 0.5px;
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div id="capture">${buildReceiptHtml(data)}</div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(async () => {
      try {
        const html2canvas = (await import("html2canvas")).default;
        const { jsPDF } = await import("jspdf");
        
        const captureDiv = doc.getElementById("capture");
        if (!captureDiv) throw new Error("No se encontro el contenedor a capturar");

        const canvas = await html2canvas(captureDiv, {
          scale: 3, // high res canvas
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: baseW + 40,
        });

        document.body.removeChild(iframe);

        // PDF matches paper sizes (58mm or 80mm width) exactly 
        const pdfWidthMm = data.printWidth; 
        const pdfHeightMm = (canvas.height * pdfWidthMm) / canvas.width;

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [pdfWidthMm, pdfHeightMm]
        });

        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidthMm, pdfHeightMm);

        const pdfBlob = pdf.output("blob");
        if (!pdfBlob) throw new Error("No se pudo generar el PDF");

        const file = new File([pdfBlob], `comprobante_${data.docNumber}.pdf`, { type: "application/pdf" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: "Comprobante",
              text: "Adjunto el comprobante generado.",
              files: [file],
            });
            return resolve();
          } catch (err: any) {
            if (err.name !== "AbortError") console.error("Error compartiendo archivo", err);
            if (err.name === "AbortError") return resolve();
          }
        }

        // Fallback download if no Native Share
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);

        resolve();
      } catch (err) {
        document.body.removeChild(iframe);
        reject(err);
      }
    }, 800);
  });
}

// ── A4 Receipt CSS ────────────────────────────────────────────────────────────

export function buildA4Css(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; background: #e5e7eb; }
    body { display: flex; justify-content: center; padding: 24px; min-height: 100vh; }

    .page {
      background: #fff;
      width: 210mm;
      padding: 18mm 20mm 20mm;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      position: relative;
    }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10mm; padding-bottom: 6mm; margin-bottom: 6mm; border-bottom: 2pt solid #111; }
    .org-block { flex: 1; }
    .org-logo { max-height: 22mm; max-width: 55mm; margin-bottom: 3mm; display: block; mix-blend-mode: multiply; }
    .org-name { font-size: 13pt; font-weight: 700; margin-bottom: 1.5mm; }
    .org-meta { font-size: 8pt; color: #555; line-height: 1.7; }
    .doc-block { text-align: right; min-width: 65mm; border: 1.5pt solid #111; border-radius: 2mm; padding: 4mm 5mm; }
    .doc-type { font-size: 13pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2mm; }
    .doc-number { font-family: 'Courier New', monospace; font-size: 10pt; font-weight: 600; background: #f3f4f6; padding: 1.5mm 3mm; border-radius: 1mm; display: inline-block; margin-bottom: 2mm; }
    .doc-date { font-size: 8pt; color: #555; }
    .pay-badge { display: inline-block; background: #dcfce7; color: #15803d; border: 0.5pt solid #86efac; padding: 1mm 3mm; border-radius: 20mm; font-size: 7.5pt; font-weight: 600; margin-top: 2mm; }

    /* Customer */
    .customer-section { margin-bottom: 6mm; }
    .section-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.7px; color: #888; font-weight: 700; margin-bottom: 1.5mm; }
    .customer-box { border: 0.5pt solid #d1d5db; border-radius: 2mm; padding: 3.5mm 5mm; background: #f9fafb; }
    .customer-name { font-size: 11pt; font-weight: 600; margin-bottom: 1mm; }
    .customer-meta { font-size: 8.5pt; color: #555; line-height: 1.6; }

    /* Items table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; font-size: 9pt; }
    thead tr { background: #111; color: #fff; }
    thead th { padding: 2.5mm 3mm; font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
    thead th.r { text-align: right; }
    thead th.c { text-align: center; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 2.5mm 3mm; border-bottom: 0.5pt solid #e5e7eb; vertical-align: top; }
    tbody td.r { text-align: right; }
    tbody td.c { text-align: center; }
    tbody td.num { font-family: 'Courier New', monospace; }

    /* Totals */
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 7mm; }
    .totals-box { width: 80mm; }
    .totals-row { display: flex; justify-content: space-between; align-items: center; padding: 2mm 0; border-bottom: 0.5pt solid #e5e7eb; font-size: 9pt; }
    .totals-label { color: #555; }
    .totals-val { font-family: 'Courier New', monospace; font-weight: 500; }
    .total-grand { display: flex; justify-content: space-between; align-items: center; padding: 3mm 4mm; background: #111; color: #fff; border-radius: 1.5mm; margin-top: 2mm; font-size: 12pt; font-weight: 700; }
    .total-grand .val { font-family: 'Courier New', monospace; }

    /* Footer */
    .footer { border-top: 0.5pt solid #d1d5db; padding-top: 5mm; font-size: 8.5pt; color: #555; }
    .warranty-box { border: 1pt solid #111; border-radius: 2mm; padding: 3mm 5mm; margin-bottom: 3mm; }
    .warranty-title { font-weight: 700; font-size: 9pt; margin-bottom: 1mm; color: #111; }
    .footer-notes { margin-bottom: 2mm; line-height: 1.5; }
    .footer-center { text-align: center; color: #888; font-size: 8pt; margin-top: 4mm; border-top: 0.5pt dashed #d1d5db; padding-top: 3mm; }

    @page { size: auto; margin: 10mm 15mm; }
    @media print {
      html, body { background: #fff !important; padding: 0; margin: 0; display: block; min-height: unset; height: auto; }
      .page { box-shadow: none; width: 100%; padding: 0; }
    }
  `;
}

// ── A4 Receipt HTML ───────────────────────────────────────────────────────────

export function buildA4Html(d: ReceiptData): string {
  const locale = getFiscalConfig(d.currencyCode ?? "PEN").dateFormat;
  const dateStr = new Date(d.date).toLocaleDateString(locale, {
    day: "2-digit", month: "long", year: "numeric",
  });

  const payLabel: Record<string, string> = {
    efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia",
    cash: "Cash", card: "Card", pix: "Pix", debito: "Debito", credito: "Credito",
  };

  const docLabel = getDocPrintLabel(d.docType, d.currencyCode ?? "PEN");
  const computedTotal = d.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const grandTotal = d.items.length > 0 ? computedTotal : d.total;

  const taxAmount = d.showIgv && d.taxPct > 0
    ? grandTotal - grandTotal / (1 + d.taxPct / 100)
    : 0;
  const subtotalForDisplay = grandTotal - taxAmount;
  const isNotaVenta = ["nota_venta", "nota_fiscal", "cupom"].includes(d.docType);

  const rows = d.items.map((item, idx) => `
    <tr>
      <td class="c">${idx + 1}</td>
      <td>${item.name}</td>
      <td class="c">${item.qty}</td>
      <td class="r num">${formatMoneyGlobal(item.unitPrice, d.currencyCode)}</td>
      <td class="r num">${formatMoneyGlobal(item.qty * item.unitPrice, d.currencyCode)}</td>
    </tr>
  `).join("");

  const logoHtml = d.showLogo && d.orgLogoUrl
    ? `<img src="${d.orgLogoUrl}" alt="logo" class="org-logo" />`
    : "";

  const taxRows = !isNotaVenta && d.showIgv && d.taxPct > 0 && taxAmount > 0
    ? `
      <div class="totals-row">
        <span class="totals-label">Subtotal</span>
        <span class="totals-val">${formatMoneyGlobal(subtotalForDisplay, d.currencyCode)}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">${d.taxLabel} (${d.taxPct}%)</span>
        <span class="totals-val">${formatMoneyGlobal(taxAmount, d.currencyCode)}</span>
      </div>`
    : "";

  const customerTaxLine = d.customerTaxId
    ? `${d.orgTaxLabel ?? getFiscalConfig(d.currencyCode ?? "PEN").taxIdLabel}: ${d.customerTaxId}`
    : "";

  return `
    <div class="page">
      <div class="header">
        <div class="org-block">
          ${logoHtml}
          <div class="org-name">${d.orgName.toUpperCase()}</div>
          <div class="org-meta">
            ${d.orgAddress ? `${d.orgAddress}<br/>` : ""}
            ${d.orgPhone ? `Tel: ${d.orgPhone}<br/>` : ""}
            ${d.orgTaxId ? `${d.orgTaxLabel ?? "RUC"}: ${d.orgTaxId}` : ""}
          </div>
        </div>
        <div class="doc-block">
          <div class="doc-type">${docLabel}</div>
          <div class="doc-number">${d.docNumber}</div>
          <div class="doc-date">Fecha: ${dateStr}</div>
          ${d.paymentMethod ? `<div><span class="pay-badge">&#10003; ${payLabel[d.paymentMethod] ?? d.paymentMethod}</span></div>` : ""}
        </div>
      </div>

      <div class="customer-section">
        <div class="section-label">Facturado a</div>
        <div class="customer-box">
          <div class="customer-name">${d.customerName}</div>
          <div class="customer-meta">
            ${d.customerPhone ? `Tel: ${d.customerPhone}` : ""}
            ${customerTaxLine ? `${d.customerPhone ? " &bull; " : ""}${customerTaxLine}` : ""}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="c" style="width:8mm">#</th>
            <th>Descripcion</th>
            <th class="c" style="width:15mm">Und.</th>
            <th class="r" style="width:30mm">P. Unitario</th>
            <th class="r" style="width:30mm">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals-box">
          ${taxRows}
          <div class="total-grand">
            <span>TOTAL</span>
            <span class="val">${formatMoneyGlobal(grandTotal, d.currencyCode)}</span>
          </div>
        </div>
      </div>

      <div class="footer">
        ${d.warrantyDays && d.warrantyDays > 0 ? `
        <div class="warranty-box">
          <div class="warranty-title">Garantia: ${d.warrantyDays} dias desde la fecha de emision</div>
          ${d.warrantyNotes ? `<div>${d.warrantyNotes}</div>` : ""}
        </div>` : ""}
        ${d.notes ? `<div class="footer-notes">${d.notes.replace(/\n/g, "<br/>")}</div>` : ""}
        ${d.footer ? `<div class="footer-notes" style="font-weight:600;text-align:center;">${d.footer}</div>` : ""}
        <div class="footer-center">Gracias por su preferencia &bull; ${d.orgName}</div>
      </div>
    </div>
  `;
}

// ── A4 Print utility ──────────────────────────────────────────────────────────

export function printReceiptA4(data: ReceiptData) {
  const fullHtml = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${getDocPrintLabel(data.docType, data.currencyCode ?? "PEN")}</title>
        <style>${buildA4Css()}</style>
      </head>
      <body>${buildA4Html(data)}</body>
    </html>`;
  const win = window.open("", "_blank", "width=860,height=700,toolbar=0,menubar=0,scrollbars=yes") as unknown as Window | null;
  if (!win) {
    printViaIframe(fullHtml);
    return;
  }
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

// ── DocTypeSelector Dialog ────────────────────────────────────────────────────

export interface DocSelectorDialogProps {
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
  /** Currency code from org config — drives which doc types to show */
  currencyCode?: string;
  // Pre-filled info
  defaultCustomerName?: string;
  defaultCustomerPhone?: string;
  defaultCustomerId?: string;
  clientes?: { id: string; full_name: string; phone: string | null; document_id: string | null }[];
  onAction: (action: "print" | "print_a4" | "share" | "link", docType: string, customerName: string, customerPhone: string, customerTaxId: string) => void;
  onSkip?: () => void;
  total:         number;
  currencySymbol: string;
  /** When true, hides doc types that require tax IDs and are invoice-type */
  cashOnly?: boolean;
  /**
   * Cuando true, el ticket fue creado con cliente anonimo (sin registro).
   * Bloquea los tipos de documento que requieren tax ID (Factura) y
   * fuerza el modo cliente a 'guest'.
   */
  isGuestTicket?: boolean;
}

type CustomerMode = "registered" | "guest";

const DOC_ICONS: Record<FiscalDocType["icon"], typeof faReceipt> = {
  receipt: faReceipt,
  invoice: faFileInvoice,
  note:    faFileLines,
};

export function DocSelectorDialog({
  open, onOpenChange,
  currencyCode = "PEN",
  defaultCustomerName = "",
  defaultCustomerPhone = "",
  defaultCustomerId = "",
  clientes = [],
  onAction,
  onSkip,
  total,
  currencySymbol,
  cashOnly = false,
  isGuestTicket = false,
}: DocSelectorDialogProps) {
  const fiscalCfg = getFiscalConfig(currencyCode);

  // Si el ticket es anonimo, excluir tipos que requieran tax ID (Factura)
  const availableDocs = fiscalCfg.docTypes.filter(d => {
    if (cashOnly && d.requiresTaxId) return false;
    if (isGuestTicket && d.requiresTaxId) return false;
    return true;
  });

  const [docType, setDocType]               = React.useState<string>(availableDocs[0]?.value ?? "nota_venta");
  const [custMode, setCustMode]             = React.useState<CustomerMode>(
    isGuestTicket ? "guest"
    : defaultCustomerId ? "registered" : "guest"
  );
  const [custId,          setCustId]        = React.useState(isGuestTicket ? "" : defaultCustomerId);
  const [guestFirstName,  setGuestFirstName]= React.useState(defaultCustomerName);
  const [guestLastName,   setGuestLastName] = React.useState("");
  const [guestPhone,      setGuestPhone]    = React.useState(defaultCustomerPhone);
  const [guestTaxId,      setGuestTaxId]    = React.useState("");

  // Reset when dialog opens
  React.useEffect(() => {
    if (!open) return;
    const firstDoc = availableDocs[0]?.value ?? "nota_venta";
    setDocType(firstDoc);
    setCustMode(
      isGuestTicket ? "guest"
      : defaultCustomerId ? "registered" : "guest"
    );
    setCustId(isGuestTicket ? "" : defaultCustomerId);
    setGuestFirstName(defaultCustomerName);
    setGuestLastName("");
    setGuestPhone(defaultCustomerPhone);
    setGuestTaxId("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedDocConfig = availableDocs.find(d => d.value === docType);
  const selectedCliente   = clientes.find(c => c.id === custId);

  const effectiveName =
    custMode === "registered" ? (selectedCliente?.full_name ?? fiscalCfg.consumerFinalLabel) :
    custMode === "guest"      ? ([guestFirstName.trim(), guestLastName.trim()].filter(Boolean).join(" ") || fiscalCfg.consumerFinalLabel) :
                                 fiscalCfg.consumerFinalLabel;

  const effectivePhone =
    custMode === "registered" ? (selectedCliente?.phone ?? "") :
    custMode === "guest"      ? guestPhone.trim() :
                                 "";

  const effectiveTaxId =
    custMode === "registered" ? (selectedCliente?.document_id ?? "") :
    custMode === "guest"      ? guestTaxId.trim() :
                                 "";

  const needsTaxId  = selectedDocConfig?.requiresTaxId ?? false;
  const canPrint    = !needsTaxId || effectiveTaxId.length >= 7;
  const canWhatsApp = !!effectivePhone.replace(/\D/g, "").slice(-7);

  const [isSharing, setIsSharing] = React.useState(false);
  const [printFormat, setPrintFormat] = React.useState<"thermal" | "a4">("thermal");

  const handlePrint = () => {
    onAction(
      printFormat === "a4" ? "print_a4" : "print",
      docType, effectiveName, effectivePhone, effectiveTaxId
    );
    onOpenChange(false);
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await onAction("share", docType, effectiveName, effectivePhone, effectiveTaxId);
    } finally {
      setIsSharing(false);
      onOpenChange(false);
    }
  };

  const customerModes: { id: CustomerMode; label: string }[] = [
    ...(!isGuestTicket && clientes.length > 0 ? [{ id: "registered" as CustomerMode, label: "Registrado" }] : []),
    { id: "guest" as CustomerMode, label: fiscalCfg.guestLabel },
  ];


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FaIcon icon={faPrint} size={15} />
            Generar comprobante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* ── Tipo de documento ── */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Tipo de comprobante
              <span className="ml-2 text-[10px] font-normal opacity-60">
                {fiscalCfg.countryName}
              </span>
            </Label>
            <div className="grid gap-2">
              {availableDocs.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDocType(d.value)}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                    docType === d.value
                      ? "border-primary bg-primary/8 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/40 bg-card/40"
                  }`}
                >
                  <FaIcon
                    icon={DOC_ICONS[d.icon]}
                    size={15}
                    className={docType === d.value ? "text-primary" : "text-muted-foreground"}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{d.label}</p>
                    <p className="text-xs text-muted-foreground">{d.desc}</p>
                  </div>
                  {d.requiresTaxId && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                      {fiscalCfg.taxIdLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Cliente ── */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Cliente en el comprobante
            </Label>

            {/* Mode tabs */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
              {customerModes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCustMode(m.id)}
                  className={`flex-1 py-2 transition-colors ${
                    custMode === m.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Registered */}
            {custMode === "registered" && !isGuestTicket && (
              <ClientCombobox
                clientes={clientes.map(c => ({ id: c.id, full_name: c.full_name, phone: c.phone }))}
                value={custId}
                onChange={setCustId}
                placeholder="Buscar cliente registrado..."
              />
            )}

            {/* Aviso si es ticket anonimo */}
            {isGuestTicket && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <span className="text-amber-500 text-xs mt-0.5">⚠</span>
                <p className="text-xs text-amber-600">
                  Ticket sin cliente registrado — la <strong>Factura</strong> no esta disponible.
                  Para emitir factura, el cliente debe estar registrado con su {fiscalCfg.taxIdLabel}.
                </p>
              </div>
            )}

            {/* Guest */}
            {custMode === "guest" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre(s)</Label>
                    <Input
                      placeholder="Carlos"
                      value={guestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Apellido(s)</Label>
                    <Input
                      placeholder="Pérez"
                      value={guestLastName}
                      onChange={(e) => setGuestLastName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono (WhatsApp)</Label>
                  <PhoneInput
                    value={guestPhone}
                    onChange={setGuestPhone}
                    placeholder="999 999 999"
                    defaultDialCode={CURRENCY_TO_DIAL[currencyCode] ?? "+51"}
                  />
                </div>
                {needsTaxId && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {fiscalCfg.taxIdLabel} del cliente *
                    </Label>
                    <Input
                      placeholder={fiscalCfg.taxIdLength ? `${fiscalCfg.taxIdLength} digitos` : `${fiscalCfg.taxIdLabel}...`}
                      value={guestTaxId}
                      onChange={(e) => setGuestTaxId(e.target.value)}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {/* anonymous no se usa con el nuevo tipo CustomerMode */}

            {/* Tax ID warning for registered client with no tax id */}
            {needsTaxId && custMode === "registered" && !effectiveTaxId && (
              <p className="text-xs text-amber-500">
                El cliente no tiene {fiscalCfg.taxIdLabel} registrado. Cambia a otro tipo o ingresalo manualmente.
              </p>
            )}
          </div>

          {/* Total preview */}
          <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border/50 px-4 py-2.5">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="font-bold font-mono text-lg">{formatMoneyGlobal(total, currencyCode)}</span>
          </div>

          {/* Formato de impresión */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Formato de impresión
            </Label>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
              <button
                type="button"
                onClick={() => setPrintFormat("thermal")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                  printFormat === "thermal"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <FaIcon icon={faReceipt} size={11} />
                Ticket térmico
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("a4")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                  printFormat === "a4"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <FaIcon icon={faFileLines} size={11} />
                Hoja A4
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <div className="flex flex-1 justify-start">
            {onSkip && (
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => { onSkip(); onOpenChange(false); }}>
                Omitir
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {/* Botón Compartir PDF/Descargar */}
            <Button
              variant="outline"
              onClick={handleShare}
              disabled={!canPrint || isSharing}
              className="gap-2 shrink-0"
            >
              <FaIcon icon={faShareNodes} size={13} />
              Compartir PDF
            </Button>
            {/* Botón Imprimir */}
            <Button
              onClick={handlePrint}
              disabled={!canPrint || isSharing}
              className="gap-2"
            >
              <FaIcon icon={printFormat === "a4" ? faFileLines : faPrint} size={13} />
              {printFormat === "a4" ? "Imprimir A4" : `Imprimir ${selectedDocConfig?.shortLabel ?? docType}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

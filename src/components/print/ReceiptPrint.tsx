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
  faPrint, faFileInvoice, faReceipt, faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import {
  getFiscalConfig, getDocPrintLabel,
  formatNumberGlobal, formatMoneyGlobal,
  type FiscalDocType,
} from "@/lib/fiscalConfig";

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
  notes?:      string | null;
  footer?:     string | null;
  warrantyDays?: number | null;
}

// ── CSS for thermal printer ────────────────────────────────────────────────────

function buildReceiptCss(width: 58 | 80): string {
  const mmWidth = `${width}mm`;
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${width === 58 ? "7.5pt" : "8pt"};
      color: #000;
      background: #fff;
      width: ${mmWidth};
    }
    @page {
      size: ${mmWidth} auto;
      margin: 3mm 2mm;
    }
    .receipt { width: 100%; }
    .center  { text-align: center; }
    .right   { text-align: right; }
    .bold    { font-weight: bold; }
    .small   { font-size: ${width === 58 ? "6pt" : "6.5pt"}; }
    .large   { font-size: ${width === 58 ? "10pt" : "11pt"}; font-weight: bold; }
    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 3px 0;
    }
    .logo { max-width: 100%; max-height: ${width === 58 ? "28mm" : "35mm"}; display: block; margin: 0 auto 3px; }
    table { width: 100%; border-collapse: collapse; font-size: inherit; }
    .th-desc { text-align: left; }
    .th-qty  { text-align: center; width: 18px; }
    .th-up   { text-align: right; width: 46px; }
    .th-tot  { text-align: right; width: 52px; }
    td, th   { padding: 1px 0; vertical-align: top; }
    .totals-row { display: flex; justify-content: space-between; }
    .totals-label { }
    .totals-val   { font-weight: bold; }
    .grand-total  { font-size: ${width === 58 ? "9.5pt" : "10.5pt"}; font-weight: bold; }
    .footer-text  { font-size: ${width === 58 ? "5.5pt" : "6pt"}; color: #444; margin-top: 2px; }
    .tag  {
      display: inline-block;
      border: 1px solid #000;
      padding: 0px 3px;
      font-size: ${width === 58 ? "6.5pt" : "7pt"};
      letter-spacing: 0.5px;
    }
  `;
}

// ── Receipt HTML builder ──────────────────────────────────────────────────────

function buildReceiptHtml(d: ReceiptData): string {
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
      <td class="th-up">${formatNumberGlobal(i.unitPrice, d.currencyCode)}</td>
      <td class="th-tot">${formatNumberGlobal(i.qty * i.unitPrice, d.currencyCode)}</td>
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

  const taxLine = d.showIgv && d.taxPct > 0 && taxAmount > 0
    ? `<div class="totals-row small">
         <span>${d.taxLabel} (${d.taxPct}%)</span>
         <span>${formatNumberGlobal(taxAmount, d.currencyCode)}</span>
       </div>
       <div class="totals-row small">
         <span>Subtotal sin ${d.taxLabel}</span>
         <span>${formatNumberGlobal(subtotalForDisplay, d.currencyCode)}</span>
       </div>`
    : "";

  const warrantyLine = d.warrantyDays && d.warrantyDays > 0
    ? `<p class="footer-text">Garantia: ${d.warrantyDays} dias desde la fecha de emision.</p>`
    : "";

  const notesHtml = d.notes
    ? `<p class="footer-text" style="margin-top:2px">${d.notes.replace(/\n/g, "<br/>")}</p>`
    : "";

  const footerHtml = d.footer
    ? `<p class="center bold small" style="margin-top:4px">${d.footer}</p>`
    : "";

  const customerTaxLine = d.customerTaxId
    ? `<p class="small">${d.orgTaxLabel ?? "RUC"} cliente: ${d.customerTaxId}</p>`
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
        <span>${formatNumberGlobal(grandTotal, d.currencyCode)}</span>
      </div>

      <hr class="divider" />

      ${warrantyLine}
      ${notesHtml}
      ${footerHtml}

      <p class="center small" style="margin-top:6px">* * * Gracias por su compra * * *</p>
    </div>
  `;
}

// ── Print utility ─────────────────────────────────────────────────────────────

export function printReceipt(data: ReceiptData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window.open("", "_blank", "width=360,height=600,toolbar=0,menubar=0") as any;
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${getDocPrintLabel(data.docType, data.currencyCode ?? "PEN")}</title>
        <style>${buildReceiptCss(data.printWidth)}</style>
      </head>
      <body>${buildReceiptHtml(data)}</body>
    </html>
  `);
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
  onPrint: (docType: string, customerName: string, customerPhone: string, customerTaxId: string) => void;
  onSkip?: () => void;
  total:         number;
  currencySymbol: string;
  /** When true, hides doc types that require tax IDs and are invoice-type */
  cashOnly?: boolean;
}

type CustomerMode = "registered" | "guest" | "anonymous";

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
  onPrint,
  onSkip,
  total,
  currencySymbol,
  cashOnly = false,
}: DocSelectorDialogProps) {
  const fiscalCfg = getFiscalConfig(currencyCode);

  // Determine available doc types
  const availableDocs = cashOnly
    ? fiscalCfg.docTypes.filter(d => !d.requiresTaxId)
    : fiscalCfg.docTypes;

  const [docType, setDocType]       = React.useState<string>(availableDocs[0]?.value ?? "factura");
  const [custMode, setCustMode]     = React.useState<CustomerMode>(
    defaultCustomerId ? "registered" : defaultCustomerName ? "guest" : "anonymous"
  );
  const [custId,     setCustId]     = React.useState(defaultCustomerId);
  const [guestName,  setGuestName]  = React.useState(defaultCustomerName);
  const [guestPhone, setGuestPhone] = React.useState(defaultCustomerPhone);
  const [guestTaxId, setGuestTaxId] = React.useState("");

  // Reset when dialog opens
  React.useEffect(() => {
    if (!open) return;
    const firstDoc = availableDocs[0]?.value ?? "factura";
    setDocType(firstDoc);
    setCustMode(defaultCustomerId ? "registered" : defaultCustomerName ? "guest" : "anonymous");
    setCustId(defaultCustomerId);
    setGuestName(defaultCustomerName);
    setGuestPhone(defaultCustomerPhone);
    setGuestTaxId("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedDocConfig = availableDocs.find(d => d.value === docType);
  const selectedCliente   = clientes.find(c => c.id === custId);

  const effectiveName =
    custMode === "registered" ? (selectedCliente?.full_name ?? fiscalCfg.consumerFinalLabel) :
    custMode === "guest"      ? (guestName.trim() || fiscalCfg.consumerFinalLabel) :
                                 fiscalCfg.consumerFinalLabel;

  const effectivePhone =
    custMode === "registered" ? (selectedCliente?.phone ?? "") :
    custMode === "guest"      ? guestPhone.trim() :
                                 "";

  const effectiveTaxId =
    custMode === "registered" ? (selectedCliente?.document_id ?? "") :
    custMode === "guest"      ? guestTaxId.trim() :
                                 "";

  const needsTaxId = selectedDocConfig?.requiresTaxId ?? false;
  const canPrint   = !needsTaxId || effectiveTaxId.length >= 7;

  const handlePrint = () => {
    onPrint(docType, effectiveName, effectivePhone, effectiveTaxId);
    onOpenChange(false);
  };

  const customerModes: { id: CustomerMode; label: string }[] = [
    ...(clientes.length > 0 ? [{ id: "registered" as CustomerMode, label: "Registrado" }] : []),
    { id: "guest"     as CustomerMode, label: fiscalCfg.guestLabel },
    { id: "anonymous" as CustomerMode, label: fiscalCfg.consumerFinalLabel },
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
            {custMode === "registered" && (
              <Select value={custId} onValueChange={setCustId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} {c.phone ? `· ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Guest */}
            {custMode === "guest" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      placeholder="Carlos Perez"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefono</Label>
                    <Input
                      placeholder="+51 999 999 999"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
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

            {/* Anonymous */}
            {custMode === "anonymous" && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border/50">
                El comprobante se emitira a nombre de <strong>{fiscalCfg.consumerFinalLabel}</strong> sin datos adicionales.
              </p>
            )}

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
        </div>

        <DialogFooter className="gap-2">
          {onSkip && (
            <Button variant="ghost" onClick={() => { onSkip(); onOpenChange(false); }}>
              Omitir
            </Button>
          )}
          <Button
            onClick={handlePrint}
            disabled={!canPrint}
            className="gap-2"
          >
            <FaIcon icon={faPrint} size={13} />
            Imprimir {selectedDocConfig?.shortLabel ?? docType}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

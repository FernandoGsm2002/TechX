/**
 * Nota de Servicio — impresión para Otros Servicios.
 * Solo genera nota interna, NO es comprobante fiscal.
 */
import { formatMoneyGlobal, getFiscalConfig } from "@/lib/fiscalConfig";

type OrgForPrint = {
  name: string;
  phone?: string | null;
  address?: string | null;
  tax_id_number?: string | null;
  tax_id_name?: string | null;
  currency_code: string;
  warranty_days?: number | null;
  otros_servicios_warranty_days?: number | null;
  receipt_notes?: string | null;
  receipt_footer?: string | null;
  logo_url?: string | null;
  show_logo_on_print?: boolean | null;
} | null;

function resolveTagLabel(tag: string): string {
  return tag.replace("custom:", "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function printOtroServicioNota(servicio: any, org: OrgForPrint, opts?: { trackingQrSvg?: string; trackingUrl?: string }) {
  const currency = org?.currency_code ?? "PEN";
  const fmt = (n: number) => formatMoneyGlobal(n, currency);

  const now = new Date();
  const locale = getFiscalConfig(currency).dateFormat;
  const dateStr = now.toLocaleDateString(locale, {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const tagsArr: string[] = Array.isArray(servicio.tags) ? servicio.tags : [];
  const clientName = servicio.guest_name ?? servicio.customers?.full_name ?? "Consumidor Final";
  const clientPhone = servicio.guest_phone ?? servicio.customers?.phone ?? null;
  const warrantyDays: number = servicio.warranty_days ?? org?.otros_servicios_warranty_days ?? 30;

  const showLogo = (org?.show_logo_on_print ?? true) && !!org?.logo_url;

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 11px;
           color: #000; background: #fff; padding: 8px; max-width: 280px; margin: 0 auto; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .separator { border-top: 1px dashed #555; margin: 6px 0; }
    .label { color: #444; }
    .tag-chip { display: inline-block; border: 1px solid #ccc;
                border-radius: 3px; padding: 1px 4px; margin: 1px; font-size: 10px; }
    .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px;
             font-size: 10px; font-weight: bold; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-pending { background: #fef9c3; color: #854d0e; }
    .warranty-box { border: 1px solid #000; padding: 5px 8px; margin: 6px 0;
                    border-radius: 3px; text-align: center; }
    .org-logo { max-width: 120px; max-height: 60px; object-fit: contain; margin: 0 auto 4px; display: block; }
    @media print { body { padding: 0; } @page { margin: 4mm; } }
  `;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Nota de Servicio ${servicio.order_number ?? ""}</title>
  <style>${css}</style>
</head>
<body>
  <div class="center">
    ${showLogo ? `<img src="${org!.logo_url}" alt="logo" class="org-logo" />` : ""}
    <div class="bold" style="font-size:14px;">${org?.name ?? "TechX"}</div>
    ${org?.address ? `<div>${org.address}</div>` : ""}
    ${org?.phone ? `<div>Tel: ${org.phone}</div>` : ""}
    ${org?.tax_id_number ? `<div>${org.tax_id_name ?? getFiscalConfig(currency).taxIdLabel}: ${org.tax_id_number}</div>` : ""}
  </div>
  <div class="separator"></div>
  <div class="center">
    <div class="bold">NOTA DE SERVICIO</div>
    ${servicio.order_number ? `<div class="bold">${servicio.order_number}</div>` : ""}
    <div>${dateStr}</div>
  </div>
  <div class="separator"></div>
  <div><span class="label">Cliente: </span>${clientName}</div>
  ${clientPhone ? `<div><span class="label">Telefono: </span>${clientPhone}</div>` : ""}
  <div class="separator"></div>
  ${(servicio.device_brand || servicio.device_model) ? `
  <div><span class="label">Dispositivo: </span>${[servicio.device_brand, servicio.device_model].filter(Boolean).join(" ")}</div>
  ` : ""}
  ${servicio.imei ? `<div><span class="label">IMEI: </span><span style="font-size:10px;">${servicio.imei}</span></div>` : ""}
  ${servicio.serial ? `<div><span class="label">Serial: </span>${servicio.serial}</div>` : ""}
  <div style="margin: 4px 0;">
    <div class="label" style="margin-bottom:2px;">Servicio(s):</div>
    ${tagsArr.map(t => `<span class="tag-chip">${resolveTagLabel(t)}</span>`).join(" ")}
  </div>
  ${servicio.description ? `<div><span class="label">Detalle: </span>${servicio.description}</div>` : ""}
  <div class="separator"></div>
  <div class="total-row">
    <span>Total</span>
    <span>${fmt(servicio.price ?? 0)}</span>
  </div>
  <div class="row">
    <span class="label">Pago:</span>
    <span class="badge ${servicio.paid ? "badge-paid" : "badge-pending"}">${servicio.paid ? "PAGADO" : "PENDIENTE"}</span>
  </div>
  ${servicio.payment_method ? `<div class="row"><span class="label">Metodo:</span><span>${servicio.payment_method}</span></div>` : ""}
  ${warrantyDays > 0 ? `
  <div class="separator"></div>
  <div class="warranty-box">
    <div class="bold">Garantia: ${warrantyDays} dias</div>
    ${servicio.warranty_notes ? `<div style="font-size:10px;margin-top:2px;">${servicio.warranty_notes}</div>` : ""}
  </div>` : ""}
  <div class="separator"></div>
  ${opts?.trackingQrSvg ? `
  <div style="text-align:center;padding:4px 0 2px">
    <div style="font-size:9px;margin-bottom:3px;">Sigue tu servicio:</div>
    <div style="display:inline-block;background:#fff;padding:4px;border-radius:4px">${opts.trackingQrSvg}</div>
    ${opts?.trackingUrl ? `<div style="font-size:7px;margin-top:2px;word-break:break-all;color:#666">${opts.trackingUrl}</div>` : ""}
  </div>
  <div class="separator"></div>` : ""}
  ${org?.receipt_notes ? `<div class="center" style="font-size:10px;">${org.receipt_notes}</div>` : ""}
  <div class="center" style="font-size:9px;color:#666;">${org?.receipt_footer ?? "Gracias por su preferencia"}</div>
  <div class="center" style="font-size:8px;color:#999;margin-top:4px;">
    Nota interna de servicio. No es comprobante fiscal.
  </div>
</body>
</html>`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window.open("", "_blank", "width=320,height=600") as any;
  if (!win) {
    // Fallback para Tauri/WebView donde los popups están bloqueados
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
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}

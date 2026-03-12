"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { faPrint, faTag } from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DeviceLabel {
  ticketNumber: string;       // "TK-2026-0042" o ID corto
  customerName: string;       // nombre del cliente o "Walk-in"
  customerPhone?: string | null;
  deviceType: string;         // "Samsung Galaxy A54"
  imei?: string | null;
  issue: string;              // problema reportado (truncado)
  techName?: string | null;   // técnico asignado
  receivedAt: string;         // ISO date string
  status: string;             // estado actual
  orgName: string;            // nombre del taller
  powerOn: boolean;
  hasLock: boolean;
  lockType?: string | null;
}

interface DeviceLabelPrintProps {
  data: DeviceLabel;
  variant?: "button" | "icon";
}

// ── Label CSS (se inyecta en la ventana de impresión) ─────────────────────────
const LABEL_STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Arial Narrow', Arial, sans-serif;
    font-size: 7pt;
    line-height: 1.3;
    color: #000;
    background: #fff;
    width: 100%;
  }
  @page {
    /* Estándar Brother QL / DL labels: 62mm × 29mm, landscape */
    size: 90mm 40mm landscape;
    margin: 1.5mm;
  }
  .label {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 3px;
    border: 0.5pt solid #000;
    padding: 2.5mm 3mm;
    border-radius: 1mm;
  }
  .left { flex: 1; }
  .right {
    width: 55px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-left: 0.5pt dashed #000;
    padding-left: 3px;
    gap: 2px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 0.5pt solid #000;
    padding-bottom: 1.5mm;
    margin-bottom: 1.5mm;
  }
  .ticket-id {
    font-size: 9pt;
    font-weight: bold;
    letter-spacing: 0.5px;
  }
  .org-name {
    font-size: 6pt;
    color: #555;
    text-align: right;
  }
  .date {
    font-size: 6pt;
    color: #555;
    text-align: right;
  }
  .row {
    display: flex;
    gap: 3px;
    margin-bottom: 1px;
    align-items: baseline;
  }
  .lbl {
    font-size: 5.5pt;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    min-width: 28px;
    flex-shrink: 0;
  }
  .val {
    font-size: 7pt;
    font-weight: 600;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: 120px;
  }
  .issue-text {
    font-size: 6pt;
    line-height: 1.2;
    max-height: 14pt;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    color: #333;
    margin-top: 1px;
  }
  .pills {
    display: flex;
    gap: 2px;
    flex-wrap: wrap;
    margin-top: 1.5mm;
  }
  .pill {
    font-size: 5pt;
    padding: 0.5px 3px;
    border: 0.5pt solid #000;
    border-radius: 2px;
    white-space: nowrap;
  }
  .pill-ok { border-color: #22c55e; color: #15803d; }
  .pill-warn { border-color: #f59e0b; color: #b45309; }
  .tech-box {
    font-size: 5.5pt;
    color: #555;
    border-top: 0.5pt dotted #aaa;
    margin-top: 2px;
    padding-top: 1.5mm;
    width: 100%;
  }
  /* Right column (tear-off stub) */
  .stub-id {
    font-size: 8pt;
    font-weight: bold;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    letter-spacing: 1px;
    transform: rotate(180deg);
  }
  .stub-name {
    font-size: 5pt;
    text-align: center;
    word-break: break-all;
    color: #333;
  }
  .stub-date {
    font-size: 5pt;
    color: #888;
    text-align: center;
  }
`;

// ── Helper ─────────────────────────────────────────────────────────────────────

function getStatusLabel(s: string): string {
  const map: Record<string, string> = {
    recibido:   "Recibido",
    en_proceso: "En proceso",
    listo:      "Listo",
    entregado:  "Entregado",
    garantia:   "Garantía",
    cancelado:  "Cancelado",
  };
  return map[s] ?? s;
}

function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DeviceLabelPrint({ data, variant = "button" }: DeviceLabelPrintProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = labelRef.current?.innerHTML;
    if (!content) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window.open("", "_blank", "width=400,height=250,toolbar=0,menubar=0") as any;
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta de Equipo</title>
          <style>${LABEL_STYLE}</style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  };

  const deviceLine = data.deviceType;
  const issueTrunc = data.issue.length > 80 ? data.issue.slice(0, 80) + "…" : data.issue;
  const dateStr = format(new Date(data.receivedAt), "dd/MM/yy", { locale: es });
  const ticketShort = data.ticketNumber || shortId(data.ticketNumber);

  return (
    <>
      {/* Hidden label for print content */}
      <div ref={labelRef} style={{ display: "none" }}>
        <div className="label">
          {/* ── LEFT: Main content ── */}
          <div className="left">
            <div className="header">
              <div>
                <div className="ticket-id">#{ticketShort}</div>
                <div className="org-name">{data.orgName}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="date">{dateStr}</div>
                <div style={{ fontSize: "5.5pt", fontWeight: 600, color: "#1d4ed8" }}>
                  {getStatusLabel(data.status)}
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div className="row">
              <span className="lbl">Cliente</span>
              <span className="val">{data.customerName}</span>
              {data.customerPhone && (
                <span style={{ fontSize: "6pt", color: "#555" }}>· {data.customerPhone}</span>
              )}
            </div>

            {/* Equipo */}
            <div className="row">
              <span className="lbl">Equipo</span>
              <span className="val">{deviceLine}</span>
            </div>

            {/* IMEI */}
            {data.imei && (
              <div className="row">
                <span className="lbl">IMEI</span>
                <span className="val" style={{ fontFamily: "monospace", fontSize: "6pt" }}>
                  {data.imei}
                </span>
              </div>
            )}

            {/* Problema */}
            <div style={{ marginTop: "1.5mm" }}>
              <div className="lbl" style={{ marginBottom: "1px" }}>Falla reportada</div>
              <div className="issue-text">{issueTrunc}</div>
            </div>

            {/* Pills: estado del equipo */}
            <div className="pills">
              <span className={`pill ${data.powerOn ? "pill-ok" : "pill-warn"}`}>
                {data.powerOn ? "✓ Enciende" : "✗ No enciende"}
              </span>
              <span className={`pill ${!data.hasLock ? "pill-ok" : "pill-warn"}`}>
                {data.hasLock
                  ? `🔒 Con clave${data.lockType ? ` (${data.lockType})` : ""}`
                  : "🔓 Sin clave"
                }
              </span>
            </div>

            {/* Técnico */}
            {data.techName && (
              <div className="tech-box">
                Técnico: <strong>{data.techName}</strong>
              </div>
            )}
          </div>

          {/* ── RIGHT: Talón de identificación (para pegar al equipo) ── */}
          <div className="right">
            <div className="stub-id">{ticketShort}</div>
            <div className="stub-name">{data.customerName.split(" ")[0]}</div>
            <div className="stub-date">{dateStr}</div>
          </div>
        </div>
      </div>

      {/* Print button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-dashed"
        onClick={handlePrint}
        title="Imprimir ticket de reparacion"
      >
        <FaIcon icon={faTag} size={12} />
        {variant === "button" && "Ticket de reparacion"}
      </Button>
    </>
  );
}

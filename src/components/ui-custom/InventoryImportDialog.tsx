"use client";

import React, { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download, Loader2, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateInventario } from "@/hooks/useInventario";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemType = "producto" | "repuesto_propio" | "repuesto_comprado";

interface ParsedRow {
  name:       string;
  brand:      string;
  model:      string | null;
  category:   string | null;
  sku:        string | null;
  quantity:   number;
  cost_price: number | null;
  sell_price: number | null;
  condition:  "nuevo" | "usado";
  _rowIndex:  number;
  _errors:    string[];
}

type Step = "upload" | "preview" | "importing" | "done";

// ── Template download ──────────────────────────────────────────────────────────

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = ["nombre*", "marca*", "modelo", "categoria", "sku", "cantidad*", "precio_compra", "precio_venta", "condicion(nuevo/usado)"];
  const example = ["Pantalla OLED", "Samsung", "Galaxy A54", "Pantalla", "PAN-A54-001", 3, 25.00, 45.00, "nuevo"];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);

  // Column widths
  ws["!cols"] = [
    { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, "plantilla_inventario_techx.xlsx");
}

// ── Parsing logic ─────────────────────────────────────────────────────────────

function parseSheet(data: unknown[][]): ParsedRow[] {
  if (data.length < 2) return [];
  const rows = data.slice(1); // skip header

  return rows.map((raw, i) => {
    const get = (idx: number): string =>
      raw[idx] != null ? String(raw[idx]).trim() : "";

    const errors: string[] = [];

    const name     = get(0);
    const brand    = get(1);
    const model    = get(2) || null;
    const category = get(3) || null;
    const sku      = get(4) || null;
    const qtyRaw   = raw[5];
    const costRaw  = raw[6];
    const sellRaw  = raw[7];
    const cond     = get(8).toLowerCase() as "nuevo" | "usado";

    if (!name)  errors.push("Nombre requerido");
    if (!brand) errors.push("Marca requerida");

    const quantity = typeof qtyRaw === "number" ? Math.round(qtyRaw) : parseInt(String(qtyRaw), 10);
    if (isNaN(quantity) || quantity < 0) errors.push("Cantidad inválida");

    const cost_price = costRaw != null && costRaw !== "" ? parseFloat(String(costRaw)) : null;
    const sell_price = sellRaw != null && sellRaw !== "" ? parseFloat(String(sellRaw)) : null;
    if (cost_price !== null && isNaN(cost_price)) errors.push("Precio compra inválido");
    if (sell_price !== null && isNaN(sell_price)) errors.push("Precio venta inválido");

    const condition: "nuevo" | "usado" = cond === "usado" ? "usado" : "nuevo";

    return {
      name, brand, model, category, sku,
      quantity: isNaN(quantity) ? 0 : quantity,
      cost_price, sell_price, condition,
      _rowIndex: i + 2,
      _errors: errors,
    } satisfies ParsedRow;
  }).filter((r) => r.name || r.brand); // skip completely empty rows
}

// ── Step Indicator ────────────────────────────────────────────────────────────

const STEPS = ["Archivo", "Vista previa", "Importando"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "size-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
              i < current  ? "bg-emerald-500 text-white" :
              i === current ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            )}>
              {i < current ? <CheckCircle2 className="size-3" /> : i + 1}
            </div>
            <span className={cn(
              "text-xs font-medium hidden sm:block",
              i === current ? "text-foreground" : "text-muted-foreground"
            )}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <ChevronRight className="size-3 text-muted-foreground/40 mx-0.5" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

function DropZone({
  onFile,
}: {
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200 select-none",
        dragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleChange}
      />

      <div className={cn(
        "flex size-16 items-center justify-center rounded-2xl transition-colors",
        dragging ? "bg-primary/20" : "bg-emerald-500/10"
      )}>
        <FileSpreadsheet className={cn(
          "size-8 transition-colors",
          dragging ? "text-primary" : "text-emerald-400"
        )} />
      </div>

      <div className="text-center space-y-1">
        <p className="font-semibold text-sm">
          {dragging ? "Suelta el archivo aquí" : "Arrastra tu archivo Excel aquí"}
        </p>
        <p className="text-xs text-muted-foreground">
          o <span className="text-primary underline underline-offset-2">haz clic para seleccionar</span>
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          Soporta .xlsx · .xls · .csv — máx. 5 MB
        </p>
      </div>
    </div>
  );
}

// ── Preview Row ───────────────────────────────────────────────────────────────

function PreviewRow({ row, idx }: { row: ParsedRow; idx: number }) {
  const hasErrors = row._errors.length > 0;
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl px-3 py-2.5 text-xs transition-colors",
      hasErrors ? "bg-red-500/5 border border-red-500/20" : "bg-card/50 border border-border/40"
    )}>
      {/* Row number */}
      <span className="shrink-0 mt-0.5 font-mono text-[10px] text-muted-foreground/60 w-5 text-right">
        {row._rowIndex}
      </span>

      {/* Status icon */}
      <div className="shrink-0 mt-0.5">
        {hasErrors
          ? <XCircle className="size-3.5 text-red-400" />
          : <CheckCircle2 className="size-3.5 text-emerald-400" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-foreground truncate">{row.brand} {row.name}</span>
          {row.condition === "usado" && (
            <Badge variant="outline" className="text-[9px] px-1.5 border-amber-500/40 text-amber-400">
              Usado
            </Badge>
          )}
          {row.category && (
            <span className="text-[10px] bg-primary/10 text-primary/80 px-1.5 py-0.5 rounded">
              {row.category}
            </span>
          )}
        </div>
        <div className="flex gap-3 text-muted-foreground flex-wrap">
          {row.model && <span>📱 {row.model}</span>}
          <span>📦 {row.quantity} uds.</span>
          {row.cost_price != null && <span>💰 Compra: {row.cost_price}</span>}
          {row.sell_price != null && <span>🏷️ Venta: {row.sell_price}</span>}
          {row.sku && <span className="font-mono">#{row.sku}</span>}
        </div>
        {hasErrors && (
          <div className="flex flex-wrap gap-1 mt-1">
            {row._errors.map((e) => (
              <span key={e} className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-md">
                {e}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Seq number */}
      <span className="shrink-0 text-[10px] text-muted-foreground/40">#{idx + 1}</span>
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

interface InventoryImportDialogProps {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
}

export function InventoryImportDialog({ open, onOpenChange }: InventoryImportDialogProps) {
  const { org } = useOrganization();
  const createMutation = useCreateInventario();

  const [step,      setStep]      = useState<Step>("upload");
  const [rows,      setRows]      = useState<ParsedRow[]>([]);
  const [itemType,  setItemType]  = useState<ItemType>("repuesto_comprado");
  const [fileName,  setFileName]  = useState<string>("");
  const [progress,  setProgress]  = useState(0);
  const [imported,  setImported]  = useState(0);
  const [errors,    setErrors]    = useState(0);

  const validRows   = rows.filter((r) => r._errors.length === 0);
  const invalidRows = rows.filter((r) => r._errors.length >  0);

  const reset = () => {
    setStep("upload"); setRows([]); setFileName("");
    setProgress(0); setImported(0); setErrors(0);
  };

  const handleFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es muy grande (máx. 5 MB)");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data  = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb    = XLSX.read(data, { type: "array" });
        const ws    = wb.Sheets[wb.SheetNames[0]];
        const json  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
        const parsed = parseSheet(json);
        if (parsed.length === 0) {
          toast.error("El archivo no contiene datos válidos");
          return;
        }
        setRows(parsed);
        setStep("preview");
      } catch {
        toast.error("Error al leer el archivo. Verifica que sea .xlsx o .csv válido.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleImport = async () => {
    if (!org?.id || validRows.length === 0) return;
    setStep("importing");
    let ok = 0; let fail = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await createMutation.mutateAsync({
          organization_id: org.id,
          name:       row.name,
          brand:      row.brand || null,
          model:      row.model,
          category:   row.category,
          sku:        row.sku,
          quantity:   row.quantity,
          cost_price: row.cost_price,
          sell_price: row.sell_price,
          condition:  row.condition,
          item_type:  itemType,
          notes:      null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        ok++;
      } catch {
        fail++;
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImported(ok); setErrors(fail);
    setStep("done");
    if (ok > 0) toast.success(`${ok} ítems importados correctamente`);
    if (fail > 0) toast.error(`${fail} ítems no pudieron importarse`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50 space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15">
              <FileSpreadsheet className="size-5 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Importar inventario desde Excel</DialogTitle>
              <DialogDescription className="text-xs">
                Sube un archivo .xlsx o .csv con tus productos o repuestos
              </DialogDescription>
            </div>
          </div>
          <StepIndicator current={step === "upload" ? 0 : step === "preview" ? 1 : 2} />
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* STEP 1 — Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Type selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium shrink-0">Tipo de ítems:</span>
                <Select value={itemType} onValueChange={(v) => setItemType(v as ItemType)}>
                  <SelectTrigger className="h-8 text-xs w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="producto">Productos</SelectItem>
                    <SelectItem value="repuesto_comprado">Repuestos</SelectItem>
                    <SelectItem value="repuesto_propio">Repuestos Propios</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DropZone onFile={handleFile} />

              {/* Download template */}
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <Info className="size-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">¿Primera vez importando?</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Descarga la plantilla Excel con el formato correcto para evitar errores
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0 h-8 text-xs"
                  onClick={downloadTemplate}
                >
                  <Download className="size-3.5" /> Plantilla
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 — Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* File info bar */}
              <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/40 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="size-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold">{fileName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {rows.length} filas detectadas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                    <CheckCircle2 className="size-2.5" /> {validRows.length} válidas
                  </Badge>
                  {invalidRows.length > 0 && (
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1 text-[10px]">
                      <XCircle className="size-2.5" /> {invalidRows.length} con errores
                    </Badge>
                  )}
                </div>
              </div>

              {/* Warning if errors */}
              {invalidRows.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3">
                  <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Se importarán solo las <strong>{validRows.length} filas válidas</strong>.
                    Corrige el archivo y vuelve a importarlo para las {invalidRows.length} filas con errores.
                  </p>
                </div>
              )}

              {/* Rows list */}
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                {rows.map((row, i) => (
                  <PreviewRow key={i} row={row} idx={i} />
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
              <div className="relative flex size-20 items-center justify-center">
                <svg className="absolute inset-0 size-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <span className="text-xl font-bold">{progress}%</span>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Importando inventario...
                </p>
                <p className="text-xs text-muted-foreground">
                  No cierres esta ventana hasta que finalice
                </p>
              </div>
            </div>
          )}

          {/* STEP 4 — Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center gap-5 py-10">
              <div className={cn(
                "flex size-20 items-center justify-center rounded-full",
                errors === 0 ? "bg-emerald-500/15" : "bg-amber-500/15"
              )}>
                {errors === 0
                  ? <CheckCircle2 className="size-10 text-emerald-400" />
                  : <AlertTriangle className="size-10 text-amber-400" />
                }
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-bold">
                  {errors === 0 ? "¡Importación completada!" : "Importación parcial"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="text-emerald-400 font-semibold">{imported} ítems</span> importados correctamente
                  {errors > 0 && (
                    <> · <span className="text-red-400 font-semibold">{errors} fallidos</span></>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Importar otro</Button>
                <Button onClick={() => { reset(); onOpenChange(false); }}>Finalizar</Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        {(step === "upload" || step === "preview") && (
          <div className="px-6 pb-5 pt-3 border-t border-border/40 flex items-center justify-between shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={step === "upload" ? () => onOpenChange(false) : reset}
              className="text-muted-foreground"
            >
              {step === "upload" ? "Cancelar" : "← Subir otro"}
            </Button>

            {step === "preview" && (
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0}
                className="gap-2"
              >
                <Upload className="size-4" />
                Importar {validRows.length} ítem{validRows.length !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

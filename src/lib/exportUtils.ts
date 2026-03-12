/**
 * exportUtils.ts
 * Utilidades de exportación de reportes a CSV y JSON.
 * Compatible con todos los navegadores modernos sin dependencias externas.
 */

// ── CSV ───────────────────────────────────────────────────────────────────────

/**
 * Escapa un valor para CSV: si contiene coma, comillas o salto de línea,
 * lo envuelve en comillas dobles y escapa las comillas internas.
 */
function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convierte un array de objetos a string CSV.
 * @param rows     Los datos (array de objetos)
 * @param headers  Mapeo de clave → label de columna (en orden)
 */
export function toCSV<T extends Record<string, unknown>>(
  rows:    T[],
  headers: { key: keyof T; label: string }[]
): string {
  const headerLine = headers.map((h) => csvEscape(h.label)).join(",");
  const dataLines  = rows.map((row) =>
    headers.map((h) => csvEscape(row[h.key])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Descarga un string como archivo.
 */
function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob(["\uFEFF" + content], { type: mimeType + ";charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Descarga un CSV a partir de datos y configuración de columnas.
 */
export function downloadCSV<T extends Record<string, unknown>>(
  rows:     T[],
  headers:  { key: keyof T; label: string }[],
  filename: string
) {
  const csv = toCSV(rows, headers);
  downloadBlob(csv, filename.endsWith(".csv") ? filename : filename + ".csv", "text/csv");
}

/**
 * Descarga datos como JSON.
 */
export function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, filename.endsWith(".json") ? filename : filename + ".json", "application/json");
}

// ── Configuraciones predefinidas por reporte ──────────────────────────────────

export const INGRESOS_CSV_HEADERS = [
  { key: "date"           as const, label: "Fecha" },
  { key: "source"         as const, label: "Origen" },
  { key: "description"    as const, label: "Cliente / Descripción" },
  { key: "detail"         as const, label: "Detalle" },
  { key: "amount"         as const, label: "Monto" },
  { key: "payment_method" as const, label: "Método de Pago" },
  { key: "author_name"    as const, label: "Responsable" },
];

export const GASTOS_CSV_HEADERS = [
  { key: "expense_date" as const, label: "Fecha" },
  { key: "category"     as const, label: "Categoría" },
  { key: "description"  as const, label: "Descripción" },
  { key: "amount"       as const, label: "Monto" },
  { key: "created_by_name" as const, label: "Registrado por" },
];

export const FIADOS_CSV_HEADERS = [
  { key: "created_at"    as const, label: "Fecha" },
  { key: "source"        as const, label: "Origen" },
  { key: "description"   as const, label: "Cliente" },
  { key: "detail"        as const, label: "Detalle" },
  { key: "amount"        as const, label: "Monto Adeudado" },
  { key: "customer_name" as const, label: "Nombre Cliente" },
];

/**
 * fiscalConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sistema de configuracion fiscal adaptable por pais/moneda para LATAM.
 *
 * Uso:
 *   const config = getFiscalConfig("PEN");   // Peru
 *   config.docTypes   → [{value, label, desc}]
 *   config.taxLabel   → "IGV"
 *   config.taxIdLabel → "RUC"
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface FiscalDocType {
  value:    string;   // slug interno (boleta | factura | nota_venta | etc.)
  label:    string;   // nombre oficial en el pais
  shortLabel: string; // para botones cortos
  desc:     string;   // descripcion para el usuario
  /** Si true, requiere ID tributario del cliente (RUC, NIT, etc.) */
  requiresTaxId: boolean;
  /** Si true, solo disponible cuando el pago es al contado */
  cashOnly?: boolean;
  icon:     "receipt" | "invoice" | "note";
}

export interface FiscalCountryConfig {
  /** ISO 4217 currency code used for formatting (e.g. "USD" for dollarized countries) */
  currency:      string;
  countryName:   string;
  taxLabel:      string;   // IGV, IVA, ICMS, etc.
  taxIdLabel:    string;   // RUC, NIT, RUT, RFC, CNPJ, CUIT
  taxIdLength?:  number;   // longitud esperada del tax ID (para validacion)
  dateFormat:    "es-PE" | "es-CO" | "es-CL" | "es-MX" | "pt-BR" | "es-AR";
  docTypes:      FiscalDocType[];
  defaultDocType: string;  // value del tipo por defecto
  /** Texto de "consumidor final" segun el pais */
  consumerFinalLabel: string;
  /** Texto de anonimo / sin registro */
  guestLabel: string;
  /** ISO 3166-1 alpha-2 country code — used by phone-input auto-select */
  isoCountryCode?: string;
}

// ── Configuraciones por moneda ────────────────────────────────────────────────

const FISCAL_CONFIGS: Record<string, FiscalCountryConfig> = {

  // ── Peru (PEN) ─────────────────────────────────────────────────────────────
  PEN: {
    currency:    "PEN",
    countryName: "Peru",
    taxLabel:    "IGV",
    taxIdLabel:  "RUC",
    taxIdLength: 11,
    dateFormat:  "es-PE",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "boleta",
    docTypes: [
      {
        value: "boleta", label: "Boleta de Venta", shortLabel: "Boleta",
        desc: "Comprobante para persona natural / consumidor final",
        requiresTaxId: false, icon: "receipt",
      },
      {
        value: "factura", label: "Factura", shortLabel: "Factura",
        desc: "Requiere RUC del cliente (persona juridica)",
        requiresTaxId: true, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Documento de venta sin valor tributario oficial",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Colombia (COP) ─────────────────────────────────────────────────────────
  COP: {
    currency:    "COP",
    countryName: "Colombia",
    taxLabel:    "IVA",
    taxIdLabel:  "NIT",
    taxIdLength: 9,
    dateFormat:  "es-CO",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Factura de Venta", shortLabel: "Factura",
        desc: "Documento principal de venta en Colombia",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Documento interno de venta simplificada",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Chile (CLP) ────────────────────────────────────────────────────────────
  CLP: {
    currency:    "CLP",
    countryName: "Chile",
    taxLabel:    "IVA",
    taxIdLabel:  "RUT",
    taxIdLength: 9,
    dateFormat:  "es-CL",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "boleta",
    docTypes: [
      {
        value: "boleta", label: "Boleta de Venta", shortLabel: "Boleta",
        desc: "Comprobante de venta a consumidor final",
        requiresTaxId: false, icon: "receipt",
      },
      {
        value: "factura", label: "Factura", shortLabel: "Factura",
        desc: "Requiere RUT del receptor",
        requiresTaxId: true, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Documento de venta sin valor tributario",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Mexico (MXN) ───────────────────────────────────────────────────────────
  MXN: {
    currency:    "MXN",
    countryName: "Mexico",
    taxLabel:    "IVA",
    taxIdLabel:  "RFC",
    dateFormat:  "es-MX",
    consumerFinalLabel: "Publico General",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "CFDI / Factura", shortLabel: "Factura",
        desc: "Comprobante Fiscal Digital por Internet",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Simplificado sin desglose fiscal",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Brazil (BRL) ───────────────────────────────────────────────────────────
  BRL: {
    currency:    "BRL",
    countryName: "Brasil",
    taxLabel:    "ICMS",
    taxIdLabel:  "CNPJ",
    taxIdLength: 14,
    dateFormat:  "pt-BR",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sem cadastro",
    defaultDocType: "nota_fiscal",
    docTypes: [
      {
        value: "nota_fiscal", label: "Nota Fiscal (NFC-e)", shortLabel: "NF-e",
        desc: "Nota Fiscal do Consumidor Eletronico",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Cupom Fiscal", shortLabel: "Cupom",
        desc: "Recibo simplificado de venda",
        requiresTaxId: false, icon: "receipt",
      },
    ],
  },

  // ── Argentina (ARS) ────────────────────────────────────────────────────────
  ARS: {
    currency:    "ARS",
    countryName: "Argentina",
    taxLabel:    "IVA",
    taxIdLabel:  "CUIT",
    taxIdLength: 11,
    dateFormat:  "es-AR",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura_b",
    docTypes: [
      {
        value: "factura_b", label: "Factura B", shortLabel: "F. B",
        desc: "Para consumidor final (responsable inscripto → no inscripto)",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "factura", label: "Factura A", shortLabel: "F. A",
        desc: "Requiere CUIT del cliente (empresa → empresa)",
        requiresTaxId: true, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Remito / Nota de venta", shortLabel: "Remito",
        desc: "Documento interno de entrega",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Ecuador (EC) — USD ────────────────────────────────────────────────────
  EC: {
    currency:        "USD",
    countryName:     "Ecuador",
    taxLabel:        "IVA",
    taxIdLabel:      "RUC",
    taxIdLength:     13,
    dateFormat:      "es-PE",
    isoCountryCode:  "EC",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Factura", shortLabel: "Factura",
        desc: "Comprobante de venta autorizado por el SRI",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Para consumidores finales (hasta límite SRI)",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Venezuela (VE) — USD ──────────────────────────────────────────────────
  VE: {
    currency:        "USD",
    countryName:     "Venezuela",
    taxLabel:        "IVA",
    taxIdLabel:      "RIF",
    taxIdLength:     10,
    dateFormat:      "es-PE",
    isoCountryCode:  "VE",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Factura", shortLabel: "Factura",
        desc: "Factura conforme a las disposiciones del SENIAT",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_entrega", label: "Nota de Entrega", shortLabel: "Nota Entrega",
        desc: "Comprobante de entrega sin efectos tributarios",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── El Salvador (SV) — USD ────────────────────────────────────────────────
  SV: {
    currency:        "USD",
    countryName:     "El Salvador",
    taxLabel:        "IVA",
    taxIdLabel:      "NIT",
    taxIdLength:     14,
    dateFormat:      "es-MX",
    isoCountryCode:  "SV",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura_cf",
    docTypes: [
      {
        value: "factura_cf", label: "Factura Consumidor Final", shortLabel: "Fact. CF",
        desc: "Para ventas a persona natural sin NIT / crédito fiscal",
        requiresTaxId: false, icon: "receipt",
      },
      {
        value: "ccf", label: "Comprobante de Crédito Fiscal", shortLabel: "CCF",
        desc: "Para ventas a contribuyentes con NIT registrado",
        requiresTaxId: true, icon: "invoice",
      },
      {
        value: "ticket", label: "Ticket de Venta", shortLabel: "Ticket",
        desc: "Ticket simplificado autorizado por el MH",
        requiresTaxId: false, icon: "receipt",
      },
    ],
  },

  // ── Panamá (PA) — USD ─────────────────────────────────────────────────────
  PA: {
    currency:        "USD",
    countryName:     "Panamá",
    taxLabel:        "ITBM",
    taxIdLabel:      "RUC",
    dateFormat:      "es-MX",
    isoCountryCode:  "PA",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Factura", shortLabel: "Factura",
        desc: "Documento fiscal autorizado por la DGI de Panamá",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Comprobante simplificado de venta",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Estados Unidos (USD) ──────────────────────────────────────────────────
  USD: {
    currency:        "USD",
    countryName:     "Estados Unidos / Internacional",
    taxLabel:        "TAX",
    taxIdLabel:      "EIN",
    dateFormat:      "es-PE",
    isoCountryCode:  "US",
    consumerFinalLabel: "Customer",
    guestLabel:         "Guest",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Invoice / Factura", shortLabel: "Invoice",
        desc: "Standard sales invoice",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Receipt", shortLabel: "Receipt",
        desc: "Simple sales receipt",
        requiresTaxId: false, icon: "receipt",
      },
    ],
  },

  // ── Bolivia (BOB) ──────────────────────────────────────────────────────────
  BOB: {
    currency:    "BOB",
    countryName: "Bolivia",
    taxLabel:    "IVA",
    taxIdLabel:  "NIT",
    taxIdLength: 13,
    dateFormat:  "es-PE",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Factura", shortLabel: "Factura",
        desc: "Documento fiscal autorizado por el SIN (IVA incluido)",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_fiscal", label: "Nota Fiscal de Venta", shortLabel: "Nota Fiscal",
        desc: "Comprobante de control tributario - SIAT Bolivia",
        requiresTaxId: false, icon: "receipt",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Documento interno simplificado sin valor tributario",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Paraguay (PYG) ─────────────────────────────────────────────────────────
  PYG: {
    currency:    "PYG",
    countryName: "Paraguay",
    taxLabel:    "IVA",
    taxIdLabel:  "RUC",
    dateFormat:  "es-PE",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Factura", shortLabel: "Factura",
        desc: "Comprobante de venta con IVA incluido",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Ticket simplificado de venta",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Uruguay (UYU) ──────────────────────────────────────────────────────────
  UYU: {
    currency:    "UYU",
    countryName: "Uruguay",
    taxLabel:    "IVA",
    taxIdLabel:  "RUT",
    taxIdLength: 12,
    dateFormat:  "es-AR",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Comprobante Fiscal", shortLabel: "Comprobante",
        desc: "Emitido por la DGI - Uruguay",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Ticket", shortLabel: "Ticket",
        desc: "Ticket de caja simplificado",
        requiresTaxId: false, icon: "receipt",
      },
    ],
  },



  // ── Canadá (CAD) ──────────────────────────────────────────────────────────
  CAD: {
    currency:    "CAD",
    countryName: "Canadá",
    taxLabel:    "HST/GST",
    taxIdLabel:  "BN",
    dateFormat:  "es-PE",
    consumerFinalLabel: "Consumer",
    guestLabel:         "Guest",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Invoice / Factura", shortLabel: "Invoice",
        desc: "Standard sales invoice",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Receipt", shortLabel: "Receipt",
        desc: "Simple sales receipt",
        requiresTaxId: false, icon: "receipt",
      },
    ],
  },

  // ── Costa Rica (CRC) ───────────────────────────────────────────────────────
  CRC: {
    currency:    "CRC",
    countryName: "Costa Rica",
    taxLabel:    "IVA",
    taxIdLabel:  "NITE",
    taxIdLength: 12,
    dateFormat:  "es-MX",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Factura Electrónica", shortLabel: "Factura",
        desc: "Comprobante electrónico autorizado por el Ministerio de Hacienda",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Tiquete Electrónico", shortLabel: "Tiquete",
        desc: "Para ventas a consumidor final sin datos del comprador",
        requiresTaxId: false, icon: "receipt",
      },
    ],
  },

  // ── Guatemala (GTQ) ────────────────────────────────────────────────────────
  GTQ: {
    currency:    "GTQ",
    countryName: "Guatemala",
    taxLabel:    "IVA",
    taxIdLabel:  "NIT",
    dateFormat:  "es-MX",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "CF",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Factura", shortLabel: "Factura",
        desc: "Documento tributario autorizado por la SAT Guatemala",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Comprobante simplificado de venta",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Honduras (HNL) ────────────────────────────────────────────────────────
  HNL: {
    currency:    "HNL",
    countryName: "Honduras",
    taxLabel:    "ISV",
    taxIdLabel:  "RTN",
    taxIdLength: 14,
    dateFormat:  "es-MX",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Factura", shortLabel: "Factura",
        desc: "Comprobante de venta con Impuesto Sobre Ventas (ISV)",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Comprobante simplificado sin ISV",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Nicaragua (NIO) ───────────────────────────────────────────────────────
  NIO: {
    currency:    "NIO",
    countryName: "Nicaragua",
    taxLabel:    "IVA",
    taxIdLabel:  "RUC",
    dateFormat:  "es-MX",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Factura", shortLabel: "Factura",
        desc: "Comprobante fiscal autorizado por la DGI Nicaragua",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Comprobante simplificado de venta",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── República Dominicana (DOP) ────────────────────────────────────────────
  DOP: {
    currency:    "DOP",
    countryName: "República Dominicana",
    taxLabel:    "ITBIS",
    taxIdLabel:  "RNC",
    taxIdLength: 9,
    dateFormat:  "es-MX",
    consumerFinalLabel: "Consumidor Final",
    guestLabel:         "Sin registro",
    defaultDocType: "factura",
    docTypes: [
      {
        value: "factura", label: "Comprobante Fiscal (NCF)", shortLabel: "NCF",
        desc: "Número de Comprobante Fiscal autorizado por la DGII",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Nota de Venta", shortLabel: "Nota Venta",
        desc: "Comprobante simplificado sin NCF",
        requiresTaxId: false, icon: "note",
      },
    ],
  },

  // ── Fallback generico ──────────────────────────────────────────────────────
  DEFAULT: {
    currency:    "USD",
    countryName: "Internacional",
    taxLabel:    "TAX",
    taxIdLabel:  "Tax ID",
    dateFormat:  "es-PE",
    consumerFinalLabel: "Consumer",
    guestLabel:         "Guest",
    defaultDocType: "invoice",
    docTypes: [
      {
        value: "factura", label: "Invoice / Factura", shortLabel: "Invoice",
        desc: "Standard sales invoice",
        requiresTaxId: false, icon: "invoice",
      },
      {
        value: "nota_venta", label: "Receipt", shortLabel: "Receipt",
        desc: "Simple sales receipt",
        requiresTaxId: false, icon: "receipt",
      },
    ],
  },
};

// ── Main getter ───────────────────────────────────────────────────────────────

/**
 * Retorna la configuracion fiscal del pais segun la moneda configurada.
 * Si no se encuentra la moneda, retorna el config DEFAULT.
 */
export function getFiscalConfig(currencyCode: string): FiscalCountryConfig {
  return FISCAL_CONFIGS[currencyCode] ?? FISCAL_CONFIGS.DEFAULT;
}

/**
 * Retorna el labelDoc correcto segun el tipo de documento (para el encabezado
 * de la boleta fisica impresa). Ej: "BOLETA DE VENTA", "FACTURA", etc.
 */
export function getDocPrintLabel(
  docType: string,
  currencyCode: string
): string {
  const config = getFiscalConfig(currencyCode);
  const found  = config.docTypes.find(d => d.value === docType);
  return (found?.label ?? docType).toUpperCase();
}

// ── Currency ──────────────────────────────────────────────────────────────────

export const CURRENCY_SYMBOLS: Record<string, string> = {
  // Monedas nativas
  PEN: "S/",  COP: "$",   CLP: "$",   BRL: "R$",
  MXN: "$",   ARS: "$",   USD: "$",   EUR: "€",
  BOB: "Bs.", PYG: "₲",  UYU: "$U",  CAD: "CA$",
  CRC: "₡",  GTQ: "Q",   HNL: "L",   NIO: "C$",  DOP: "RD$",
  // Países dolarizados (clave = código ISO país)
  VE:  "$",   EC:  "$",   SV:  "$",   PA:  "$",
};

/**
 * Monedas que no utilizan decimales en su formato estandar.
 */
const ZERO_DECIMAL_CURRENCIES = ["COP", "CLP", "PYG", "UGX", "VUV", "JPY", "KRW"];

/**
 * Formatea un monto usando separadores de miles y decimales reales (si aplica).
 * Para COP, CLP, PYG elimina los decimales (".00") que confunden.
 * Incluye el simbolo de moneda.
 */
export function formatMoneyGlobal(amount: number, currencyCode: string = "USD"): string {
  const config = getFiscalConfig(currencyCode);
  // Use config.currency (ISO 4217) for Intl — allows country-code keys like "VE", "EC"
  const isoCurrency = config.currency;
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(isoCurrency.toUpperCase());
  const fractionDigits = isZeroDecimal ? 0 : 2;

  try {
    return new Intl.NumberFormat(config.dateFormat, {
      style: "currency",
      currency: isoCurrency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    const symbol = CURRENCY_SYMBOLS[currencyCode] ?? CURRENCY_SYMBOLS[isoCurrency] ?? "$";
    return `${symbol} ${amount.toLocaleString(config.dateFormat, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    })}`;
  }
}

/**
 * Igual que formatMoneyGlobal pero retorna solo el numero formateado, sin
 * el simbolo de la moneda. Util para columnas de tablas y boletas impresas.
 */
export function formatNumberGlobal(amount: number, currencyCode: string = "USD"): string {
  const config = getFiscalConfig(currencyCode);
  const isoCurrency = config.currency;
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(isoCurrency.toUpperCase());
  const fractionDigits = isZeroDecimal ? 0 : 2;

  try {
    return new Intl.NumberFormat(config.dateFormat, {
      style: "decimal",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return amount.toLocaleString(config.dateFormat, { 
      minimumFractionDigits: fractionDigits, 
      maximumFractionDigits: fractionDigits 
    });
  }
}

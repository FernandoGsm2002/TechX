"use client";

/**
 * PhoneInput — campo de teléfono con selector de prefijo LATAM.
 *
 * Props:
 *   value        – número completo, e.g. "+51 999 999 999"  (o solo "999 999 999")
 *   onChange     – devuelve el número completo con prefijo, e.g. "+51 999 999 999"
 *   placeholder  – texto del campo numérico
 *   className    – clases extra para el wrapper
 *   defaultDialCode – prefijo inicial si value está vacío (e.g. "+51")
 */

import React, { useEffect, useRef, useState } from "react";
import { faChevronDown, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { cn } from "@/lib/utils";

// ── Países LATAM + common ─────────────────────────────────────────────────────

export interface DialCountry {
  code:     string;   // ISO-2
  flag:     string;   // emoji
  name:     string;
  dialCode: string;   // e.g. "+51"
}

export const LATAM_COUNTRIES: DialCountry[] = [
  { code: "PE", flag: "🇵🇪", name: "Perú",             dialCode: "+51"  },
  { code: "CO", flag: "🇨🇴", name: "Colombia",          dialCode: "+57"  },
  { code: "CL", flag: "🇨🇱", name: "Chile",             dialCode: "+56"  },
  { code: "BR", flag: "🇧🇷", name: "Brasil",            dialCode: "+55"  },
  { code: "MX", flag: "🇲🇽", name: "México",            dialCode: "+52"  },
  { code: "AR", flag: "🇦🇷", name: "Argentina",         dialCode: "+54"  },
  { code: "EC", flag: "🇪🇨", name: "Ecuador",           dialCode: "+593" },
  { code: "BO", flag: "🇧🇴", name: "Bolivia",           dialCode: "+591" },
  { code: "PY", flag: "🇵🇾", name: "Paraguay",          dialCode: "+595" },
  { code: "UY", flag: "🇺🇾", name: "Uruguay",           dialCode: "+598" },
  { code: "VE", flag: "🇻🇪", name: "Venezuela",         dialCode: "+58"  },
  { code: "PA", flag: "🇵🇦", name: "Panamá",            dialCode: "+507" },
  { code: "CR", flag: "🇨🇷", name: "Costa Rica",        dialCode: "+506" },
  { code: "GT", flag: "🇬🇹", name: "Guatemala",         dialCode: "+502" },
  { code: "HN", flag: "🇭🇳", name: "Honduras",          dialCode: "+504" },
  { code: "SV", flag: "🇸🇻", name: "El Salvador",       dialCode: "+503" },
  { code: "NI", flag: "🇳🇮", name: "Nicaragua",         dialCode: "+505" },
  { code: "DO", flag: "🇩🇴", name: "Rep. Dominicana",   dialCode: "+1809"},
  { code: "CU", flag: "🇨🇺", name: "Cuba",              dialCode: "+53"  },
  { code: "PR", flag: "🇵🇷", name: "Puerto Rico",       dialCode: "+1787"},
  { code: "US", flag: "🇺🇸", name: "EE. UU.",           dialCode: "+1"   },
  { code: "ES", flag: "🇪🇸", name: "España",            dialCode: "+34"  },
];

/** Mapeo moneda ISO → dialCode por defecto */
export const CURRENCY_TO_DIAL: Record<string, string> = {
  PEN: "+51",  COP: "+57",  CLP: "+56",  BRL: "+55",
  MXN: "+52",  ARS: "+54",  BOB: "+591", PYG: "+595",
  UYU: "+598", USD: "+1",   EUR: "+34",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Dado un valor completo como "+51 999 999 999", devuelve { dialCode, number }.
 * Si no hay dialCode reconocible, usa defaultDialCode.
 */
function parsePhone(value: string, defaultDialCode: string): { dialCode: string; number: string } {
  const trimmed = value.trim();
  if (!trimmed) return { dialCode: defaultDialCode, number: "" };

  // Intentar encontrar el dialCode más largo que coincida al inicio
  const sorted = [...LATAM_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (trimmed.startsWith(c.dialCode)) {
      return {
        dialCode: c.dialCode,
        number: trimmed.slice(c.dialCode.length).trimStart(),
      };
    }
  }

  // No se encontró prefijo — si empieza con "+" es desconocido, si no es solo número
  return { dialCode: defaultDialCode, number: trimmed };
}

// ── Componente ─────────────────────────────────────────────────────────────────

interface PhoneInputProps {
  value?:           string;
  onChange?:        (value: string) => void;
  placeholder?:     string;
  className?:       string;
  /** Prefijo inicial cuando value está vacío. Default: "+51" */
  defaultDialCode?: string;
  disabled?:        boolean;
  /** Para compatibilidad con React Hook Form ref */
  inputRef?:        React.Ref<HTMLInputElement>;
}

export function PhoneInput({
  value = "",
  onChange,
  placeholder = "999 999 999",
  className,
  defaultDialCode = "+51",
  disabled = false,
  inputRef,
}: PhoneInputProps) {
  const [open,         setOpen]        = useState(false);
  const [search,       setSearch]      = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { dialCode, number } = parsePhone(value, defaultDialCode);

  const selectedCountry = LATAM_COUNTRIES.find(c => c.dialCode === dialCode) ?? LATAM_COUNTRIES[0];

  const filtered = search.trim()
    ? LATAM_COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dialCode.includes(search)
      )
    : LATAM_COUNTRIES;

  // Cierra al click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelectCountry = (country: DialCountry) => {
    setOpen(false);
    setSearch("");
    onChange?.(`${country.dialCode} ${number}`.trim());
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s\-]/g, "");
    onChange?.(`${dialCode} ${raw}`.trim());
  };

  return (
    <div ref={dropdownRef} className={cn("relative flex h-9 w-full rounded-md border border-input bg-transparent shadow-xs", className)}>

      {/* ── Trigger del selector de país ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        className={cn(
          "flex items-center gap-1 px-2.5 border-r border-input rounded-l-md shrink-0",
          "text-sm hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <span className="text-base leading-none">{selectedCountry.flag}</span>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{dialCode}</span>
        <FaIcon icon={faChevronDown} size={12} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* ── Input numérico ── */}
      <input
        ref={inputRef}
        type="tel"
        disabled={disabled}
        value={number}
        onChange={handleNumberChange}
        placeholder={placeholder}
        className={cn(
          "flex-1 min-w-0 px-3 py-1 text-sm bg-transparent rounded-r-md",
          "placeholder:text-muted-foreground focus:outline-none",
          disabled && "opacity-50"
        )}
      />

      {/* ── Dropdown de países ── */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <FaIcon icon={faMagnifyingGlass} size={14} className="text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país o prefijo…"
              className="flex-1 text-xs bg-transparent focus:outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Lista */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</li>
            )}
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => handleSelectCountry(c)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors text-left",
                    c.dialCode === dialCode && "bg-primary/8 text-primary font-medium"
                  )}
                >
                  <span className="text-base w-6 text-center leading-none">{c.flag}</span>
                  <span className="flex-1 text-xs">{c.name}</span>
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">{c.dialCode}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

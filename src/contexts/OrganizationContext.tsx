"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];
import { formatMoneyGlobal, getFiscalConfig, CURRENCY_SYMBOLS } from "@/lib/fiscalConfig";

//  Internal state interfaces 

interface OrgState {
  organization: Organization | null;
  currencyCode: string;
  currencySymbol: string;
  taxPercentage: number;
  /** The human-readable tax label saved in the DB (IGV, IVA, ICMS…) */
  taxLabel: string;
  isActive: boolean;
  isLoading: boolean;
}

interface UserState {
  userId: string | null;
  email: string | null;
  role: UserRole | null;
  fullName: string | null;
  avatarUrl: string | null;
}

//  Public context shape 

export interface OrganizationContextValue extends OrgState, UserState {
  /** Alias for organization */
  org: Organization | null;
  /** The tax document label stored in DB (RUC, NIT, RFC, CNPJ…) */
  taxIdName: string;
  /** The tax type label derived from fiscal config (IGV, IVA, ICMS…) */
  taxTypeLabel: string;
  /** Subscription end ISO string */
  subscriptionEnd: string | null;
  /** Plan type key */
  planType: string | null;
  /** Format a number as currency using the org's currency code */
  formatCurrency: (amount: number) => string;
  /** Whether the Otros Servicios module is enabled */
  enableOtrosServicios: boolean;
  // ── Print / receipt settings (derived from org, always typed) ──────────────
  /** Ticket / repair order prefix (e.g. "TK") */
  ticketPrefix: string;
  /** Whether to print the org logo on receipts */
  showLogoOnPrint: boolean;
  /** Whether to show tax breakdown on receipts (subtotal + IGV/IVA line) */
  showTaxBreakdown: boolean;
  /** Thermal printer paper width in mm */
  printWidthMm: 58 | 80;
  /** Notes / terms shown on receipt body */
  receiptNotes: string | null;
  /** Footer text at the bottom of receipts */
  receiptFooter: string | null;
  /** Re-fetch organization data from Supabase */
  refresh: () => Promise<void>;
  /** Alias for refresh */
  refreshOrg: () => Promise<void>;
}

//  Helpers 

/** Default tax document ID name per currency — used when the DB has no tax_id_name yet */
const DEFAULT_TAX_ID_NAME: Record<string, string> = {
  // Monedas nativas
  PEN: "RUC",  COP: "NIT",  CLP: "RUT",  BRL: "CNPJ",
  MXN: "RFC",  ARS: "CUIT", USD: "EIN",  EUR: "VAT",
  BOB: "NIT",  PYG: "RUC",  UYU: "RUT",
  CAD: "BN",   CRC: "NITE", GTQ: "NIT",  HNL: "RTN",
  NIO: "RUC",  DOP: "RNC",
  // Países dolarizados (clave = ISO país)
  VE: "RIF",  EC: "RUC",  SV: "NIT_SV",  PA: "RUC",
};

//Context 

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();

  const [orgState, setOrgState] = useState<OrgState>({
    organization: null,
    currencyCode: "PEN",
    currencySymbol: "S/",
    taxPercentage: 18,
    taxLabel: "IGV",
    isActive: true,
    isLoading: true,
  });

  const [userState, setUserState] = useState<UserState>({
    userId: null,
    email: null,
    role: null,
    fullName: null,
    avatarUrl: null,
  });

  // ── Data fetcher ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setOrgState((prev) => ({ ...prev, isLoading: true }));

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setOrgState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setUserState({
      userId:    user.id,
      email:     user.email ?? null,
      role:      profile?.role ?? null,
      fullName:  profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    });

    if (!profile?.organization_id) {
      setOrgState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();

    if (org) {
      const code = org.currency_code ?? "PEN";
      // tax_id_name stores the document label (RUC, NIT…); fall back per currency
      const docLabel = org.tax_id_name ?? DEFAULT_TAX_ID_NAME[code] ?? "RUC";
      const taxPct   = typeof org.tax_percentage === "number" ? org.tax_percentage : 18;

      setOrgState({
        organization:   org,
        currencyCode:   code,
        currencySymbol: CURRENCY_SYMBOLS[code] ?? code,
        taxPercentage:  taxPct,
        // taxLabel aquí guarda el nombre del documento tributario (RUC, NIT…)
        taxLabel: docLabel,
        isActive:
          (org.is_active ?? false) &&
          // Sin subscription_end = sin expiración (plan indefinido / free) → activo
          (org.subscription_end
            ? new Date(org.subscription_end) > new Date()
            : true),
        isLoading: false,
      });
    } else {
      setOrgState((prev) => ({ ...prev, isLoading: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchData();
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchData, supabase.auth]);

  // ── Derived helpers (always reflect current orgState) ─────────────────────
  const formatCurrency = useCallback((amount: number) => {
    return formatMoneyGlobal(amount, orgState.currencyCode);
  }, [orgState.currencyCode]);

  const org = orgState.organization;

  return (
    <OrganizationContext.Provider
      value={{
        ...orgState,
        ...userState,
        org,
        // taxIdName = nombre del documento tributario (RUC / NIT / RFC…)
        taxIdName:    orgState.taxLabel,
        // taxTypeLabel = tipo de impuesto derivado del país (IGV / IVA / ICMS…)
        taxTypeLabel: getFiscalConfig(orgState.currencyCode).taxLabel,
        subscriptionEnd: org?.subscription_end ?? null,
        planType:        org?.plan_type ?? null,
        enableOtrosServicios: org?.enable_otros_servicios ?? false,
        //  Print / receipt settings 
        ticketPrefix:    org?.ticket_prefix ?? "TK",
        showLogoOnPrint: org?.show_logo_on_print ?? true,
        showTaxBreakdown: org?.show_tax_breakdown ?? true,
        printWidthMm:    ((org?.print_width_mm ?? 58) === 80 ? 80 : 58) as 58 | 80,
        receiptNotes:    org?.receipt_notes ?? null,
        receiptFooter:   org?.receipt_footer ?? null,
        formatCurrency,
        refresh:    fetchData,
        refreshOrg: fetchData,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

//  Hook 

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error("useOrganization must be used inside <OrganizationProvider>");
  }
  return ctx;
}

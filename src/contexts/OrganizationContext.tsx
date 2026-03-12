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
import type { Database } from "@/types/database.types";
type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];
import { formatMoneyGlobal, CURRENCY_SYMBOLS } from "@/lib/fiscalConfig";

// ── Internal state interfaces ─────────────────────────────────────────────────

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

// ── Public context shape ──────────────────────────────────────────────────────

export interface OrganizationContextValue extends OrgState, UserState {
  /** Alias for organization */
  org: Organization | null;
  /** The tax label as stored in DB (IGV / IVA / ICMS / TAX / Ninguno) */
  taxIdName: string;
  /** Subscription end ISO string */
  subscriptionEnd: string | null;
  /** Plan type key */
  planType: string | null;
  /** Format a number as currency using the org's currency code */
  formatCurrency: (amount: number) => string;
  /** Whether the Otros Servicios module is enabled */
  enableOtrosServicios: boolean;
  /** Re-fetch organization data from Supabase */
  refresh: () => Promise<void>;
  /** Alias for refresh */
  refreshOrg: () => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Default company tax ID name per currency — used when the DB has no tax_id_name yet */
const DEFAULT_TAX_LABEL: Record<string, string> = {
  PEN: "RUC", COP: "NIT", CLP: "RUT", BRL: "CNPJ",
  MXN: "RFC", ARS: "CUIT", USD: "EIN", EUR: "VAT",
};

// ── Context ───────────────────────────────────────────────────────────────────

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
      // Prefer the stored tax label; fall back to default derived from currency
      const taxLabel = org.tax_id_name ?? DEFAULT_TAX_LABEL[code] ?? "IGV";
      const taxPct   = typeof org.tax_percentage === "number" ? org.tax_percentage : 18;

      setOrgState({
        organization:   org,
        currencyCode:   code,
        currencySymbol: CURRENCY_SYMBOLS[code] ?? code,
        taxPercentage:  taxPct,
        taxLabel,
        isActive:
          (org.is_active ?? false) &&
          (org.subscription_end
            ? new Date(org.subscription_end) > new Date()
            : false),
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
  }, [fetchData]);

  // ── Derived helpers (always reflect current orgState) ─────────────────────
  const formatCurrency = useCallback((amount: number) => {
    return formatMoneyGlobal(amount, orgState.currencyCode);
  }, [orgState.currencyCode]);

  return (
    <OrganizationContext.Provider
      value={{
        ...orgState,
        ...userState,
        org:             orgState.organization,
        taxIdName:       orgState.taxLabel,
        subscriptionEnd: orgState.organization?.subscription_end ?? null,
        planType:        orgState.organization?.plan_type ?? null,
        enableOtrosServicios: !!(orgState.organization as any)?.enable_otros_servicios,
        formatCurrency,
        refresh:    fetchData,
        refreshOrg: fetchData,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error("useOrganization must be used inside <OrganizationProvider>");
  }
  return ctx;
}

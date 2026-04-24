"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";
import {
  faArrowRight, faArrowLeft, faCircleCheck, faSpinner, faClock,
  faEnvelope, faEye, faEyeSlash, faPhone, faLocationDot, faImage,
  faTrash, faLockOpen, faLock, faStore, faUser, faCreditCard,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Switch }   from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn }          from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getFiscalConfig, CURRENCY_SYMBOLS } from "@/lib/fiscalConfig";

// ── Currency catalogue ────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "PEN", country: "Perú",              flag: "🇵🇪", taxRate: 18 },
  { code: "COP", country: "Colombia",           flag: "🇨🇴", taxRate: 19 },
  { code: "MXN", country: "México",             flag: "🇲🇽", taxRate: 16 },
  { code: "BRL", country: "Brasil",             flag: "🇧🇷", taxRate: 12 },
  { code: "CLP", country: "Chile",              flag: "🇨🇱", taxRate: 19 },
  { code: "ARS", country: "Argentina",          flag: "🇦🇷", taxRate: 21 },
  { code: "USD", country: "Ecuador / Intl.",    flag: "🇪🇨", taxRate: 15 },
  { code: "USD", country: "Venezuela (USD)",     flag: "🇻🇪", taxRate: 16 },
  { code: "BOB", country: "Bolivia",            flag: "🇧🇴", taxRate: 13 },
  { code: "PYG", country: "Paraguay",           flag: "🇵🇾", taxRate: 10 },
  { code: "UYU", country: "Uruguay",            flag: "🇺🇾", taxRate: 22 },
] as const;

// ── Plans ─────────────────────────────────────────────────────────────────────

const PLAN_FEATURES = [
  "Tickets de reparación ilimitados",
  "Punto de Venta (POS)",
  "Control de inventario",
  "Cuentas por cobrar (Fiados)",
  "Garantías y historial",
  "Reportes y estadísticas",
  "Técnicos ilimitados",
  "Soporte por WhatsApp",
];

const PLANS = [
  {
    value:  "3_meses" as const,
    label:  "Trimestral",
    period: "3 meses",
    price:  10,
    saving: null,
    color:  "from-slate-500/10 to-slate-600/5",
    border: "border-slate-500/30",
    badge:  "bg-slate-500/20 text-slate-300",
  },
  {
    value:  "6_meses" as const,
    label:  "Semestral",
    period: "6 meses",
    price:  17,
    saving: "Ahorras $3 vs trimestral",
    color:  "from-blue-500/15 to-blue-600/5",
    border: "border-blue-500/50",
    badge:  "bg-blue-500/20 text-blue-300",
    popular: true,
  },
  {
    value:  "1_anio" as const,
    label:  "Anual",
    period: "1 año",
    price:  24,
    saving: "Ahorras $16 vs trimestral",
    color:  "from-purple-500/10 to-purple-600/5",
    border: "border-purple-500/30",
    badge:  "bg-purple-500/20 text-purple-300",
  },
] as const;

type PlanValue = typeof PLANS[number]["value"] | "";

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Cuenta",  icon: faUser       },
  { id: 2, label: "Tienda",  icon: faStore      },
  { id: 3, label: "Plan",    icon: faCreditCard },
] as const;

// ── FormData ──────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  firstName:       string;
  lastName:        string;
  email:           string;
  phone:           string;
  password:        string;
  confirmPassword: string;
  // Step 2
  storeName:       string;
  currencyCode:    string;
  address:         string;
  // Step 3
  planType:        PlanValue;
  enableOtrosServicios: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FiscalBadge({ code }: { code: string }) {
  const fiscal   = getFiscalConfig(code);
  const currency = CURRENCIES.find(c => c.code === code);
  if (!code || !currency) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
      <span className="text-base">{currency.flag}</span>
      <div className="flex flex-col">
        <span className="font-semibold text-foreground">
          {currency.country} · {CURRENCY_SYMBOLS[code] ?? "$"} {code}
        </span>
        <span className="text-muted-foreground">
          Documento: <strong>{fiscal.taxIdLabel}</strong> · Impuesto: <strong>{fiscal.taxLabel} {currency.taxRate}%</strong>
        </span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const supabase = createClient();

  const [step,      setStep]      = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPw,    setShowPw]    = useState(false);
  const [showPw2,   setShowPw2]   = useState(false);

  // Logo state
  const [logoFile,    setLogoFile]    = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    firstName:       "",
    lastName:        "",
    email:           "",
    phone:           "",
    password:        "",
    confirmPassword: "",
    storeName:       "",
    currencyCode:    "PEN",
    address:         "",
    planType:        "",
    enableOtrosServicios: false,
  });

  const set = (key: keyof FormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── Logo handlers ─────────────────────────────────────────────────────────

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("El logo no debe superar 2 MB"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validateStep1 = () => {
    if (!form.firstName.trim())        { toast.error("Ingresa tu nombre");               return false; }
    if (!form.lastName.trim())         { toast.error("Ingresa tu apellido");              return false; }
    if (!form.email.includes("@"))     { toast.error("Correo electrónico inválido");      return false; }
    if (form.password.length < 8)      { toast.error("La contraseña debe tener mínimo 8 caracteres"); return false; }
    if (form.password !== form.confirmPassword) { toast.error("Las contraseñas no coinciden"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.storeName.trim())  { toast.error("Ingresa el nombre del taller"); return false; }
    if (!form.currencyCode)      { toast.error("Selecciona la moneda/país");    return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!form.planType) { toast.error("Selecciona un plan para continuar"); return false; }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setIsLoading(true);

    const fullName  = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const currency  = CURRENCIES.find(c => c.code === form.currencyCode)!;

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options:  { data: { full_name: fullName } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // 2. Crear organización en estado pendiente
      // Generate the org ID client-side so we can use it for logo upload
      // without needing to SELECT back the row (SELECT policy requires org already linked to profile)
      const orgId = crypto.randomUUID();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: orgError } = await (supabase as any)
        .from("organizations")
        .insert({
          id:                     orgId,
          name:                   form.storeName.trim(),
          owner_name:             fullName,
          requested_plan:         form.planType || null,
          is_approved:            false,
          is_active:              false,
          currency_code:          form.currencyCode,
          tax_percentage:         currency.taxRate,
          address:                form.address.trim() || null,
          enable_otros_servicios: form.enableOtrosServicios,
        });
      if (orgError) throw orgError;
      const org = { id: orgId };

      // 3. Subir logo si se cargó
      let logoUrl: string | null = null;
      if (logoFile) {
        const ext  = logoFile.name.split(".").pop() ?? "png";
        const path = `${org.id}/logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("org-logos")
          .upload(path, logoFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);
          logoUrl = urlData.publicUrl;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from("organizations").update({ logo_url: logoUrl }).eq("id", org.id);
        }
      }

      // 4. Actualizar perfil (creado por trigger) con org, rol y datos personales
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({
          full_name:       fullName,
          phone:           form.phone.trim() || null,
          organization_id: org.id,
          role:            "admin",
        })
        .eq("id", authData.user.id);
      if (profileError) throw profileError;

      // ✅ Éxito → pantalla de confirmación
      toast.success("¡Solicitud enviada!");
      await supabase.auth.signOut();
      setStep(4);

    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step indicator ────────────────────────────────────────────────────────

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
              step === s.id  ? "bg-primary text-primary-foreground shadow scale-110" :
              step > s.id    ? "bg-emerald-500 text-white" :
                               "bg-muted text-muted-foreground"
            )}>
              {step > s.id
                ? <FaIcon icon={faCircleCheck} size={14} />
                : <FaIcon icon={s.icon} size={12} />
              }
            </div>
            <span className={cn(
              "text-xs font-medium hidden sm:inline",
              step === s.id ? "text-foreground" : "text-muted-foreground"
            )}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("h-px w-8 transition-all", step > s.id ? "bg-emerald-500" : "bg-border")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-svh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-5">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/techxlighmode.png" alt="TechX" width={180} height={54} priority
            className="object-contain h-14 w-auto mix-blend-multiply dark:mix-blend-normal dark:invert" />
          <p className="text-sm text-muted-foreground">Crea tu cuenta de taller</p>
        </div>

        {/* Step indicator */}
        {step < 4 && <StepIndicator />}

        {/* ════════════════════════════════════════════════════════════
         *  PASO 1 — Datos de cuenta
         * ════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Datos de tu cuenta</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Acceso de administrador para tu taller</p>
            </div>

            <div className="space-y-4">

              {/* Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs">Nombre <span className="text-destructive">*</span></Label>
                  <Input id="firstName" placeholder="Carlos" autoComplete="given-name"
                    value={form.firstName} onChange={e => set("firstName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs">Apellido <span className="text-destructive">*</span></Label>
                  <Input id="lastName" placeholder="Ramírez" autoComplete="family-name"
                    value={form.lastName} onChange={e => set("lastName", e.target.value)} />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Correo electrónico <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <FaIcon icon={faEnvelope} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <Input id="email" type="email" placeholder="admin@mitaller.com" autoComplete="email"
                    className="pl-9" value={form.email} onChange={e => set("email", e.target.value)} />
                </div>
              </div>

              {/* Teléfono (opcional) */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs">
                  Teléfono <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <div className="relative">
                  <FaIcon icon={faPhone} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <Input id="phone" type="tel" placeholder="+51 987 654 321" autoComplete="tel"
                    className="pl-9" value={form.phone} onChange={e => set("phone", e.target.value)} />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Contraseña <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <FaIcon icon={faLock} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    className="pl-9 pr-10"
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    <FaIcon icon={showPw ? faEyeSlash : faEye} size={13} />
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs">Confirmar contraseña <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <FaIcon icon={faLock} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    id="confirmPassword"
                    type={showPw2 ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    className="pl-9 pr-10"
                    value={form.confirmPassword}
                    onChange={e => set("confirmPassword", e.target.value)}
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw2(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    <FaIcon icon={showPw2 ? faEyeSlash : faEye} size={13} />
                  </button>
                </div>
              </div>
            </div>

            <Button className="w-full gap-2" size="lg"
              onClick={() => validateStep1() && setStep(2)}>
              Continuar <FaIcon icon={faArrowRight} size={13} />
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">Inicia sesión</Link>
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
         *  PASO 2 — Datos del taller
         * ════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Tu Taller</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configura los datos básicos — puedes completar el resto en Configuración
              </p>
            </div>

            <div className="space-y-4">

              {/* Nombre del taller */}
              <div className="space-y-1.5">
                <Label htmlFor="storeName" className="text-xs">Nombre del taller <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <FaIcon icon={faStore} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <Input id="storeName" placeholder="TechFix Lima, Celulares del Norte..."
                    className="pl-9" value={form.storeName}
                    onChange={e => set("storeName", e.target.value)} />
                </div>
              </div>

              {/* Moneda / País */}
              <div className="space-y-1.5">
                <Label className="text-xs">País y moneda <span className="text-destructive">*</span></Label>
                <Select value={form.currencyCode} onValueChange={v => set("currencyCode", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(() => {
                        const c = CURRENCIES.find(x => x.code === form.currencyCode);
                        return c ? <span>{c.flag} {c.country} · {c.code}</span> : "Seleccionar país...";
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span>{c.country}</span>
                          <span className="text-muted-foreground text-xs">{c.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Fiscal info automática */}
                {form.currencyCode && <FiscalBadge code={form.currencyCode} />}
              </div>

              {/* Logo (opcional) */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Logo del taller <span className="text-muted-foreground font-normal">(opcional · máx 2 MB)</span>
                </Label>

                {logoPreview ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20">
                    <Image src={logoPreview} alt="Logo preview" width={56} height={56}
                      className="size-14 rounded-lg object-contain border border-border/50 bg-background" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{logoFile?.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {logoFile ? (logoFile.size / 1024).toFixed(0) + " KB" : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive"
                      onClick={removeLogo}>
                      <FaIcon icon={faTrash} size={12} />
                    </Button>
                  </div>
                ) : (
                  <button type="button" onClick={() => logoInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60
                      bg-muted/20 hover:bg-muted/40 hover:border-border transition-all py-5 cursor-pointer">
                    <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
                      <FaIcon icon={faImage} size={16} className="text-muted-foreground/50" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clic para subir logo <span className="text-muted-foreground/50">· PNG, JPG, SVG</span>
                    </p>
                  </button>
                )}

                <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={handleLogoChange} />
              </div>

              {/* Dirección (opcional) */}
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs">
                  Dirección <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <div className="relative">
                  <FaIcon icon={faLocationDot} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <Input id="address" placeholder="Av. Larco 1234, Miraflores"
                    className="pl-9" value={form.address}
                    onChange={e => set("address", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
                <FaIcon icon={faArrowLeft} size={12} /> Atrás
              </Button>
              <Button className="flex-1 gap-2" size="lg"
                onClick={() => validateStep2() && setStep(3)}>
                Continuar <FaIcon icon={faArrowRight} size={13} />
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
         *  PASO 3 — Plan + Módulos
         * ════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Plan y Módulos</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                El superadmin confirmará el acceso y el precio al aprobar tu cuenta
              </p>
            </div>

            {/* Planes */}
            <div className="space-y-2">
              <Label className="text-xs">Selecciona tu plan <span className="text-destructive">*</span></Label>
              <div className="grid gap-2.5 mt-1">
                {PLANS.map(plan => (
                  <button key={plan.value} type="button"
                    onClick={() => set("planType", plan.value)}
                    className={cn(
                      "relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                      `bg-gradient-to-r ${plan.color}`,
                      form.planType === plan.value
                        ? `${plan.border} ring-2 ring-primary/40`
                        : "border-border/50 hover:border-border"
                    )}
                  >
                    {/* Radio */}
                    <div className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      form.planType === plan.value ? "border-primary bg-primary" : "border-muted-foreground/40"
                    )}>
                      {form.planType === plan.value && <div className="size-1.5 rounded-full bg-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{plan.label}</span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", plan.badge)}>
                          {plan.period}
                        </span>
                        {"popular" in plan && plan.popular && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500 text-white">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Precio a consultar con tu reseller</p>
                      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                        {PLAN_FEATURES.map(f => (
                          <li key={f} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <FaIcon icon={faCircleCheck} size={9} className="text-emerald-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Módulo Otros Servicios */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <FaIcon icon={faLockOpen} size={15} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Módulo Otros Servicios</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lleva el control de los unlocks realizados en tu taller
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.enableOtrosServicios}
                  onCheckedChange={v => set("enableOtrosServicios", v)}
                  className="mt-0.5 shrink-0"
                />
              </div>

              {/* Features del módulo */}
              <div className={cn(
                "rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-1.5 transition-all",
                !form.enableOtrosServicios && "opacity-50"
              )}>
                <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-wide">
                  Funciones que activa este módulo:
                </p>
                {[
                  "Llevar control de los unlocks realizados en tu taller",
                  "Control de pagos e historial de servicios",
                  "Control de pagos por cliente",
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <FaIcon icon={faCircleCheck} size={9} className="text-violet-400 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground">
                Puedes activar o desactivar este módulo en cualquier momento desde Configuración.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => setStep(2)} disabled={isLoading}>
                <FaIcon icon={faArrowLeft} size={12} /> Atrás
              </Button>
              <Button className="flex-1 gap-2" size="lg" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <><FaIcon icon={faSpinner} size={13} className="animate-spin" /> Enviando...</>
                ) : (
                  <><FaIcon icon={faCircleCheck} size={13} /> Enviar Solicitud</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
         *  PASO 4 — Confirmación / Pendiente de aprobación
         * ════════════════════════════════════════════════════════════ */}
        {step === 4 && (() => {
          const selectedPlan = PLANS.find(p => p.value === form.planType);
          const waText = encodeURIComponent(
            `Hola TechX, acabo de registrar mi taller "${form.storeName}" con el plan ${selectedPlan?.label ?? ""} (${selectedPlan?.period ?? ""}). Correo: ${form.email}. Quiero coordinar el pago con mi reseller.`
          );
          return (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 shadow-xl text-center space-y-5">
            <div className="flex justify-center">
              <div className="relative">
                <div className="flex size-20 items-center justify-center rounded-full bg-amber-500/20">
                  <FaIcon icon={faClock} size={36} className="text-amber-400" />
                </div>
                <div className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-emerald-500">
                  <FaIcon icon={faCircleCheck} size={14} className="text-white" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">¡Solicitud Enviada!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Tu solicitud para <strong className="text-foreground">{form.storeName}</strong> fue
                recibida. Contacta por WhatsApp para confirmar tu pago y activar tu cuenta.
              </p>
            </div>

            {/* Resumen */}
            <div className="rounded-xl border border-border/50 bg-card p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Resumen de solicitud
              </p>
              <div className="space-y-1.5 text-sm">
                {[
                  { label: "Propietario", value: `${form.firstName} ${form.lastName}` },
                  { label: "Correo",      value: form.email },
                  { label: "Taller",      value: form.storeName },
                  { label: "País",        value: CURRENCIES.find(c => c.code === form.currencyCode)?.country ?? form.currencyCode },
                  ...(form.enableOtrosServicios ? [{ label: "Módulos", value: "Otros Servicios activado" }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
                {/* Plan seleccionado sin precio */}
                {selectedPlan && (
                  <div className="flex justify-between gap-2 pt-1.5 border-t border-border/50 mt-1.5">
                    <span className="text-muted-foreground shrink-0">Plan seleccionado</span>
                    <span className="font-bold text-right text-foreground">
                      {selectedPlan.label}
                      <span className="text-xs font-normal text-muted-foreground"> · {selectedPlan.period}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Reseller CTA */}
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">Completa el pago con tu reseller</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                El precio lo coordina directamente tu reseller autorizado. Contáctalo para activar tu cuenta.
              </p>
              <a
                href={`https://wa.me/51932504098?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-3 text-sm font-semibold text-white"
              >
                <FaIcon icon={faWhatsapp} size={16} />
                Contactar reseller por WhatsApp
              </a>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Volver al inicio de sesión</Link>
            </Button>
          </div>
          );
        })()}

      </div>
    </div>
  );
}

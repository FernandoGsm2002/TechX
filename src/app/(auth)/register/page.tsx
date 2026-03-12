"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  User,
  Store,
  CheckCircle2,
  Loader2,
  Clock,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1: Account
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2: Store
  storeName: string;
  planType: "3_meses" | "6_meses" | "1_anio" | "";
}

// ── Plan config ───────────────────────────────────────────────────────────────

const PLANS = [
  {
    value: "3_meses",
    label: "3 Meses",
    price: "Starter",
    desc: "Ideal para comenzar",
    color: "from-slate-500/20 to-slate-600/10",
    border: "border-slate-500/30",
    badge: "bg-slate-500/20 text-slate-300",
  },
  {
    value: "6_meses",
    label: "6 Meses",
    price: "Pro",
    desc: "Más popular",
    color: "from-blue-500/20 to-blue-600/10",
    border: "border-blue-500/40",
    badge: "bg-blue-500/20 text-blue-300",
    popular: true,
  },
  {
    value: "1_anio",
    label: "1 Año",
    price: "Business",
    desc: "Mejor precio por mes",
    color: "from-purple-500/20 to-purple-600/10",
    border: "border-purple-500/30",
    badge: "bg-purple-500/20 text-purple-300",
  },
] as const;

// ── Steps meta ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Cuenta", icon: User },
  { id: 2, label: "Tienda", icon: Store },
  { id: 3, label: "Listo", icon: CheckCircle2 },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<FormData>({
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
    storeName: "",
    planType: "",
  });

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateStep1 = () => {
    if (!form.ownerName.trim()) { toast.error("Ingresa tu nombre completo"); return false; }
    if (!form.email.includes("@")) { toast.error("Correo inválido"); return false; }
    if (form.password.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return false; }
    if (form.password !== form.confirmPassword) { toast.error("Las contraseñas no coinciden"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.storeName.trim()) { toast.error("Ingresa el nombre de tu taller"); return false; }
    if (!form.planType) { toast.error("Selecciona un plan"); return false; }
    return true;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setIsLoading(true);

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.ownerName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // 2. Crear organización en estado pendiente (is_approved=false, is_active=false)
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: form.storeName,
          owner_name: form.ownerName,
          requested_plan: (form.planType as any) || null,
          is_approved: false,
          is_active: false,
          currency_code: "PEN",
          tax_percentage: 18,
        } as any)
        .select()
        .single();

      if (orgError) throw orgError;

      // 3. Actualizar profile (creado por trigger) con org_id y rol admin
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: form.ownerName,
          organization_id: org.id,
          role: "admin",
        })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      // ✅ Éxito → paso 3
      toast.success("¡Solicitud enviada! Espera la aprobación.");
      await supabase.auth.signOut(); // Logout — no pueden entrar hasta ser aprobados
      setStep(3);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-svh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">

        {/* ── Logo header ── */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/techxlighmode.png"
            alt="TechX"
            width={200}
            height={60}
            priority
            className="object-contain h-16 w-auto"
          />
          <p className="text-sm text-muted-foreground">Crea tu cuenta de taller</p>
        </div>

        {/* ── Step indicator ── */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2">
            {STEPS.slice(0, 2).map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                      step === s.id
                        ? "bg-primary text-primary-foreground shadow-md scale-110"
                        : step > s.id
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step > s.id ? <CheckCircle2 className="size-4" /> : s.id}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      step === s.id ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < 1 && (
                  <div
                    className={cn(
                      "h-px w-10 transition-all",
                      step > s.id ? "bg-emerald-500" : "bg-border"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Datos de tu cuenta</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Crea el acceso para administrar tu taller
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Tu nombre completo</Label>
                <Input
                  id="ownerName"
                  placeholder="Carlos Ramírez"
                  value={form.ownerName}
                  onChange={set("ownerName")}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@mitaller.com"
                  value={form.email}
                  onChange={set("email")}
                  autoComplete="email"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set("password")}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => validateStep1() && setStep(2)}
            >
              Continuar <ArrowRight className="size-4" />
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Inicia sesión
              </Link>
            </p>
          </div>
        )}

        {/* ── Step 2: Store info + plan ── */}
        {step === 2 && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Tu Taller</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Elige un nombre y tu plan de suscripción
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeName">Nombre del taller / tienda</Label>
              <Input
                id="storeName"
                placeholder="TechFix Lima, Celulares del Norte..."
                value={form.storeName}
                onChange={set("storeName")}
              />
            </div>

            {/* Plan selector */}
            <div className="space-y-2">
              <Label>Plan de suscripción</Label>
              <p className="text-xs text-muted-foreground">
                El superadmin confirmará el plan y configurará el precio al aprobar tu cuenta.
              </p>
              <div className="grid gap-3 mt-2">
                {PLANS.map((plan) => (
                  <button
                    key={plan.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, planType: plan.value }))}
                    className={cn(
                      "relative flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                      `bg-gradient-to-r ${plan.color}`,
                      form.planType === plan.value
                        ? `${plan.border} ring-2 ring-primary/50 border-primary/50`
                        : "border-border/50 hover:border-border"
                    )}
                  >
                    {/* Selected indicator */}
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        form.planType === plan.value
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {form.planType === plan.value && (
                        <div className="size-2 rounded-full bg-white" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{plan.label}</span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", plan.badge)}>
                          {plan.price}
                        </span>
                        {"popular" in plan && plan.popular && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-500 text-white">
                            ⭐ Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setStep(1)}
                disabled={isLoading}
              >
                <ArrowLeft className="size-4" /> Atrás
              </Button>
              <Button
                className="flex-1 gap-2"
                size="lg"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="size-4 animate-spin" /> Enviando...</>
                ) : (
                  <><CheckCircle2 className="size-4" /> Enviar Solicitud</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Pending approval screen ── */}
        {step === 3 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 shadow-xl text-center space-y-5">
            <div className="flex justify-center">
              <div className="relative">
                <div className="flex size-20 items-center justify-center rounded-full bg-amber-500/20">
                  <Clock className="size-10 text-amber-400" />
                </div>
                <div className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-emerald-500">
                  <CheckCircle2 className="size-4 text-white" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">¡Solicitud Enviada!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Tu solicitud para <strong className="text-foreground">{form.storeName}</strong> fue
                recibida correctamente. El equipo de TechX revisará tu cuenta y te notificará por correo.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Resumen de solicitud
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Propietario</span>
                  <span className="font-medium">{form.ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Correo</span>
                  <span className="font-medium">{form.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taller</span>
                  <span className="font-medium">{form.storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan solicitado</span>
                  <span className="font-medium capitalize">
                    {PLANS.find((p) => p.value === form.planType)?.price ?? "—"}
                    {" "}({form.planType?.replace("_", " ")})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Mail className="size-3.5" />
              <span>Recibirás una confirmación en <strong>{form.email}</strong></span>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Volver al inicio de sesión</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

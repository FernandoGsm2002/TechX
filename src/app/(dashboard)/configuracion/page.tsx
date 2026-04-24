"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  faGear, faSpinner, faFloppyDisk, faCircleCheck, faClock,
  faBuilding, faPhone, faGlobe, faCommentSms, faMapPin,
  faFileInvoice, faShieldHalved, faImage, faTrash,
  faPrint, faIdCard, faCamera, faCalendarDays, faImagePortrait,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { WA_STYLES, buildWhatsAppMessage, type WhatsAppStyle } from "@/lib/whatsapp";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import { formatMoneyGlobal, getFiscalConfig, CURRENCY_SYMBOLS } from "@/lib/fiscalConfig";

import { useOrganization } from "@/contexts/OrganizationContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { PhoneInput, CURRENCY_TO_DIAL } from "@/components/ui-custom/PhoneInput";

// ── Constants ─────────────────────────────────────────────────────────────────

// Currencies — symbols come from CURRENCY_SYMBOLS (single source of truth)
const CURRENCIES = [
  // — Sudamérica —
  { code: "ARS", label: "Peso argentino — Argentina"        },
  { code: "BOB", label: "Boliviano — Bolivia"               },
  { code: "BRL", label: "Real brasileño — Brasil"           },
  { code: "CLP", label: "Peso chileno — Chile"              },
  { code: "COP", label: "Peso colombiano — Colombia"        },
  { code: "PYG", label: "Guaraní — Paraguay"                },
  { code: "PEN", label: "Sol — Perú"                        },
  { code: "UYU", label: "Peso uruguayo — Uruguay"           },
  // — Países dolarizados (Sudamérica) —
  { code: "VE",  label: "Dólar — Venezuela"                 },
  { code: "EC",  label: "Dólar — Ecuador"                   },
  // — Norteamérica —
  { code: "CAD", label: "Dólar canadiense — Canadá"        },
  { code: "MXN", label: "Peso mexicano — México"            },
  // — Centroamérica —
  { code: "CRC", label: "Colón — Costa Rica"                },
  { code: "GTQ", label: "Quetzal — Guatemala"               },
  { code: "HNL", label: "Lempira — Honduras"                },
  { code: "NIO", label: "Córdoba — Nicaragua"               },
  // — Países dolarizados (Centroamérica) —
  { code: "SV",  label: "Dólar — El Salvador"               },
  { code: "PA",  label: "Dólar (Balboa) — Panamá"           },
  // — Caribe —
  { code: "DOP", label: "Peso dominicano — Rep. Dominicana" },
  // — EE.UU. / Internacional —
  { code: "USD", label: "Dólar — Estados Unidos"            },
  { code: "EUR", label: "Euro"                              },
];

const TAX_OPTIONS = [
  { value: "RUC",      label: "RUC – Perú / Ecuador / Nicaragua / Panamá" },
  { value: "NIT",      label: "NIT – Colombia / Bolivia / Guatemala"       },
  { value: "RUT",      label: "RUT – Chile / Uruguay"                     },
  { value: "RFC",      label: "RFC – México"                              },
  { value: "CUIT",     label: "CUIT – Argentina"                          },
  { value: "CNPJ",     label: "CNPJ – Brasil"                             },
  { value: "RIF",      label: "RIF – Venezuela"                           },
  { value: "NIT_SV",   label: "NIT – El Salvador"                         },
  { value: "RNC",      label: "RNC – Rep. Dominicana"                     },
  { value: "RTN",      label: "RTN – Honduras"                            },
  { value: "NITE",     label: "NITE – Costa Rica"                         },
  { value: "BN",       label: "BN – Canadá"                               },
  { value: "EIN",      label: "EIN – EE.UU."                              },
  { value: "Genérico", label: "Identificación / Genérico"                 },
];

const PRINT_WIDTHS = [
  { value: "58",  label: "58 mm (ticketera estándar)" },
  { value: "80",  label: "80 mm (caja registradora)"  },
];

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  icon, title, description, children,
}: {
  icon: typeof faGear;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FaIcon icon={icon} size={12} />
          </span>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { org, taxLabel, subscriptionEnd, planType, refreshOrg, currencyCode, taxPercentage } =
    useOrganization();
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ─────────────────────────────────────────────────────────────

  // Identity & contact
  const [formName,       setFormName]       = useState("");
  const [formAddress,    setFormAddress]    = useState("");
  const [formPhone,      setFormPhone]      = useState("");
  const [formWebsite,    setFormWebsite]    = useState("");
  const [formWhatsapp,   setFormWhatsapp]   = useState("");

  // Fiscal
  const [formCurrency,   setFormCurrency]   = useState("PEN");
  const [formTaxLabel,   setFormTaxLabel]   = useState("RUC");
  const [formTaxPct,     setFormTaxPct]     = useState("18");
  const [formTaxIdNum,   setFormTaxIdNum]   = useState("");

  // Receipt / tickets
  const [formNotes,      setFormNotes]      = useState("");
  const [formFooter,     setFormFooter]     = useState("");
  const [formPrefix,     setFormPrefix]     = useState("TK");

  // Print settings
  const [formPrintWidth,        setFormPrintWidth]        = useState("58");
  const [formShowLogo,          setFormShowLogo]          = useState(true);
  const [formShowTax,            setFormShowTax]           = useState(true);

  // Modulos avanzados
  const [formEnableOtros, setFormEnableOtros] = useState(false);

  // WhatsApp tone style
  const [waTplStyle, setWaTplStyle] = useState<WhatsAppStyle>("amigable");

  // Logo
  const [formLogoUrl,    setFormLogoUrl]    = useState<string | null>(null);

  // Populate once org loads
  useEffect(() => {
    if (!org) return;
    setFormName(org.name ?? "");
    setFormAddress(org.address ?? "");
    setFormPhone(org.phone ?? "");
    setFormWebsite(org.website ?? "");
    setFormWhatsapp(org.whatsapp ?? "");
    setFormCurrency(org.currency_code ?? "PEN");
    setFormTaxLabel(org.tax_id_name ?? getFiscalConfig(org.currency_code ?? "PEN").taxIdLabel);
    setFormTaxPct(String(org.tax_percentage ?? 18));
    setFormTaxIdNum(org.tax_id_number ?? "");
    setFormNotes(org.receipt_notes ?? "");
    setFormFooter(org.receipt_footer ?? "Gracias por confiar en nosotros.");
    setFormPrefix(org.ticket_prefix ?? "TK");
    setFormPrintWidth(String(org.print_width_mm ?? 58));
    setFormShowLogo(org.show_logo_on_print ?? true);
    setFormShowTax(org.show_tax_breakdown ?? true);
    setFormLogoUrl(org.logo_url ?? null);
    setFormEnableOtros(org.enable_otros_servicios ?? false);

    // WhatsApp tone style
    const tpls = (org.whatsapp_templates ?? {}) as Record<string, string>;
    setWaTplStyle((tpls.style as WhatsAppStyle) ?? "amigable");
  }, [org]);

  // Auto-sugiere el tax label del pais cuando cambia la moneda
  const handleCurrencyChange = (code: string) => {
    setFormCurrency(code);
    const fiscalCfg = getFiscalConfig(code);
    // Solo auto-actualiza si el usuario no ha personalizado manualmente
    setFormTaxLabel(fiscalCfg.taxIdLabel);
  };

  // ── Logo upload ────────────────────────────────────────────────────────────

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("El logo no puede superar 2 MB");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${org.id}/logo.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("org-logos")
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("org-logos")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("organizations")
        .update({ logo_url: publicUrl })
        .eq("id", org.id);

      if (dbErr) throw dbErr;

      setFormLogoUrl(publicUrl);
      await refreshOrg();
      toast.success("Logo actualizado correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir el logo");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }, [org?.id, supabase, refreshOrg]);

  const handleRemoveLogo = useCallback(async () => {
    if (!org?.id || !formLogoUrl) return;
    setIsUploadingLogo(true);
    try {
      const pathMatch = formLogoUrl.match(/org-logos\/(.+?)(\?|$)/);
      if (pathMatch) {
        await supabase.storage.from("org-logos").remove([pathMatch[1]]);
      }
      await supabase.from("organizations").update({ logo_url: null }).eq("id", org.id);
      setFormLogoUrl(null);
      await refreshOrg();
      toast.success("Logo eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar el logo");
    } finally {
      setIsUploadingLogo(false);
    }
  }, [org?.id, formLogoUrl, supabase, refreshOrg]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!org?.id) { toast.error("No se encontró la organización"); return; }

    const taxPctNum = parseFloat(formTaxPct);
    if (isNaN(taxPctNum) || taxPctNum < 0 || taxPctNum > 100) {
      toast.error("El % de impuesto debe estar entre 0 y 100"); return;
    }
    if (!formName.trim() || formName.trim().length < 2) {
      toast.error("El nombre del taller debe tener al menos 2 caracteres"); return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name:              formName.trim(),
        currency_code:     formCurrency,
        tax_percentage:    taxPctNum,
        tax_id_name:       formTaxLabel,
        tax_id_number:     formTaxIdNum.trim() || null,
        address:           formAddress.trim() || null,
        phone:             formPhone.trim() || null,
        website:           formWebsite.trim() || null,
        whatsapp:          formWhatsapp.trim() || null,
        receipt_notes:     formNotes.trim() || null,
        receipt_footer:    formFooter.trim() || null,
        ticket_prefix:     formPrefix.trim() || "TK",
        print_width_mm:    parseInt(formPrintWidth) || 58,
        show_logo_on_print: formShowLogo,
        show_tax_breakdown: formShowTax,
        enable_otros_servicios: formEnableOtros,
        whatsapp_templates: { style: waTplStyle },
      };

      const { error } = await supabase
        .from("organizations")
        .update(payload)
        .eq("id", org.id);

      if (error) throw error;

      await refreshOrg();
      toast.success("Configuración guardada correctamente");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Plan display ───────────────────────────────────────────────────────────
  const planLabel =
    planType === "3_meses" ? "Starter · 3 meses"
    : planType === "6_meses" ? "Pro · 6 meses"
    : planType === "1_anio"  ? "Business · 1 año"
    : planType ?? "—";

  const subEnd = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString("es-PE", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl pb-10">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FaIcon icon={faGear} size={18} /> Configuración del Taller
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Personaliza la información, comprobantes y ajustes de impresión
        </p>
      </div>

      {/* ── 1. Datos del Taller ── */}
      <Section icon={faBuilding} title="Datos del Taller"
        description="Información que aparecerá en todos tus comprobantes e impresiones">
        <div className="space-y-2">
          <Label htmlFor="cfg-name">Nombre del taller *</Label>
          <Input id="cfg-name" placeholder="TechFix Lima" value={formName}
            onChange={(e) => setFormName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cfg-address" className="flex items-center gap-1.5">
            <FaIcon icon={faMapPin} size={12} className="text-muted-foreground" /> Dirección
          </Label>
          <Input id="cfg-address" placeholder="Jr. Las Flores 123, Lima" value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <FaIcon icon={faPhone} size={12} className="text-muted-foreground" /> Teléfono
            </Label>
            <PhoneInput
              value={formPhone}
              onChange={setFormPhone}
              placeholder="999 999 999"
              defaultDialCode={CURRENCY_TO_DIAL[formCurrency] ?? "+51"}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <FaIcon icon={faCommentSms} size={12} className="text-muted-foreground" /> WhatsApp
            </Label>
            <PhoneInput
              value={formWhatsapp}
              onChange={setFormWhatsapp}
              placeholder="999 999 999"
              defaultDialCode={CURRENCY_TO_DIAL[formCurrency] ?? "+51"}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cfg-website" className="flex items-center gap-1.5">
            <FaIcon icon={faGlobe} size={12} className="text-muted-foreground" /> Sitio Web
            <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input id="cfg-website" placeholder="https://mitaller.com" value={formWebsite}
            onChange={(e) => setFormWebsite(e.target.value)} />
        </div>
      </Section>

      {/* ── 2. Logo del Taller ── */}
      <Section icon={faImage} title="Logo del Taller"
        description="Se mostrará en la parte superior de tus comprobantes impresos (máx. 2 MB)">
        <div className="flex items-start gap-4">
          {/* Preview */}
          <div className="shrink-0 size-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
            {formLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={formLogoUrl} alt="Logo" className="object-contain size-full p-1" />
            ) : (
              <FaIcon icon={faImage} size={28} className="text-muted-foreground/30" />
            )}
          </div>

          {/* Actions */}
          <div className="flex-1 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Formatos aceptados: JPG, PNG, WebP, SVG.<br />
              Recomendado: fondo transparente (PNG), 300×100 px mínimo.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isUploadingLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                {isUploadingLogo
                  ? <><FaIcon icon={faSpinner} size={12} className="animate-spin" /> Subiendo...</>
                  : <><FaIcon icon={faImage} size={12} /> {formLogoUrl ? "Cambiar logo" : "Subir logo"}</>
                }
              </Button>
              {formLogoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  disabled={isUploadingLogo}
                  onClick={handleRemoveLogo}
                >
                  <FaIcon icon={faTrash} size={12} /> Eliminar
                </Button>
              )}
            </div>
            <input ref={logoInputRef} type="file" className="hidden"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleLogoUpload} />
          </div>
        </div>
      </Section>

      {/* ── 3. Fiscal ── */}
      <Section icon={faIdCard} title="Información Fiscal"
        description="Divisa, impuestos y documento tributario del negocio">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Tipo de Doc. Tributario</Label>
            <Select value={formTaxLabel} onValueChange={setFormTaxLabel}>
              <SelectTrigger id="cfg-taxlabel"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TAX_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-taxidnum">N° {formTaxLabel}</Label>
            <Input id="cfg-taxidnum" placeholder="20123456789" value={formTaxIdNum}
              onChange={(e) => setFormTaxIdNum(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select value={formCurrency} onValueChange={handleCurrencyChange}>
              <SelectTrigger id="cfg-currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {CURRENCY_SYMBOLS[c.code] ?? c.code} · {c.label} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-taxpct">% Impuesto de Venta</Label>
            <Input id="cfg-taxpct" type="number" step="0.01" min={0} max={100}
              value={formTaxPct} onChange={(e) => setFormTaxPct(e.target.value)} />
          </div>
        </div>
        {/* Preview */}
        <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground flex flex-wrap gap-4">
          <span>Precio: <strong className="text-foreground font-mono">{formatMoneyGlobal(150, formCurrency)}</strong></span>
          <span>Con {formTaxLabel} ({formTaxPct}%): <strong className="text-foreground font-mono">
            {formatMoneyGlobal(150 * (1 + parseFloat(formTaxPct || "0") / 100), formCurrency)}
          </strong></span>
        </div>
      </Section>

      {/* ── 4. Comprobantes / Tickets ── */}
      <Section icon={faFileInvoice} title="Comprobantes y Tickets"
        description="Personaliza el contenido de tus recibos e impresiones">
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <Label htmlFor="cfg-prefix">Prefijo de Ticket</Label>
            <div className="relative">
              <Input id="cfg-prefix" placeholder="TK" maxLength={5}
                value={formPrefix} onChange={(e) => setFormPrefix(e.target.value.toUpperCase())} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                {formPrefix || "TK"}-2026-0001
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cfg-notes">
            Notas / Términos y Condiciones
            <span className="text-xs text-muted-foreground font-normal ml-2">(aparece en el cuerpo del ticket)</span>
          </Label>
          <Textarea
            id="cfg-notes"
            rows={4}
            placeholder={"• La garantía no cubre daños por humedad ni golpes.\n• No nos hacemos responsables por datos del equipo.\n• El equipo no reclamado a los 30 días será vendido para cubrir costos."}
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            className="text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Consejo: incluye política de garantía, responsabilidad de datos y tiempo máximo de recojo.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cfg-footer">
            Mensaje Final del Comprobante
            <span className="text-xs text-muted-foreground font-normal ml-2">(pie de página)</span>
          </Label>
          <Input id="cfg-footer" placeholder="¡Gracias por confiar en nosotros! 😊"
            value={formFooter} onChange={(e) => setFormFooter(e.target.value)} />
        </div>
      </Section>

      {/* ── 5. Impresión ── */}
      <Section icon={faPrint} title="Configuración de Impresión"
        description="Ajusta el formato para tu ticketera térmica">
        <div className="space-y-2">
          <Label>Ancho de papel</Label>
          <Select value={formPrintWidth} onValueChange={setFormPrintWidth}>
            <SelectTrigger id="cfg-printwidth"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRINT_WIDTHS.map((w) => (
                <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Mostrar logo en comprobantes</p>
              <p className="text-xs text-muted-foreground">Si tienes logo subido, aparecerá en el encabezado</p>
            </div>
            <Switch
              id="cfg-showlogo"
              checked={formShowLogo}
              onCheckedChange={setFormShowLogo}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Desglosar impuesto ({formTaxLabel} {formTaxPct}%) en comprobantes</p>
              <p className="text-xs text-muted-foreground">
                Aplica a <strong>Boleta</strong> y <strong>Factura</strong> — muestra subtotal + impuesto separado.
                La <strong>Nota de Venta</strong> siempre muestra solo el total directo.
              </p>
            </div>
            <Switch
              id="cfg-showigv"
              checked={formShowTax}
              onCheckedChange={setFormShowTax}
            />
          </div>
        </div>
      </Section>

      {/* ── 6. Plantillas WhatsApp ── */}
      <Section icon={faWhatsapp} title="Tono de mensajes WhatsApp"
        description="Elige el estilo de comunicación para notificar a tus clientes. Se aplica a todos los mensajes automáticos.">

        {/* Style picker */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WA_STYLES.map((s) => {
            const selected = waTplStyle === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setWaTplStyle(s.key)}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 transition-all ${
                  selected
                    ? "border-green-500/60 bg-green-500/8 shadow-sm"
                    : "border-border/60 bg-muted/20 hover:border-green-500/30 hover:bg-muted/40"
                }`}
              >
                {selected && (
                  <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-green-500 text-white">
                    <FaIcon icon={faCheck} size={9} />
                  </span>
                )}
                <span className="text-2xl leading-none">{s.emoji}</span>
                <span className={`text-xs font-semibold ${selected ? "text-green-400" : "text-foreground"}`}>
                  {s.label}
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {s.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Preview */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Vista previa — mensaje de &quot;completado&quot;</p>
          <div className="rounded-xl bg-[#0b4619]/15 border border-green-500/20 p-3">
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
              {buildWhatsAppMessage({
                phone: "",
                customerName: "Juan García",
                orgName: "TechFix",
                ticketId: "142",
                status: "completado",
                device: "iPhone 14 Pro",
                style: waTplStyle,
              })}
            </pre>
          </div>
        </div>
      </Section>

      {/* ── 8. Módulos Avanzados ── */}
      <Section icon={faGear} title="Módulos Avanzados"
        description="Activa funciones opcionales según las necesidades de tu taller">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <span className="text-violet-400 text-base">&#x1F47B;</span>
                Otros Servicios
              </p>
              <p className="text-xs text-muted-foreground">
                Activa para registrar desbloqueos, software y servicios especiales.
                Solo aparece en el menu si esta habilitado.
              </p>
            </div>
            <Switch
              id="cfg-otros"
              checked={formEnableOtros}
              onCheckedChange={setFormEnableOtros}
            />
          </div>
        </div>
      </Section>

      {/* ── 9. Suscripción ── */}
      <Section icon={faCircleCheck} title="Suscripción"
        description="Estado de tu plan — gestionado por el administrador del sistema">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <FaIcon icon={faCircleCheck} size={13} /> Plan actual
            </span>
            <Badge variant="secondary" className="font-semibold">{planLabel}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <FaIcon icon={faClock} size={13} /> Vencimiento
            </span>
            <span className={`font-semibold ${!subEnd ? "text-muted-foreground" : ""}`}>
              {subEnd ?? "Sin fecha asignada"}
            </span>
          </div>
        </div>
      </Section>

      {/* ── Save button ── */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !org} className="gap-2 min-w-40" size="lg">
          {isSaving
            ? <><FaIcon icon={faSpinner} size={14} className="animate-spin" /> Guardando...</>
            : <><FaIcon icon={faFloppyDisk} size={14} /> Guardar cambios</>
          }
        </Button>
      </div>
    </div>
  );
}

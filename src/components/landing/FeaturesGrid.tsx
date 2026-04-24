"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faScrewdriverWrench,
  faStore,
  faWarehouse,
  faUserShield,
  faMoneyBillTrendUp,
  faFileSignature,
  faWallet,
  faChartPie,
  faEarthAmericas,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface Feature {
  icon: IconDefinition;
  title: string;
  desc: string;
  accent: string;
  bg: string;
}

const FEATURES: Feature[] = [
  {
    icon: faScrewdriverWrench,
    title: "Tickets de Reparación",
    desc: "Registra dispositivos con foto de ingreso, asigna técnicos y da seguimiento en tiempo real. Estados configurables, historial y notificaciones automáticas.",
    accent: "#3B7FFF",
    bg: "#EFF6FF",
  },
  {
    icon: faStore,
    title: "Punto de Venta",
    desc: "Vende accesorios y repuestos con descuentos, múltiples métodos de pago y recibos térmicos.",
    accent: "#10B981",
    bg: "#ECFDF5",
  },
  {
    icon: faWarehouse,
    title: "Inventario",
    desc: "Control de stock con alertas de bajo nivel automáticas e importación masiva por Excel.",
    accent: "#F59E0B",
    bg: "#FFFBEB",
  },
  {
    icon: faWhatsapp,
    title: "WhatsApp Automático",
    desc: "Notifica a tus clientes cuando su equipo esté listo. 4 estilos de tono disponibles.",
    accent: "#25D366",
    bg: "#F0FDF4",
  },
  {
    icon: faUserShield,
    title: "Gestión de Técnicos",
    desc: "Abre cuentas para técnicos y supervísalos. Asigna reparaciones, revisa métricas y controla los accesos.",
    accent: "#8B5CF6",
    bg: "#F5F3FF",
  },
  {
    icon: faMoneyBillTrendUp,
    title: "Finanzas y Dashboard",
    desc: "Panel de ingresos vs gastos, utilidad neta, gráficos por período y exportación a PDF y Excel.",
    accent: "#3B7FFF",
    bg: "#EFF6FF",
  },
  {
    icon: faFileSignature,
    title: "Garantías",
    desc: "Emite garantías, gestiona reclamos y controla reactivaciones con registro histórico de pagos.",
    accent: "#EF4444",
    bg: "#FFF1F2",
  },
  {
    icon: faWallet,
    title: "Cuentas por Cobrar",
    desc: "Controla deudas de clientes, asigna cobros a técnicos y registra cobros y abonos parciales.",
    accent: "#F59E0B",
    bg: "#FFFBEB",
  },
  {
    icon: faChartPie,
    title: "Reportes Avanzados",
    desc: "Reportes multi-tab de ventas, tickets por técnico y gastos. Exporta en Excel o PDF profesional.",
    accent: "#10B981",
    bg: "#ECFDF5",
  },
  {
    icon: faEarthAmericas,
    title: "Fiscal y Monedas",
    desc: "Soporte para múltiples países con moneda, tasa de impuesto y etiquetas (RUC, NIT, RFC, CUIT).",
    accent: "#06B6D4",
    bg: "#ECFEFF",
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <div
      className="group relative flex flex-col h-full"
      style={{
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        border: "1px solid #F1F5F9",
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.3s, transform 0.3s",
        animationDelay: `${index * 60}ms`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = `0 4px 12px rgba(0,0,0,0.06), 0 20px 48px ${feature.accent}18`;
        el.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Top accent line on hover */}
      <div
        className="absolute top-0 left-6 right-6 h-0.5 rounded-b opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(to right, transparent, ${feature.accent}, transparent)` }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: feature.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "transform 0.3s",
          }}
          className="group-hover:scale-110"
        >
          <FontAwesomeIcon icon={feature.icon} style={{ color: feature.accent, width: 20, height: 20 }} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: 700, color: "#0F172A", fontSize: 15.5, marginBottom: 8, lineHeight: 1.25 }}>
            {feature.title}
          </h3>
          <p style={{ color: "#64748B", fontSize: 13.5, lineHeight: 1.65 }}>{feature.desc}</p>
        </div>
      </div>
    </div>
  );
}

export function FeaturesGrid() {
  return (
    <section id="features" style={{ padding: "96px 0", backgroundColor: "#F8FAFC" }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center gap-4 mb-14">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              padding: "5px 14px",
              fontSize: 11,
              fontWeight: 700,
              color: "#3B7FFF",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Funcionalidades
          </span>
          <h2
            style={{
              fontSize: "clamp(28px,5vw,42px)",
              fontWeight: 800,
              color: "#0F172A",
              lineHeight: 1.1,
            }}
          >
            Todo lo que tu taller necesita
          </h2>
          <p style={{ color: "#64748B", fontSize: 16, maxWidth: 480 }}>
            Desde el primer ticket hasta el reporte mensual, TechX lo cubre todo en una sola plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

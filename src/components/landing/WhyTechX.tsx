"use client";

import { AnimateIn } from "@/components/landing/AnimateIn";

const BENEFITS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    title: "Reparaciones Simplificadas",
    desc: "Desde el ingreso hasta la entrega, mantén el control de cada paso y mantén al cliente informado en todo momento.",
    accent: "#3B7FFF",
    bg: "#EFF6FF",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: "Inventario Bajo Control",
    desc: "Visualiza y gestiona tu stock. Evita pérdidas y sabe siempre cuándo necesitas solicitar más refacciones.",
    accent: "#F59E0B",
    bg: "#FFFBEB",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    title: "Ventas y Reparaciones",
    desc: "Vende, repara y cobra desde un mismo lugar. Cada entrada y salida queda registrada para cuadrar sin estrés.",
    accent: "#10B981",
    bg: "#ECFDF5",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    title: "Gestión de Equipo",
    desc: "Controla el rendimiento de tus técnicos. Asigna tareas y evalúa quién solucionó cada dispositivo.",
    accent: "#8B5CF6",
    bg: "#F5F3FF",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: "Tickets Profesionales",
    desc: "Genera tickets detallados que inspiran confianza, con la información clara para ti y para tu cliente.",
    accent: "#EF4444",
    bg: "#FFF1F2",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
        <path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
      </svg>
    ),
    title: "Facturación al Instante",
    desc: "Emite facturas y comprobantes en un solo clic, listo para cumplir con la fiscalización sin esfuerzo extra.",
    accent: "#F97316",
    bg: "#FFF7ED",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    title: "Panel Personalizable",
    desc: "Ajusta las categorías, servicios y el flujo a la manera en que realmente funciona tu negocio.",
    accent: "#06B6D4",
    bg: "#ECFEFF",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: "Seguridad Avanzada",
    desc: "Toda tu información está protegida en la nube con backups automáticos para que no pierdas ningún dato.",
    accent: "#10B981",
    bg: "#ECFDF5",
  },
];

export function WhyTechX() {
  return (
    <section style={{ padding: "96px 0", backgroundColor: "#F8FAFC" }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AnimateIn className="text-center mb-16">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              padding: "5px 14px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              color: "#3B7FFF",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 20,
            }}
          >
            Beneficios
          </span>
          <h2
            style={{
              fontSize: "clamp(28px,4.5vw,42px)",
              fontWeight: 800,
              color: "#0F172A",
              marginBottom: 16,
              lineHeight: 1.15,
            }}
          >
            ¿Por qué elegir TechX?
          </h2>
          <p
            style={{
              color: "#64748B",
              fontSize: 17,
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.65,
            }}
          >
            Una plataforma todo en uno hecha para poner orden a tus reparaciones,
            ventas, inventario y equipo. Sin papel, sin confusión.
          </p>
        </AnimateIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map((benefit, i) => (
            <AnimateIn key={benefit.title} delay={i * 50}>
              <div
                className="h-full group"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  borderRadius: 20,
                  padding: "32px 24px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #F1F5F9",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.3s, transform 0.3s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.06), 0 20px 48px rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: benefit.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                    color: benefit.accent,
                    flexShrink: 0,
                    transition: "transform 0.3s",
                  }}
                  className="group-hover:scale-110"
                >
                  {benefit.icon}
                </div>
                <h3
                  style={{
                    fontWeight: 700,
                    color: "#0F172A",
                    fontSize: 15,
                    marginBottom: 10,
                    lineHeight: 1.35,
                  }}
                >
                  {benefit.title}
                </h3>
                <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.6 }}>
                  {benefit.desc}
                </p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

const FULL_FEATURES = [
  "Técnicos ilimitados",
  "Punto de Venta completo",
  "WhatsApp API integrado",
  "Reportes PDF y Excel exportables",
  "Finanzas y utilidad neta",
  "Módulo fiscal multi-país",
  "Soporte prioritario",
];

function CheckIcon({ color = "#3B7FFF" }: { color?: string }) {
  return (
    <svg viewBox="0 0 16 16" style={{ width: 16, height: 16, fill: color, flexShrink: 0 }}>
      <path d="M13 4l-7 7-3-3 1-1 2 2 6-6z" />
    </svg>
  );
}

const WA_URL = "https://wa.me/51932504098?text=Hola%20TechX%2C%20quiero%20informaci%C3%B3n%20sobre%20precios%20y%20planes.";

export function PricingSection() {
  return (
    <section
      id="pricing"
      style={{
        padding: "96px 0",
        backgroundColor: "#F8FAFC",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16 flex flex-col items-center">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              padding: "5px 16px",
              fontSize: 11,
              fontWeight: 700,
              color: "#3B7FFF",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 20,
            }}
          >
            Precios y Licencias
          </span>
          <h2
            style={{
              fontSize: "clamp(28px,5vw,44px)",
              fontWeight: 900,
              color: "#0F172A",
              marginBottom: 16,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            Activa tu taller y no mires atrás
          </h2>
          <p style={{ color: "#64748B", fontSize: 16, maxWidth: 520, lineHeight: 1.65 }}>
            Sin restricciones. Todos los planes incluyen acceso total a cada funcionalidad desde el día 1.
            Los precios los gestiona tu reseller autorizado.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto mb-12">

          {/* Plan Trimestral */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: 20,
              border: "1px solid #E2E8F0",
              backgroundColor: "#FFFFFF",
              padding: "32px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)",
              transition: "box-shadow 0.3s, transform 0.3s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.06), 0 20px 48px rgba(0,0,0,0.08)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94A3B8", marginBottom: 16 }}>
              Plan Trimestral
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>Precio a consultar</span>
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500, marginBottom: 28 }}>
              Licencia por 3 meses · Vía reseller
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              {FULL_FEATURES.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748B" }}>
                  <CheckIcon color="#CBD5E1" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={WA_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                textAlign: "center",
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                backgroundColor: "#F8FAFC",
                color: "#334155",
                textDecoration: "none",
                padding: "14px 0",
                fontSize: 14,
                fontWeight: 600,
                transition: "background 0.2s, border-color 0.2s",
              }}
              className="hover:bg-slate-100"
            >
              Consultar precio →
            </a>
          </div>

          {/* Plan Semestral — Popular */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              borderRadius: 20,
              border: "2px solid #3B7FFF",
              backgroundColor: "#FFFFFF",
              padding: "32px 24px",
              boxShadow: "0 8px 32px rgba(59,127,255,0.14), 0 2px 8px rgba(59,127,255,0.08)",
              transform: "scale(1.04)",
              zIndex: 10,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "15%",
                right: "15%",
                height: 3,
                borderRadius: "0 0 6px 6px",
                background: "linear-gradient(90deg, transparent, #3B7FFF, transparent)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                background: "linear-gradient(90deg, #3B7FFF, #60A5FA)",
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "6px 20px",
                borderRadius: 999,
                whiteSpace: "nowrap",
                boxShadow: "0 4px 16px rgba(59,127,255,0.35)",
              }}
            >
              Mejor Valor
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#3B7FFF", marginBottom: 16 }}>
              Plan Semestral
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>Precio a consultar</span>
            </div>
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500, marginBottom: 28 }}>
              Licencia por 6 meses · Vía reseller
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              {FULL_FEATURES.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#334155" }}>
                  <CheckIcon color="#3B7FFF" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={WA_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                textAlign: "center",
                borderRadius: 12,
                background: "linear-gradient(90deg, #3B7FFF, #60A5FA)",
                color: "#FFFFFF",
                textDecoration: "none",
                padding: "16px 0",
                fontSize: 15,
                fontWeight: 800,
                boxShadow: "0 4px 20px rgba(59,127,255,0.35)",
                transition: "opacity 0.2s",
              }}
              className="hover:opacity-90"
            >
              <FontAwesomeIcon icon={faWhatsapp} style={{ width: 18, height: 18 }} />
              Consultar con reseller
            </a>
          </div>

          {/* Plan Anual */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: 20,
              border: "1px solid #FDE68A",
              backgroundColor: "#FFFFFF",
              padding: "32px 24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(251,191,36,0.08)",
              transition: "box-shadow 0.3s, transform 0.3s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.06), 0 20px 48px rgba(251,191,36,0.14)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(251,191,36,0.08)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#D97706", marginBottom: 16 }}>
              Plan Anual
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>Precio a consultar</span>
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500, marginBottom: 28 }}>
              Licencia por 1 año · Vía reseller
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              {FULL_FEATURES.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748B" }}>
                  <CheckIcon color="#F59E0B" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={WA_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                textAlign: "center",
                borderRadius: 12,
                border: "1px solid #FDE68A",
                backgroundColor: "#FFFBEB",
                color: "#92400E",
                textDecoration: "none",
                padding: "14px 0",
                fontSize: 14,
                fontWeight: 700,
                transition: "background 0.2s",
              }}
              className="hover:bg-amber-100"
            >
              Consultar precio →
            </a>
          </div>

        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
          ¿Eres reseller o necesitas una instancia dedicada?{" "}
          <a
            href={WA_URL}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#3B7FFF", textDecoration: "none", fontWeight: 700 }}
          >
            Contáctanos →
          </a>
        </p>
      </div>
    </section>
  );
}

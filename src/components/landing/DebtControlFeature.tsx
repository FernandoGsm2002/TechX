"use client";

import { AnimateIn } from "./AnimateIn";

export function DebtControlFeature() {
  return (
    <section
      style={{
        padding: "100px 0",
        backgroundColor: "#FFFFFF",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Soft blue tint blob behind visual */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "-10%",
          width: 600,
          height: 600,
          background: "radial-gradient(ellipse, rgba(59,127,255,0.06) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 24px", position: "relative" }}>
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left">
            <AnimateIn>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <span
                  style={{
                    backgroundColor: "#DCFCE7",
                    border: "1px solid #86EFAC",
                    color: "#16A34A",
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 999,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#22C55E",
                      animation: "pulse 2s infinite",
                      flexShrink: 0,
                    }}
                  />
                  Novedad
                </span>
              </div>

              <h2
                style={{
                  fontSize: "clamp(28px,4vw,42px)",
                  fontWeight: 800,
                  color: "#0F172A",
                  marginBottom: 20,
                  lineHeight: 1.15,
                }}
              >
                Dile adiós al bloc de notas perdidizo.
              </h2>
              <p style={{ color: "#64748B", fontSize: 17, marginBottom: 28, lineHeight: 1.65 }}>
                Olvídate de esos apuntes rápidos donde anotas{" "}
                <span style={{ color: "#334155", fontWeight: 600, fontStyle: "italic" }}>
                  &quot;Luis debe $50 de la reparación&quot;
                </span>
                . TechX cuenta con un módulo de{" "}
                <strong style={{ color: "#0F172A" }}>Cuentas por Cobrar centralizado.</strong>
              </p>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {[
                  "Registro exacto de quién, cuánto y de qué ticket debe.",
                  "Envíale un aviso de deuda por WhatsApp con 1 clic.",
                  "Historial inalterable, imposible perder plata por descuido.",
                ].map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      fontSize: 15,
                      color: "#475569",
                      fontWeight: 500,
                    }}
                  >
                    <div
                      style={{
                        marginTop: 3,
                        width: 20,
                        height: 20,
                        backgroundColor: "#DCFCE7",
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg viewBox="0 0 16 16" style={{ width: 10, height: 10, fill: "#16A34A" }}>
                        <path d="M13 4l-7 7-3-3 1-1 2 2 6-6z" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </AnimateIn>
          </div>

          {/* Visual Card */}
          <div className="flex-1 w-full relative">
            <AnimateIn delay={100}>
              <div
                style={{
                  position: "relative",
                  borderRadius: 24,
                  border: "1px solid #E2E8F0",
                  backgroundColor: "#FFFFFF",
                  padding: 28,
                  boxShadow:
                    "0 4px 16px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.08)",
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                    paddingBottom: 16,
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                    Cuentas por cobrar
                  </div>
                  <div
                    style={{
                      backgroundColor: "#FEE2E2",
                      color: "#DC2626",
                      fontSize: 13,
                      fontWeight: 800,
                      padding: "4px 12px",
                      borderRadius: 999,
                    }}
                  >
                    Deuda Total: $145.00
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Row 1 */}
                  <div
                    style={{
                      border: "1px solid #F1F5F9",
                      borderRadius: 14,
                      padding: "14px 16px",
                      backgroundColor: "#FAFAFA",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                        Luis Martínez (Ticket #1042)
                      </div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3 }}>
                        Hace 3 días · Pantalla iPhone 13
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#DC2626" }}>$80.00</span>
                      <button
                        style={{
                          backgroundColor: "#22C55E",
                          color: "#FFFFFF",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          cursor: "not-allowed",
                        }}
                      >
                        <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: "currentColor" }}>
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                        </svg>
                        Cobrar
                      </button>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div
                    style={{
                      border: "1px solid #F1F5F9",
                      borderRadius: 14,
                      padding: "14px 16px",
                      backgroundColor: "#FAFAFA",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      opacity: 0.75,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                        Andrés Gomez (Ticket #0988)
                      </div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3 }}>
                        Hace 1 semana · Mantenimiento PC
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#DC2626" }}>$65.00</span>
                      <button
                        style={{
                          backgroundColor: "#F1F5F9",
                          color: "#64748B",
                          border: "1px solid #E2E8F0",
                          padding: "6px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "not-allowed",
                        }}
                      >
                        Enviado ✓
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating WhatsApp bubble */}
              <div
                className="hidden md:flex"
                style={{
                  position: "absolute",
                  bottom: -20,
                  right: -20,
                  backgroundColor: "#22C55E",
                  color: "#FFFFFF",
                  padding: "14px 20px",
                  borderRadius: 16,
                  fontWeight: 700,
                  fontSize: 13,
                  boxShadow: "0 8px 24px rgba(34,197,94,0.35)",
                  flexDirection: "column",
                  gap: 3,
                  zIndex: 10,
                  maxWidth: 220,
                }}
              >
                <span style={{ fontWeight: 800 }}>&quot;Hola Luis,&quot;</span>
                <span style={{ opacity: 0.9, fontWeight: 500, fontSize: 12, lineHeight: 1.4 }}>
                  &quot;Tu reparación está lista. Tenías una deuda de $80 pendiente...&quot;
                </span>
              </div>
            </AnimateIn>
          </div>
        </div>
      </div>
    </section>
  );
}

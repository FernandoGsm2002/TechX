"use client";

import { useState } from "react";
import Image from "next/image";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";

const METHODS = [
  {
    id: "binance",
    name: "Binance",
    logo: "/icons/binance.png",
    qr: "/icons/binanceqr.jpeg",
    sub: "Crypto · USDT / BNB",
    action: "Pago directo con QR",
    color: "#F0B90B",
    instruction: "Escanea con la app de Binance para pagar",
  },
  {
    id: "yape",
    name: "Yape",
    logo: "/icons/yape.png",
    qr: "/icons/plinqr.jpeg",
    sub: "Solo Perú",
    action: "Pago directo con QR",
    color: "#7C3AED",
    instruction: "Escanea con la app de Yape para pagar",
  },
  {
    id: "plin",
    name: "Plin",
    logo: "/icons/plin.png",
    qr: "/icons/plinqr.jpeg",
    sub: "Solo Perú",
    action: "Pago directo con QR",
    color: "#06B6D4",
    instruction: "Escanea con la app de Plin para pagar",
  },
];

const WA_NUMBER = "51932504098";
const WA_TEXT = encodeURIComponent(
  "Hola TechX, quiero consultar por otro método de pago para activar mi cuenta."
);

export function PaymentMethods() {
  const [open, setOpen] = useState<string | null>(null);
  const active = METHODS.find((m) => m.id === open) ?? null;

  return (
    <>
      <div
        style={{
          padding: "56px 0 64px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        {/* Label */}
        <span
          style={{
            display: "inline-flex",
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
          Métodos de pago oficiales
        </span>

        {/* Cards row — horizontal scroll on mobile */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 14,
            overflowX: "auto",
            paddingBottom: 4,
            paddingLeft: 16,
            paddingRight: 16,
            width: "100%",
            maxWidth: 900,
            justifyContent: "center",
            scrollbarWidth: "none",
          }}
          className="hide-scrollbar"
        >
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setOpen(m.id)}
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: "24px 28px",
                border: "1px solid #E2E8F0",
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                cursor: "pointer",
                transition: "border-color 0.18s, transform 0.2s, box-shadow 0.2s",
                minWidth: 160,
                outline: "none",
                WebkitTapHighlightColor: "transparent",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = m.color + "66";
                el.style.boxShadow = `0 4px 12px rgba(0,0,0,0.06), 0 12px 32px ${m.color}18`;
                el.style.transform = "translateY(-5px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "#E2E8F0";
                el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)";
                el.style.transform = "translateY(0)";
              }}
            >
              <div style={{ width: 56, height: 56, position: "relative" }}>
                <Image src={m.logo} alt={m.name} fill style={{ objectFit: "contain" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", letterSpacing: "0.06em" }}>
                {m.name.toUpperCase()}
              </span>
              <span style={{ fontSize: 12, color: "#3B7FFF", fontWeight: 600 }}>{m.action}</span>
              <span style={{ fontSize: 10, color: "#94A3B8" }}>{m.sub}</span>
            </button>
          ))}

          {/* WhatsApp — otro método */}
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`}
            target="_blank"
            rel="noreferrer"
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: "24px 28px",
              border: "1px dashed #D1FAE5",
              borderRadius: 20,
              backgroundColor: "#F0FDF4",
              cursor: "pointer",
              textDecoration: "none",
              transition: "border-color 0.18s, transform 0.2s, box-shadow 0.2s",
              minWidth: 160,
              WebkitTapHighlightColor: "transparent",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "#22C55E";
              el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(34,197,94,0.14)";
              el.style.transform = "translateY(-5px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "#D1FAE5";
              el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
              el.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: "#22C55E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(34,197,94,0.3)",
              }}
            >
              <FaIcon icon={faWhatsapp} size={30} className="text-white" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", letterSpacing: "0.06em" }}>
              OTRO MÉTODO
            </span>
            <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>Contactar Soporte</span>
            <span style={{ fontSize: 10, color: "#86EFAC" }}>Vía WhatsApp</span>
          </a>
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── QR Modal ── */}
      {active && (
        <div
          onClick={() => setOpen(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            padding: 20,
          }}
        >
          {/* Modal card */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 24,
              padding: "32px 28px 28px",
              maxWidth: 360,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              position: "relative",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
            }}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(null)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
              }}
            >
              <FaIcon icon={faXmark} size={14} />
            </button>

            {/* Logo + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, position: "relative" }}>
                <Image src={active.logo} alt={active.name} fill style={{ objectFit: "contain" }} />
              </div>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", letterSpacing: "0.04em" }}>
                {active.name.toUpperCase()}
              </span>
            </div>

            {/* Instruction */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "12px 16px",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: "#475569", fontWeight: 500, lineHeight: 1.5 }}>
                {active.instruction}
              </p>
            </div>

            {/* QR image — large and clear */}
            <div
              style={{
                width: "100%",
                aspectRatio: "1",
                position: "relative",
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                backgroundColor: "#fff",
                marginBottom: 16,
              }}
            >
              <Image
                src={active.qr}
                alt={`QR ${active.name}`}
                fill
                style={{ objectFit: "contain" }}
              />
            </div>

            {/* Footer note */}
            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
              Realiza el pago y envía el comprobante por{" "}
              <a
                href={`https://wa.me/${WA_NUMBER}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#22c55e", fontWeight: 700, textDecoration: "none" }}
              >
                WhatsApp
              </a>{" "}
              para activar tu cuenta.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

function StripeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size, flexShrink: 0 }} fill="#635bff" aria-label="Stripe">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </svg>
  );
}

function SunatIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size, fill: "none", flexShrink: 0 }} aria-label="SUNAT">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#f97316" strokeWidth="1.8" />
      <path d="M7 9h10M7 12h6M7 15h8" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="19" cy="6" r="3" fill="#f97316" />
      <path d="M18 6l.8.8 1.2-1.6" stroke="white" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ITEMS = [
  {
    id: "whatsapp",
    name: "WhatsApp API",
    desc: "Notificaciones automáticas",
    icon: <FontAwesomeIcon icon={faWhatsapp} style={{ width: 22, height: 22, color: "#25D366" }} />,
    accent: "#25D366",
  },
  {
    id: "stripe",
    name: "Stripe API",
    desc: "Pagos en línea seguros",
    icon: <StripeIcon size={22} />,
    accent: "#635bff",
  },
  {
    id: "sunat",
    name: "Facturación SUNAT",
    desc: "Comprobantes electrónicos",
    icon: <SunatIcon size={22} />,
    accent: "#f97316",
  },
  {
    id: "realtime",
    name: "Tiempo Real",
    desc: "Push instantáneas",
    icon: <FontAwesomeIcon icon={faBell} style={{ width: 18, height: 18, color: "#a78bfa" }} />,
    accent: "#a78bfa",
  },
];

// Duplicamos para loop infinito
const TRACK = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];

function IntegrationChip({ item }: { item: typeof ITEMS[0] }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 16,
        padding: "10px 18px",
        flexShrink: 0,
        margin: "0 8px",
        minWidth: 190,
        position: "relative",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: 2,
          borderRadius: "0 0 4px 4px",
          background: `linear-gradient(to right, transparent, ${item.accent}, transparent)`,
        }}
      />
      {/* icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${item.accent}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {item.icon}
      </div>
      {/* text */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
          {item.name}
        </span>
        <span style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>{item.desc}</span>
      </div>
    </div>
  );
}

export function IntegrationsTicker() {
  return (
    <section
      style={{
        padding: "56px 0 72px 0",
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
        borderTop: "1px solid #F1F5F9",
        borderBottom: "1px solid #F1F5F9",
      }}
    >
      {/* Header */}
      <div className="flex flex-col items-center px-4" style={{ marginBottom: 48, gap: 12 }}>
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
          Integraciones
        </span>
        <p style={{ fontSize: 15, color: "#6B7280", fontWeight: 500, margin: 0 }}>
          Conectado con las herramientas que ya usas
        </p>
      </div>

      {/* Marquee track */}
      <div style={{ position: "relative" }}>
        {/* Fade edges */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 120,
            zIndex: 10,
            background: "linear-gradient(to right, #FFFFFF, transparent)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 120,
            zIndex: 10,
            background: "linear-gradient(to left, #FFFFFF, transparent)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            width: "max-content",
            animation: "ticker-scroll 24s linear infinite",
          }}
        >
          {TRACK.map((item, i) => (
            <IntegrationChip key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 4)); }
        }
      `}</style>
    </section>
  );
}

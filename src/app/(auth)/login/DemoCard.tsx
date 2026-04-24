"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlask, faCopy, faCheck } from "@fortawesome/free-solid-svg-icons";

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "demo@techx.app";
const DEMO_PASS  = process.env.NEXT_PUBLIC_DEMO_PASS  ?? "TechXDemo2024!";

export function DemoCard() {
  const [copied, setCopied] = useState<"email" | "pass" | null>(null);
  const seeding = false; // Data is permanent, no seeding needed

  const copy = async (value: string, field: "email" | "pass") => {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const fillAndSubmit = () => {
    const emailInput    = document.getElementById("email") as HTMLInputElement | null;
    const passwordInput = document.getElementById("password") as HTMLInputElement | null;
    const form          = emailInput?.closest("form") as HTMLFormElement | null;

    if (emailInput)    emailInput.value    = DEMO_EMAIL;
    if (passwordInput) passwordInput.value = DEMO_PASS;

    // Dispatch change events so React-controlled inputs pick them up (if any)
    emailInput?.dispatchEvent(new Event("input", { bubbles: true }));
    passwordInput?.dispatchEvent(new Event("input", { bubbles: true }));

    form?.requestSubmit();
  };

  return (
    <div
      style={{
        border: "1px solid #1e3a5f",
        borderRadius: 16,
        background: "linear-gradient(135deg, #0f1f35 0%, #0a1628 100%)",
        padding: "20px 20px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top glow strip */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(to right, #38bdf8, #818cf8, #38bdf8)",
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: "rgba(56,189,248,0.15)",
            border: "1px solid rgba(56,189,248,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FontAwesomeIcon icon={faFlask} style={{ width: 14, height: 14, color: "#38bdf8" }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            Probar versión demo
          </p>
          <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
            Datos de ejemplo incluidos · Se restablece en cada sesión
          </p>
        </div>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            fontWeight: 700,
            color: "#4ade80",
            backgroundColor: "rgba(74,222,128,0.1)",
            border: "1px solid rgba(74,222,128,0.3)",
            borderRadius: 999,
            padding: "2px 8px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            flexShrink: 0,
          }}
        >
          GRATIS
        </span>
      </div>

      {/* Credentials */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        <CredentialRow
          label="Correo"
          value={DEMO_EMAIL}
          copied={copied === "email"}
          onCopy={() => copy(DEMO_EMAIL, "email")}
        />
        <CredentialRow
          label="Contraseña"
          value={DEMO_PASS}
          copied={copied === "pass"}
          onCopy={() => copy(DEMO_PASS, "pass")}
        />
      </div>

      {/* CTA button */}
      <button
        type="button"
        onClick={fillAndSubmit}
        disabled={seeding}
        style={{
          width: "100%",
          padding: "10px 0",
          borderRadius: 10,
          border: "none",
          background: seeding
            ? "linear-gradient(135deg, #1e293b, #1e293b)"
            : "linear-gradient(135deg, #38bdf8, #0ea5e9)",
          color: seeding ? "#64748b" : "#0a0a0a",
          fontWeight: 700,
          fontSize: 13,
          cursor: seeding ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: seeding ? "none" : "0 4px 12px rgba(56,189,248,0.25)",
          transition: "all 0.3s",
        }}
      >
        {seeding ? (
          <>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "none", stroke: "currentColor", strokeWidth: 2, animation: "techx-spin 1s linear infinite" }}>
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            Preparando datos demo...
          </>
        ) : (
          "Acceder con cuenta demo →"
        )}
      </button>
      <style>{`@keyframes techx-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        backgroundColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "8px 12px",
      }}
    >
      <span style={{ fontSize: 11, color: "#64748b", width: 72, flexShrink: 0, fontWeight: 600 }}>
        {label}
      </span>
      <code style={{ flex: 1, fontSize: 12, color: "#e2e8f0", fontFamily: "monospace", wordBreak: "break-all" }}>
        {value}
      </code>
      <button
        type="button"
        onClick={onCopy}
        title="Copiar"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 4,
          color: copied ? "#4ade80" : "#475569",
          flexShrink: 0,
          transition: "color 0.2s",
        }}
      >
        <FontAwesomeIcon icon={copied ? faCheck : faCopy} style={{ width: 12, height: 12 }} />
      </button>
    </div>
  );
}

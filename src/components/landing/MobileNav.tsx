"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";

const NAV_LINKS = [
  { href: "#features", label: "Funcionalidades",  sub: "Todo lo que incluye TechX" },
  { href: "#how",      label: "Cómo funciona",    sub: "Del ticket al cobro en 3 pasos" },
  { href: "#pricing",  label: "Precios",           sub: "Planes desde $2/mes" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Hamburger — solo mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden"
        aria-label="Abrir menú"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          backgroundColor: "rgba(255,255,255,0.06)",
          color: "#ffffff",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <FontAwesomeIcon icon={faBars} style={{ width: 17, height: 17 }} />
      </button>

      {/* Full-screen overlay */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            transition: "opacity 0.25s ease",
            opacity: open ? 1 : 0,
          }}
        />

        {/* Slide panel from right */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(88vw, 360px)",
            backgroundColor: "#0F172A",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "-24px 0 60px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
            transform: open ? "translateX(0)" : "translateX(100%)",
            overflow: "hidden",
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Image
              src="/techxlighmode.png"
              alt="TechX"
              width={120}
              height={38}
              style={{ height: 38, width: "auto" }}
            />
            <button
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "#94A3B8",
                cursor: "pointer",
              }}
              aria-label="Cerrar menú"
            >
              <FontAwesomeIcon icon={faXmark} style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: "16px 16px", overflowY: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV_LINKS.map(({ href, label, sub }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    padding: "14px 16px",
                    borderRadius: 14,
                    textDecoration: "none",
                    transition: "background 0.18s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.2 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                    {sub}
                  </span>
                </a>
              ))}
            </div>
          </nav>

          {/* CTA buttons */}
          <div
            style={{
              padding: "16px 20px 32px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                textAlign: "center",
                padding: "13px 0",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
                color: "#CBD5E1",
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 600,
                transition: "background 0.18s",
              }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login?demo=1"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                textAlign: "center",
                padding: "14px 0",
                borderRadius: 12,
                background: "linear-gradient(90deg, #3B7FFF, #60A5FA)",
                color: "#FFFFFF",
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 800,
                boxShadow: "0 4px 20px rgba(59,127,255,0.4)",
              }}
            >
              Probar Demo Gratis →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

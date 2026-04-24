"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ACCENT = "#3B7FFF";

const SLIDES = [
  {
    badge: "Tickets & Reparaciones",
    pre: "TechX la solución para",
    highlight: "tu taller técnico",
    description:
      "Controla tickets, inventario, punto de venta y envía notificaciones por WhatsApp. Todo en una sola plataforma robusta y pensada para ti.",
    bullets: [
      "Gestión de reparaciones en tiempo real",
      "Notificaciones automáticas al cliente vía WhatsApp",
      "Asigna reparaciones a tus tecnicos",
    ],
    lottie: "https://lottie.host/458b26f6-2c89-408b-babc-71bc41c66a19/SQ1B7Xtbw0.lottie",
  },
  {
    badge: "Inventario Inteligente",
    pre: "Controla tu stock",
    highlight: "con precisión total",
    description:
      "Maneja piezas nuevas y repuestos locales, genera alertas de stock bajo y optimiza tus compras.",
    bullets: [
      "Stock nuevo y locales",
      "Alertas de reposición automáticas",
      "Reportes detallados de movimiento",
    ],
    lottie: "https://lottie.host/5e905e6b-e077-41dc-8504-0a2bd8e30d06/kmRb3LUKBA.lottie",
  },
  {
    badge: "Finanzas & POS",
    pre: "Cobra, factura",
    highlight: "y crece tu negocio",
    description:
      "Punto de venta integrado, cuentas por cobrar, reportes financieros y soporte para múltiples divisas latinoamericanas.",
    bullets: [
      "POS integrado con inventario",
      "Soporte PEN, COP, CLP, BRL y más",
      "Control total de deudas y cobros",
    ],
    lottie: "https://lottie.host/40300dc8-ee97-47ae-ada8-93c84911420b/sGe6SwTydi.lottie",
  },
];

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const go = useCallback((idx: number) => {
    setFading(true);
    setTimeout(() => {
      setCurrent(idx);
      setFading(false);
    }, 280);
  }, []);

  const next = useCallback(() => go((current + 1) % SLIDES.length), [current, go]);
  const prev = useCallback(() => go((current - 1 + SLIDES.length) % SLIDES.length), [current, go]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((c) => {
        const nxt = (c + 1) % SLIDES.length;
        setFading(true);
        setTimeout(() => { setCurrent(nxt); setFading(false); }, 280);
        return c;
      });
    }, 6000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const handleGo = (idx: number) => { startTimer(); go(idx); };
  const handleNext = () => { startTimer(); next(); };
  const handlePrev = () => { startTimer(); prev(); };

  const slide = SLIDES[current];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "calc(100vh - 68px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Slide content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          padding: "48px 0 20px",
          opacity: fading ? 0 : 1,
          transform: fading ? "translateY(14px)" : "translateY(0)",
          transition: "opacity 0.28s ease, transform 0.28s ease",
        }}
      >
        <div
          style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", width: "100%" }}
          className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16"
        >
          {/* Left — text */}
          <div className="w-full lg:w-1/2" style={{ zIndex: 2 }}>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: `${ACCENT}22`,
                border: `1px solid ${ACCENT}55`,
                borderRadius: 999,
                padding: "5px 14px",
                marginBottom: 28,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: ACCENT,
                  animation: "pulse 2s infinite",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {slide.badge}
              </span>
            </div>

            {/* Heading */}
            <h1
              style={{
                fontSize: "clamp(32px, 4.5vw, 58px)",
                fontWeight: 800,
                lineHeight: 1.12,
                color: "#ffffff",
                marginBottom: 20,
                letterSpacing: "-0.025em",
              }}
            >
              {slide.pre}{" "}
              <span style={{ color: ACCENT }}>{slide.highlight}</span>
            </h1>

            {/* Description */}
            <p style={{ fontSize: 17, color: "#9ca3af", lineHeight: 1.72, marginBottom: 28, maxWidth: 500 }}>
              {slide.description}
            </p>

            {/* Bullets */}
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 36px 0", display: "flex", flexDirection: "column", gap: 10 }}>
              {slide.bullets.map((b) => (
                <li key={b} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#d1d5db" }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: ACCENT,
                      flexShrink: 0,
                    }}
                  />
                  {b}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button
                onClick={() => router.push("/login?demo=1")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: ACCENT,
                  color: "#fff",
                  border: "none",
                  padding: "13px 28px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: `0 4px 24px ${ACCENT}45`,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  fontFamily: "inherit",
                }}
                className="hover:scale-105"
              >
                Probar Demo Gratis →
              </button>
              <Link
                href="#features"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backgroundColor: "transparent",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "13px 28px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 15,
                  transition: "background 0.2s",
                }}
                className="hover:bg-white/10"
              >
                Ver funcionalidades
              </Link>
              <a
                href="https://mega.nz/file/GCxQHSqR#Ar6pRG4R9479TsgV3varr__QUlUhF-Btd0P740eanH8"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid rgba(56,189,248,0.4)",
                  backgroundColor: "rgba(56,189,248,0.08)",
                  color: "#38bdf8",
                  textDecoration: "none",
                  padding: "13px 22px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  transition: "background 0.2s, border-color 0.2s",
                }}
                className="hover:bg-sky-400/15 hover:border-sky-400/60"
              >
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "currentColor", flexShrink: 0 }}>
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                </svg>
                Descargar para Windows
              </a>
            </div>
          </div>

          {/* Right — Lottie */}
          <div className="w-full lg:w-1/2 flex items-center justify-center">
            <div style={{ width: "100%", maxWidth: 520 }}>
              <DotLottieReact src={slide.lottie} loop autoplay key={slide.lottie} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Carousel controls — estilo ProntoPaga */}
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          paddingBottom: 52,
          paddingTop: 4,
        }}
      >
        {/* ‹ Prev */}
        <button
          onClick={handlePrev}
          aria-label="Slide anterior"
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            fontSize: 22,
            lineHeight: 1,
            padding: "4px 6px",
            fontFamily: "inherit",
            transition: "color 0.2s",
            display: "flex",
            alignItems: "center",
          }}
          className="hover:text-white"
        >
          ‹
        </button>

        {/* Dots */}
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => handleGo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              width: i === current ? 10 : 9,
              height: i === current ? 10 : 9,
              borderRadius: "50%",
              backgroundColor: i === current ? "#ffffff" : "rgba(255,255,255,0.3)",
              border: "none",
              padding: 0,
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: i === current ? "0 0 6px rgba(255,255,255,0.5)" : "none",
            }}
          />
        ))}

        {/* › Next */}
        <button
          onClick={handleNext}
          aria-label="Slide siguiente"
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            fontSize: 22,
            lineHeight: 1,
            padding: "4px 6px",
            fontFamily: "inherit",
            transition: "color 0.2s",
            display: "flex",
            alignItems: "center",
          }}
          className="hover:text-white"
        >
          ›
        </button>
      </div>
    </div>
  );
}

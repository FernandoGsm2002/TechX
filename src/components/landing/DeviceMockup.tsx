"use client";

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard screen — mimics the real TechX sidebar + dashboard
// ─────────────────────────────────────────────────────────────────────────────

function DashboardScreen() {
  return (
    <div className="bg-[#020617] h-full flex overflow-hidden select-none" style={{ fontSize: 6 }}>

      {/* ── Sidebar ── */}
      <div
        className="shrink-0 bg-[#0b1120] border-r border-slate-800/70 flex flex-col py-2 shadow-2xl z-10"
        style={{ width: 88 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-1.5 px-3 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/techxlighmode.png" alt="TechX" className="h-4 w-auto object-contain" />
        </div>

        {/* Dashboard item — active */}
        <div className="mx-2 mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 bg-violet-600/20 border border-violet-500/30">
          <div className="size-1.5 rounded-sm bg-violet-400 shrink-0" />
          <span className="text-violet-300 font-semibold" style={{ fontSize: 5.5 }}>Dashboard</span>
        </div>

        {/* Sections */}
        {[
          {
            label: "SERVICIOS",
            items: [
              { name: "Reparaciones", dot: "bg-sky-400" },
              { name: "Otros Servicios", dot: "bg-violet-400" },
              { name: "Garantías", dot: "bg-emerald-400" },
            ],
          },
          {
            label: "OPERACIONES",
            items: [
              { name: "Clientes", dot: "bg-slate-400" },
              { name: "Punto de Venta", dot: "bg-amber-400" },
              { name: "Por Cobrar", dot: "bg-red-400" },
            ],
          },
          {
            label: "INVENTARIO",
            items: [
              { name: "Productos", dot: "bg-cyan-400" },
              { name: "Rep. Propios", dot: "bg-teal-400" },
            ],
          },
          {
            label: "FINANZAS",
            items: [
              { name: "Panel Financiero", dot: "bg-emerald-400" },
              { name: "Ingresos", dot: "bg-green-400" },
              { name: "Gastos", dot: "bg-rose-400" },
              { name: "Reportes", dot: "bg-indigo-400" },
            ],
          },
        ].map((section) => (
          <div key={section.label} className="mb-1.5">
            <div className="px-3 mb-0.5 text-slate-600 font-bold tracking-widest" style={{ fontSize: 4 }}>
              {section.label}
            </div>
            {section.items.map((item) => (
              <div key={item.name} className="mx-2 flex items-center gap-1.5 rounded px-2 py-0.5 hover:bg-slate-800/40">
                <div className={`size-1 rounded-full shrink-0 ${item.dot}`} />
                <span className="text-slate-400 truncate" style={{ fontSize: 5 }}>{item.name}</span>
              </div>
            ))}
          </div>
        ))}

        {/* Bottom user */}
        <div className="mt-auto mx-2 flex items-center gap-1.5 rounded-md px-2 py-1 bg-slate-800/40 border border-slate-700/30">
          <div className="size-4 rounded-full bg-violet-500/30 border border-violet-500/50 flex items-center justify-center shrink-0">
            <span className="text-violet-300 font-bold" style={{ fontSize: 4 }}>LC</span>
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold truncate" style={{ fontSize: 4.5 }}>Luis Contreras</div>
            <div className="text-slate-500 truncate" style={{ fontSize: 4 }}>Admin · PEN</div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Topbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/60 bg-[#0b1120]/80 shrink-0">
          <div className="flex items-center gap-1 text-slate-500" style={{ fontSize: 5 }}>
            <span>Inicio</span>
            <span>›</span>
            <span className="text-slate-300">inicio</span>
          </div>
          {/* Search bar mock */}
          <div className="flex-1 mx-3 max-w-[120px] flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded px-2 py-0.5">
            <div className="size-1.5 rounded-full bg-slate-600" />
            <span className="text-slate-600 truncate" style={{ fontSize: 4.5 }}>Buscar IMEI, serie...</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-4 rounded bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
              <div className="size-1 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <div className="size-4 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
              <span className="text-violet-300 font-bold" style={{ fontSize: 3.5 }}>LC</span>
            </div>
          </div>
        </div>

        {/* Page header */}
        <div className="px-3 pt-2 pb-1 shrink-0">
          <div className="flex items-baseline gap-1">
            <span className="text-white font-bold" style={{ fontSize: 9 }}>Bienvenido</span>
            <span style={{ fontSize: 8 }}>👋</span>
          </div>
          <div className="text-slate-500" style={{ fontSize: 4.5 }}>Test Tienda 1 · lunes 13 de abril</div>
        </div>

        {/* KPI row 1 */}
        <div className="grid grid-cols-4 gap-1.5 px-3 pb-1 shrink-0">
          {[
            { label: "Tickets activos", value: "2",       accent: "#38bdf8", bg: "rgba(56,189,248,0.07)",  border: "rgba(56,189,248,0.18)" },
            { label: "Listos p/ entregar", value: "0",    accent: "#34d399", bg: "rgba(52,211,153,0.07)",  border: "rgba(52,211,153,0.18)" },
            { label: "Ingresos del mes",value: "S/ 840",  accent: "#a78bfa", bg: "rgba(167,139,250,0.07)", border: "rgba(167,139,250,0.18)" },
            { label: "Por Cobrar",      value: "S/ 0.00", accent: "#fbbf24", bg: "rgba(251,191,36,0.07)",  border: "rgba(251,191,36,0.18)" },
          ].map((k) => (
            <div key={k.label} className="rounded-lg p-1.5" style={{ background: k.bg, border: `1px solid ${k.border}` }}>
              <div className="text-slate-400 mb-0.5 truncate" style={{ fontSize: 4.5 }}>{k.label}</div>
              <div className="font-bold font-mono" style={{ fontSize: 8, color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="mx-3 mb-1.5 bg-[#0d1526] border border-slate-800/50 rounded-xl p-2 flex flex-col shrink-0" style={{ height: 70 }}>
          <div className="flex items-center justify-between mb-1 shrink-0">
            <span className="font-bold text-slate-200" style={{ fontSize: 6 }}>Ingresos del Mes</span>
            <div className="flex gap-2">
              {[["#a78bfa","Reparaciones"],["#34d399","POS"],["#38bdf8","Servicios"]].map(([c,l]) => (
                <span key={l} className="flex items-center gap-0.5 text-slate-500" style={{ fontSize: 4 }}>
                  <span className="inline-block size-1.5 rounded-full" style={{ background: c }} />{l}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <svg viewBox="0 0 240 40" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity=".35"/>
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity=".25"/>
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[10,20,30].map(y => <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>)}
              {/* Main line */}
              <path d="M0,38 C20,35 40,28 60,30 C80,32 100,18 120,16 C140,14 160,22 180,18 C200,14 220,6 240,4 L240,40 L0,40Z" fill="url(#g1)"/>
              <path d="M0,38 C20,35 40,28 60,30 C80,32 100,18 120,16 C140,14 160,22 180,18 C200,14 220,6 240,4" fill="none" stroke="#a78bfa" strokeWidth="1.2"/>
              {/* Secondary line */}
              <path d="M0,40 C20,38 40,36 60,34 C80,32 100,30 120,26 C140,22 160,20 180,18 C200,16 220,14 240,12 L240,40 L0,40Z" fill="url(#g2)"/>
              <path d="M0,40 C20,38 40,36 60,34 C80,32 100,30 120,26 C140,22 160,20 180,18 C200,16 220,14 240,12" fill="none" stroke="#34d399" strokeWidth="1"/>
              {/* X axis ticks */}
            </svg>
          </div>
          <div className="flex justify-between shrink-0">
            {["1 abr","3 abr","5 abr","7 abr","9 abr","11 abr","13 abr"].map(m => (
              <span key={m} className="text-slate-700" style={{ fontSize: 3.5 }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-5 gap-1.5 px-3 pb-2 flex-1 min-h-0">
          {/* Ticket state */}
          <div className="col-span-2 bg-[#0d1526] border border-slate-800/50 rounded-xl p-2 flex flex-col overflow-hidden">
            <span className="font-bold text-slate-200 mb-1.5 shrink-0" style={{ fontSize: 6 }}>Estado de Tickets</span>
            {[
              { label: "Recibido",   value: 0,  color: "bg-slate-500",   pct: "0%" },
              { label: "En proceso", value: 2,  color: "bg-amber-500",   pct: "40%" },
              { label: "Completado", value: 0,  color: "bg-emerald-500", pct: "0%" },
              { label: "Entregado",  value: 6,  color: "bg-sky-500",     pct: "100%" },
            ].map(r => (
              <div key={r.label} className="mb-1">
                <div className="flex justify-between mb-0.5">
                  <span className="text-slate-400" style={{ fontSize: 4.5 }}>{r.label}</span>
                  <span className="text-slate-300 font-bold" style={{ fontSize: 4.5 }}>{r.value}</span>
                </div>
                <div className="h-0.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${r.color}`} style={{ width: r.pct }} />
                </div>
              </div>
            ))}
          </div>

          {/* Resumen del mes */}
          <div className="col-span-2 bg-[#0d1526] border border-slate-800/50 rounded-xl p-2 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <span className="font-bold text-slate-200" style={{ fontSize: 6 }}>Resumen del Mes</span>
              <span className="text-sky-400" style={{ fontSize: 4.5 }}>Detalle</span>
            </div>
            {/* Donut */}
            <div className="flex items-center gap-2 flex-1">
              <svg viewBox="0 0 32 32" className="shrink-0" style={{ width: 32, height: 32 }}>
                <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth="6"/>
                <circle cx="16" cy="16" r="12" fill="none" stroke="#a78bfa" strokeWidth="6"
                  strokeDasharray="75 25" strokeDashoffset="25" strokeLinecap="round"/>
              </svg>
              <div className="flex-1 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-400" style={{ fontSize: 4.5 }}>Ingresos</span>
                  <span className="text-emerald-400 font-bold" style={{ fontSize: 4.5 }}>S/ 840.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400" style={{ fontSize: 4.5 }}>Gastos</span>
                  <span className="text-rose-400 font-bold" style={{ fontSize: 4.5 }}>S/ 12.00</span>
                </div>
                <div className="flex justify-between border-t border-slate-700/50 pt-0.5">
                  <span className="text-slate-300 font-medium" style={{ fontSize: 4.5 }}>Neto</span>
                  <span className="text-white font-bold" style={{ fontSize: 4.5 }}>S/ 828.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="col-span-1 bg-[#0d1526] border border-slate-800/50 rounded-xl p-2 flex flex-col overflow-hidden">
            <span className="font-bold text-slate-200 mb-1.5 shrink-0" style={{ fontSize: 6 }}>Acciones</span>
            {[
              { label: "Nuevo Ticket", bg: "bg-sky-600" },
              { label: "Venta POS",    bg: "bg-emerald-600" },
              { label: "Nuevo Cliente",bg: "bg-slate-700" },
            ].map(a => (
              <div key={a.label} className={`mb-1 rounded px-1.5 py-0.5 ${a.bg} text-white font-medium text-center`} style={{ fontSize: 4.5 }}>
                {a.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MacBook Pro frame with 3-D tilt
// ─────────────────────────────────────────────────────────────────────────────

function LaptopFrame() {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        filter: "drop-shadow(0 60px 80px rgba(0,0,0,0.7)) drop-shadow(0 20px 30px rgba(109,40,217,0.15))",
        transformOrigin: "center center",
      }}
    >
      {/* Lid / screen */}
      <div
        className="relative bg-[#1a1a1a] rounded-t-[14px] overflow-hidden"
        style={{
          width: 560,
          height: 355,
          padding: "9px 9px 16px 9px",
          boxShadow:
            "0 0 0 1.5px #333, 0 0 0 2.5px #111, inset 0 1px 0 rgba(255,255,255,0.06), -12px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Camera notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20">
          <div className="size-1.5 rounded-full bg-[#111] shadow-inner" />
        </div>

        {/* Screen inner glow */}
        <div
          className="absolute pointer-events-none z-10"
          style={{ inset: 9, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }}
        />

        {/* Screen content */}
        <div className="w-full h-full rounded overflow-hidden bg-[#020617]">
          <DashboardScreen />
        </div>

        {/* Left-edge depth shadow (3D effect) */}
        <div
          className="absolute top-0 left-0 bottom-0 pointer-events-none"
          style={{
            width: 20,
            background: "linear-gradient(to right, rgba(0,0,0,0.25), transparent)",
            borderRadius: "14px 0 0 0",
          }}
        />
      </div>

      {/* Hinge line */}
      <div
        style={{
          width: 560,
          height: 2,
          background: "linear-gradient(to right, #111 0%, #444 40%, #555 50%, #333 70%, #111 100%)",
        }}
      />

      {/* Base */}
      <div
        className="relative"
        style={{
          width: 590,
          height: 18,
          borderRadius: "0 0 14px 14px",
          background: "linear-gradient(to bottom, #2e2e2e 0%, #1a1a1a 100%)",
          boxShadow: "0 0 0 1px #111, 0 10px 30px rgba(0,0,0,0.5), -10px 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {/* Trackpad cutout */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bg-[#252525] border border-[#333]"
          style={{ top: 4, width: 90, height: 9, borderRadius: 3 }}
        />
        {/* Rubber feet */}
        {[-245, -80, 80, 245].map((x) => (
          <div
            key={x}
            className="absolute bottom-1 bg-[#111] rounded-full"
            style={{ left: `calc(50% + ${x}px)`, transform: "translateX(-50%)", width: 5, height: 5 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export function DeviceMockup() {
  return (
    <div
      className="relative select-none w-full flex items-center justify-center"
      style={{ minHeight: 440 }}
    >

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden">
        <div className="absolute w-[600px] h-[350px] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute w-[400px] h-[250px] rounded-full bg-sky-500/8 blur-[80px] -translate-x-10 translate-y-6" />
        <div className="absolute w-[200px] h-[200px] rounded-full bg-violet-400/8 blur-[60px] translate-x-32 -translate-y-8" />
      </div>

      {/* Tilted + floating laptop wrapper */}
      <div
        className="relative z-10"
        style={{ animation: "floatLaptop 5s ease-in-out infinite" }}
      >
        {/* 3-D perspective tilt */}
        <div
          style={{
            transform: "perspective(1400px) rotateY(-18deg) rotateX(4deg)",
            transformOrigin: "center center",
          }}
        >
          <LaptopFrame />
        </div>

        {/* Floating badge — ticket listo (top-left) */}
        <div
          className="absolute z-20 flex items-center gap-2 bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-full shadow-2xl shadow-emerald-500/40 border border-emerald-400/30 whitespace-nowrap"
          style={{ top: "12%", left: "-4%", fontSize: 11, animation: "floatBadge1 4.5s ease-in-out infinite" }}
        >
          <div className="size-2 rounded-full bg-white animate-pulse" />
          Ticket listo · TK-040
        </div>

        {/* Floating badge — nueva venta (bottom-right) */}
        <div
          className="absolute z-20 flex items-center gap-2 bg-[#0f172a] border border-slate-700 px-3 py-2 rounded-xl shadow-2xl shadow-sky-500/20 whitespace-nowrap"
          style={{ bottom: "22%", right: "-5%", fontSize: 11, animation: "floatBadge2 5.5s ease-in-out infinite" }}
        >
          <div className="size-4 rounded-md bg-emerald-500/20 flex items-center justify-center">
            <div className="size-2.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-white font-bold">+S/ 480</span>
          <span className="text-slate-400 font-medium">nueva venta POS</span>
        </div>

        {/* Floating badge — WhatsApp (bottom-left) */}
        <div
          className="absolute z-20 flex items-center gap-2 bg-[#0f172a] border border-slate-700 px-3 py-1.5 rounded-xl shadow-xl shadow-black/30 whitespace-nowrap"
          style={{ bottom: "38%", left: "-6%", fontSize: 11, animation: "floatBadge3 6.5s ease-in-out infinite" }}
        >
          <div className="size-4 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 9, height: 9 }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.85L0 24l6.318-1.508A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.37l-.36-.214-3.727.889.934-3.618-.235-.372A9.818 9.818 0 0112 2.182c5.424 0 9.818 4.394 9.818 9.818 0 5.424-4.394 9.818-9.818 9.818z"/>
            </svg>
          </div>
          <span className="text-slate-200">Mensaje enviado</span>
          <span className="text-slate-500" style={{ fontSize: 10 }}>Carlos M.</span>
        </div>
      </div>

      <style>{`
        @keyframes floatLaptop {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }
        @keyframes floatBadge1 {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-7px); }
        }
        @keyframes floatBadge2 {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes floatBadge3 {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { HeroCarousel } from "@/components/landing/HeroCarousel";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { MobileNav } from "@/components/landing/MobileNav";
import { PricingSection } from "@/components/landing/PricingSection";
import { AnimateIn } from "@/components/landing/AnimateIn";
import { WhyTechX } from "@/components/landing/WhyTechX";
import { DebtControlFeature } from "@/components/landing/DebtControlFeature";

export const metadata = {
  title: "TechX",
  description:
    "Gestiona tickets, inventario, POS, finanzas y WhatsApp en una sola plataforma. Hecho para talleres de reparación en Latinoamérica.",
  robots: { index: true, follow: true },
};

const STEPS = [
  {
    num: "01",
    title: "Registra el dispositivo",
    benefit: "Menos de 2 minutos por ingreso",
    desc: "Foto de entrada, detalles del equipo, problema reportado y datos del cliente. Todo queda en el historial con firma digital opcional.",
    img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=800&q=80",
    alt: "Técnico registrando dispositivo",
    accent: "#38bdf8",
    tag: "Recepción",
  },
  {
    num: "02",
    title: "Repara y notifica en tiempo real",
    benefit: "Cliente informado automáticamente",
    desc: "El técnico actualiza el estado y el cliente recibe un WhatsApp automático al instante. Sin llamadas innecesarias, sin confusión.",
    img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
    alt: "Técnico reparando dispositivo",
    accent: "#34d399",
    tag: "Reparación",
  },
  {
    num: "03",
    title: "Cobra, imprime y cierra",
    benefit: "Finanzas actualizadas al instante",
    desc: "Registra el pago, imprime el ticket o factura con un clic. El ingreso se registra en finanzas automáticamente.",
    img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80",
    alt: "Finanzas y reporte",
    accent: "#fbbf24",
    tag: "Cobro",
  },
];


function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-amber-400">
          <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 3.9L8 10.5l-3.6 1.9.7-3.9-2.9-2.8 4-.6z" />
        </svg>
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-white overflow-x-hidden font-inherit">
      {/* ── HEADER */}
      <header className="bg-[#111111]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-7 h-[68px]">
          {/* Logo — grande, como en ProntoPaga */}
          <Link href="/" className="flex items-center no-underline shrink-0">
            <Image
              src="/techxlighmode.png"
              alt="TechX"
              width={200}
              height={64}
              className="h-16 w-auto"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-9 flex-1 justify-center">
            {[
              ["#features", "Funcionalidades"],
              ["#how", "Cómo funciona"],
              ["#pricing", "Precios"],
              ["/tutoriales", "Tutoriales"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-gray-300 no-underline text-sm font-medium transition-colors duration-200 hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Right — 2 botones */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/login"
              className="hidden md:inline-flex bg-transparent border border-white/30 text-white no-underline px-[22px] py-[9px] rounded-lg text-sm font-semibold transition-all duration-200 hover:border-white/50 hover:bg-white/5"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login?demo=1"
              className="hidden md:inline-flex bg-[#3B7FFF] border border-[#3B7FFF] text-white no-underline px-[22px] py-[9px] rounded-lg text-sm font-bold shadow-[0_4px_16px_rgba(59,127,255,0.4)] transition-opacity duration-200 hover:opacity-90"
            >
              Probar demo
            </Link>
            {/* Sandwich — only on mobile */}
            <MobileNav />
          </div>
        </div>
      </header>

      {/* ── HERO CAROUSEL */}
      <section className="relative bg-[#111111] overflow-hidden">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(59,127,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Glow */}
        <div
          className="absolute -top-[160px] left-[30%] w-[700px] h-[600px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(59,127,255,0.08) 0%, transparent 65%)" }}
        />
        <HeroCarousel />
      </section>

      {/* ── LOGO CLOUD / AS SEEN IN (Optional) ── */}
      <section className="bg-[#0f172a] border-y border-white/10 py-5">
        <div className="max-w-[1000px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-5 sm:gap-8">
          <span className="text-sm text-slate-400 font-medium">Disponible en:</span>
          {/* Windows */}
          <a
            href="https://mega.nz/file/GCxQHSqR#Ar6pRG4R9479TsgV3varr__QUlUhF-Btd0P740eanH8"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 bg-slate-800 border border-white/10 text-slate-100 no-underline px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-white/10 hover:border-white/25"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-sky-400 shrink-0">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
            </svg>
            Descargar para Windows
          </a>
          {/* Móvil */}
          <Link
            href="/tutoriales#movil"
            className="inline-flex items-center gap-2.5 bg-slate-800 border border-white/10 text-slate-100 no-underline px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-white/10 hover:border-white/25"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-emerald-400 shrink-0">
              <path d="M17 1H7C5.9 1 5 1.9 5 3v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-5 20c-.83 0-1.5-.67-1.5-1.5S11.17 18 12 18s1.5.67 1.5 1.5S12.83 21 12 21zm5-4H7V4h10v13z" />
            </svg>
            Aplicación Móvil
          </Link>
          {/* Web */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2.5 bg-slate-800 border border-white/10 text-slate-100 no-underline px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-white/10 hover:border-white/25"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-indigo-400 shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Acceso Web
          </Link>
          <Link href="/tutoriales" className="text-[13px] text-slate-500 no-underline transition-colors hover:text-white">
            Ver guías de instalación →
          </Link>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR */}
      <section className="bg-white border-b border-slate-200 py-[18px]">
        <div
          className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 sm:gap-8 max-w-[960px] mx-auto px-6"
        >
          <p className="text-sm text-slate-400 font-medium text-center">
            Más de{" "}
            <span className="text-slate-900 font-bold">99 talleres</span>{" "}
            confían en TechX
          </p>
          <div className="flex items-center gap-1.5">
            {["🇵🇪", "🇨🇴", "🇲🇽", "🇨🇱", "🇧🇷", "🇦🇷", "🇺🇾", "🇧🇴"].map((flag) => (
              <span key={flag} className="text-lg">{flag}</span>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Stars n={5} />
            <span className="text-sm font-bold text-slate-900">4.9</span>
            <span className="text-sm text-slate-400">/ 5 · 200+ reseñas</span>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD SHOWCASE */}
      <section className="bg-white py-20 pb-24 overflow-hidden">
        <div className="max-w-[1152px] mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

            {/* Left — Text */}
            <div className="flex-1 text-center lg:text-left max-w-[480px]">
              <AnimateIn>
                <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-6">
                  Panel Principal
                </span>
                <h2 className="text-[clamp(26px,3.8vw,42px)] font-extrabold text-slate-900 leading-[1.18] mb-5">
                  Monitorea tu taller{" "}
                  <span className="text-blue-500">en tiempo real</span>{" "}
                  desde un panel intuitivo
                </h2>
                <p className="text-base text-slate-500 leading-relaxed mb-8">
                  Tickets activos, ingresos del mes, cuentas por cobrar y estado de reparaciones —
                  todo visible desde el primer segundo. Sin hojas de cálculo, sin suposiciones.
                </p>

                <ul className="list-none p-0 mb-9 flex flex-col gap-3">
                  {[
                    "Estadísticas de ingresos vs gastos en tiempo real",
                    "Estado de tickets por técnico de un vistazo",
                    "Acciones rápidas: nuevo ticket, venta POS, cobro",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14.5px] text-slate-600 font-medium">
                      <div className="mt-[3px] w-[18px] h-[18px] bg-blue-50 rounded-full shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 16 16" className="w-[9px] h-[9px] fill-blue-500">
                          <path d="M13 4l-7 7-3-3 1-1 2 2 6-6z" />
                        </svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login?demo=1"
                  className="inline-flex items-center gap-1.5 text-blue-500 font-bold text-[15px] no-underline hover:underline"
                >
                  Ver el dashboard en vivo →
                </Link>
              </AnimateIn>
            </div>

            {/* Right — Dashboard screenshot in a window frame */}
            <AnimateIn delay={80} className="flex-1 w-full">
              <div className="relative max-w-[640px] mx-auto">
                {/* Glow behind the card */}
                <div className="absolute -inset-8 pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(59,127,255,0.08) 0%, transparent 65%)" }} />

                {/* Window chrome */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.10),0_32px_80px_rgba(59,127,255,0.10)] relative">
                  {/* Title bar */}
                  <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: "#0F172A",
                        borderRadius: 6,
                        padding: "4px 12px",
                        fontSize: 11,
                        color: "#64748B",
                        fontFamily: "monospace",
                        textAlign: "center",
                      }}
                    >
                      app.techxpe.com/inicio
                    </div>
                  </div>

                  {/* Screenshot */}
                  <div className="relative w-full aspect-[16/10]">
                    <Image
                      src="/landingpage.png"
                      alt="TechX Dashboard — Panel Principal"
                      fill
                      className="object-cover object-left-top"
                      priority
                    />
                  </div>
                </div>

                {/* Floating stat badge */}
                <div
                  className="hidden md:flex absolute -bottom-5 -left-6 bg-white border border-slate-200 rounded-[14px] px-[18px] py-3 shadow-[0_8px_24px_rgba(0,0,0,0.10)] flex-col gap-0.5 z-10"
                >
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-[0.06em]">Ingresos del mes</span>
                  <span className="text-[22px] font-black text-emerald-500 leading-none">S/ 1,604</span>
                  <span className="text-[11px] text-green-500 font-semibold">↑ actualizado en vivo</span>
                </div>
              </div>
            </AnimateIn>

          </div>
        </div>
      </section>

      {/* ── WHY TECHX */}
      <WhyTechX />

      {/* ── CUENTAS POR COBRAR (FEATURE DESTACADO) ── */}
      <DebtControlFeature />

      {/* ── FEATURES GRID */}
      <FeaturesGrid />


      {/* ── HOW IT WORKS */}
      <section id="how" className="py-[100px] bg-white">
        <div className="max-w-[1152px] mx-auto px-6">
          <AnimateIn className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-4">
              Proceso
            </span>
            <h2 className="text-[clamp(28px,4vw,42px)] font-extrabold text-slate-900 mb-3">
              De la recepción al cobro
            </h2>
            <p className="text-[17px] text-slate-500 max-w-[480px] mx-auto leading-[1.65]">
              Tres pasos simples para que tú y tu equipo trabajen con más velocidad y menos errores.
            </p>
          </AnimateIn>

          <div className="flex flex-col gap-20">
            {STEPS.map((step, i) => (
              <AnimateIn key={step.num} delay={i * 80}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
                  {/* TEXT — siempre izquierda */}
                  <div className="order-0">
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2"
                        style={{ backgroundColor: step.accent + "18", borderColor: step.accent + "40" }}
                      >
                        <span className="text-base font-black" style={{ color: step.accent }}>{step.num}</span>
                      </div>
                      <span
                        className="text-[11px] font-bold uppercase tracking-[0.1em] px-2.5 py-[3px] rounded-full border"
                        style={{ color: step.accent, backgroundColor: step.accent + "15", borderColor: step.accent + "30" }}
                      >
                        {step.tag}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-3">
                      {step.benefit}
                    </div>
                    <h3 className="text-[clamp(22px,3vw,32px)] font-extrabold text-slate-900 leading-[1.2] mb-4">
                      {step.title}
                    </h3>
                    <p className="text-base text-slate-500 leading-[1.75] mb-7">
                      {step.desc}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: step.accent }}>
                      <svg viewBox="0 0 16 16" className="w-4 h-4" style={{ fill: step.accent }}>
                        <path d="M13 4l-7 7-3-3 1-1 2 2 6-6z" />
                      </svg>
                      Funciona desde el primer día
                    </div>
                  </div>

                  {/* IMAGE — siempre derecha */}
                  <div className="order-1">
                    <div
                      className="relative rounded-[20px] overflow-hidden aspect-[4/3] border border-slate-200"
                      style={{ boxShadow: `0 24px 80px ${step.accent}15` }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={step.img}
                        alt={step.alt}
                        className="w-full h-full object-cover block"
                        loading="lazy"
                      />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.3) 0%, transparent 60%)" }} />
                      {/* Accent corner badge */}
                      <div
                        style={{
                          position: "absolute",
                          top: 16,
                          left: 16,
                          backgroundColor: step.accent,
                          color: "#0a0a0a",
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "4px 12px",
                          borderRadius: 999,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Paso {i + 1}
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>



      {/* ── PRICING */}
      <PricingSection />


      {/* ── FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-6">
        <div className="max-w-[1152px] mx-auto px-6">

          <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-24 mb-16">

            {/* Logo y descripción */}
            <div className="max-w-[320px]">
              <div className="mb-5">
                <Image
                  src="/techxlighmode.png"
                  alt="TechX"
                  width={160}
                  height={52}
                  className="h-[52px] w-auto"
                />
              </div>
              <p className="text-[15px] text-slate-500 leading-[1.65] mb-6">
                Diseñado para aquellos que aún anotan todo en papel.
              </p>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="w-9 h-9 rounded-[10px] bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-500"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-[10px] bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 transition-colors duration-200 hover:bg-pink-50 hover:text-pink-500"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.20 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              </div>
            </div>

            {/* Enlaces */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-16 flex-1 text-sm">
              <div className="flex flex-col gap-4">
                <span className="font-extrabold text-slate-900 uppercase tracking-[0.06em] text-[11px]">Plataforma</span>
                <Link href="#features" className="text-slate-500 no-underline transition-colors hover:text-blue-500">Funcionalidades</Link>
                <Link href="#pricing" className="text-slate-500 no-underline transition-colors hover:text-blue-500">Precios y Licencias</Link>
                <Link href="#how" className="text-slate-500 no-underline transition-colors hover:text-blue-500">Cómo funciona</Link>
              </div>

              <div className="flex flex-col gap-4">
                <span className="font-extrabold text-slate-900 uppercase tracking-[0.06em] text-[11px]">Soporte</span>
                <Link href="/login" className="text-slate-500 no-underline transition-colors hover:text-blue-500">Portal de clientes</Link>
                <Link href="/tutoriales" className="text-slate-500 no-underline transition-colors hover:text-blue-500">Tutoriales</Link>
                <a href="https://wa.me/51932504098" target="_blank" rel="noreferrer" className="text-slate-500 no-underline transition-colors hover:text-green-500">Contactar Ventas</a>
                <a href="https://wa.me/51932504098" target="_blank" rel="noreferrer" className="text-slate-500 no-underline transition-colors hover:text-blue-500">Soporte Técnico</a>
              </div>

              <div className="flex flex-col gap-4 col-span-2 md:col-span-1">
                <span className="font-extrabold text-slate-900 uppercase tracking-[0.06em] text-[11px]">Legal &amp; Trust</span>
                <span className="text-slate-400">Términos de servicio</span>
                <span className="text-slate-400">Privacidad y Datos</span>
              </div>
            </div>
          </div>

          <div
            className="border-t border-slate-200 pt-7 flex flex-col sm:flex-row items-center sm:justify-between gap-3 text-[13px] text-slate-400"
          >
            <span>© {new Date().getFullYear()} TechX. Todos los derechos reservados.</span>
            <span className="flex items-center gap-1">
              Hecho con{" "}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#EF4444"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              {" "}para talleres de Latinoamérica
            </span>
          </div>
        </div>
      </footer>

      {/* ── FLOATING WHATSAPP BUTTON */}
      <a
        href="https://wa.me/51932504098?text=Hola%20TechX%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20los%20planes."
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar con ventas por WhatsApp"
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 bg-green-500 text-white no-underline px-5 py-3 rounded-full font-bold text-sm shadow-[0_8px_30px_rgba(34,197,94,0.45)] whitespace-nowrap transition-all duration-[180ms] hover:scale-105 hover:shadow-[0_12px_40px_rgba(34,197,94,0.55)] group"
      >
        {/* WhatsApp SVG */}
        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 shrink-0">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052.003C5.467.003.093 5.378.093 11.961c0 2.105.549 4.156 1.593 5.966L0 24l6.237-1.636a11.907 11.907 0 0 0 5.815 1.51h.005c6.583 0 11.965-5.375 11.965-11.958a11.82 11.82 0 0 0-3.555-8.414" />
        </svg>
        <span>Contactar con ventas</span>
      </a>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const WINDOWS_DOWNLOAD = "https://mega.nz/file/GCxQHSqR#Ar6pRG4R9479TsgV3varr__QUlUhF-Btd0P740eanH8";

const NAV = [
  {
    group: "CÓMO EMPEZAR",
    items: [
      { id: "bienvenida", label: "Bienvenido a TechX" },
      { id: "windows", label: "Instalar en Windows" },
    ],
  },
  {
    group: "APLICACIÓN MÓVIL",
    items: [
      { id: "safari", label: "Safari" },
      { id: "chrome-movil", label: "Chrome · iOS y Android" },
      { id: "chrome-pc", label: "Chrome en PC" },
    ],
  },
];

export default function TutorialesPage() {
  const [active, setActive] = useState("bienvenida");
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (id: string) => {
    setActive(id);
    setMobileOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 10);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── TOP NAV */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        backgroundColor: "#fff", borderBottom: "1px solid #E7E9EC",
        display: "flex", alignItems: "center", height: 56, padding: "0 20px", gap: 16,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
          <Image src="/techxlighmode.png" alt="TechX" width={110} height={36} style={{ height: 34, width: "auto", filter: "invert(1)" }} priority />
        </Link>
        <div style={{ width: 1, height: 18, backgroundColor: "#D1D5DB", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Tutoriales</span>
        <div style={{ flex: 1 }} />
        <div className="hidden md:flex" style={{ alignItems: "center", gap: 20 }}>
          <Link href="/" style={{ fontSize: 13, color: "#6B7280", textDecoration: "none", fontWeight: 500 }} className="hover:text-gray-900 transition-colors">
            Inicio
          </Link>
          <Link href="/login" style={{
            fontSize: 13, fontWeight: 600, color: "#fff", textDecoration: "none",
            backgroundColor: "#2563EB", padding: "6px 16px", borderRadius: 6,
          }}>
            Iniciar sesión
          </Link>
        </div>
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(o => !o)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#374151" }}
          aria-label="Abrir menú"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 20, height: 20 }}>
            <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd" />
          </svg>
        </button>
      </header>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, backgroundColor: "rgba(0,0,0,0.35)" }} onClick={() => setMobileOpen(false)}>
          <div style={{ width: 256, height: "100%", backgroundColor: "#fff", padding: "24px 0", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <Sidebar active={active} go={go} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", maxWidth: 1160, margin: "0 auto" }}>

        {/* ── SIDEBAR */}
        <aside className="hidden md:block" style={{
          width: 232, flexShrink: 0, position: "sticky", top: 56,
          height: "calc(100vh - 56px)", overflowY: "auto",
          borderRight: "1px solid #E7E9EC", padding: "28px 0",
        }}>
          <Sidebar active={active} go={go} />
        </aside>

        {/* ── CONTENT */}
        <main style={{ flex: 1, minWidth: 0, padding: "52px 48px 96px", maxWidth: 760 }}>

          {/* Bienvenida */}
          <DocSection id="bienvenida" onVisible={() => setActive("bienvenida")}>
            <Breadcrumb>Cómo empezar</Breadcrumb>
            <h1 style={h1}>Bienvenido a TechX</h1>
            <Lead>
              TechX es un sistema de gestión para talleres de reparación de dispositivos electrónicos.
              Puedes acceder desde Windows, desde tu celular o directamente en el navegador.
            </Lead>
            <p style={prose}>
              Esta guía te mostrará cómo instalar la plataforma en cada tipo de dispositivo.
              No es necesario instalar todo — elige la opción que uses a diario.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, margin: "24px 0 0" }}>
              {[
                { title: "Instalar en Windows", desc: "Aplicación de escritorio nativa", id: "windows" },
                { title: "Aplicación móvil", desc: "iPhone y Android via navegador", id: "safari" },
                { title: "Acceso web", desc: "Desde cualquier navegador", href: "https://techxpe.com" },
              ].map(c => (
                <button
                  key={c.title}
                  onClick={() => c.id ? go(c.id) : window.open(c.href, "_blank")}
                  style={{
                    textAlign: "left", padding: "14px 16px", borderRadius: 8,
                    border: "1px solid #E5E7EB", backgroundColor: "#FAFAFA",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  className="hover:border-blue-400 hover:bg-blue-50"
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 3 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.4 }}>{c.desc}</div>
                </button>
              ))}
            </div>
          </DocSection>

          <Divider />

          {/* Windows */}
          <DocSection id="windows" onVisible={() => setActive("windows")}>
            <Breadcrumb>Cómo empezar</Breadcrumb>
            <h2 style={h2}>Instalar en Windows</h2>
            <Lead>Aplicación de escritorio para Windows 10 y 11. Se instala en menos de un minuto.</Lead>

            <InfoBox>
              TechX requiere conexión a internet. Los datos se almacenan en la nube,
              por lo que puedes acceder desde cualquier dispositivo con la misma cuenta.
            </InfoBox>

            <h3 style={h3}>Requisitos del sistema</h3>
            <ul style={ulStyle}>
              <li style={liStyle}><Check />Windows 10 o 11 — 64 bits</li>
              <li style={liStyle}><Check />Conexión a internet</li>
              <li style={liStyle}><Check />Aproximadamente 80 MB de espacio disponible</li>
            </ul>

            <h3 style={h3}>Instalación paso a paso</h3>

            <Step n={1} title="Descarga el instalador">
              Haz clic en el siguiente botón. Se abrirá MEGA para descargar el archivo{" "}
              <Code>TechX_0.1.0_x64-setup.exe</Code>.
            </Step>

            <a
              href={WINDOWS_DOWNLOAD}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 9,
                backgroundColor: "#111827", color: "#fff", textDecoration: "none",
                padding: "10px 20px", borderRadius: 7, fontSize: 14, fontWeight: 600,
                margin: "2px 0 22px", transition: "opacity 0.2s",
              }}
              className="hover:opacity-80"
            >
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar para Windows (.exe)
            </a>

            <Step n={2} title="Ejecuta el instalador">
              Abre el archivo descargado. Si Windows muestra la advertencia{" "}
              <strong>"Windows protegió su equipo"</strong>, haz clic en{" "}
              <strong>"Más información"</strong> y luego en <strong>"Ejecutar de todas formas"</strong>.
              Esta advertencia aparece porque el instalador aún no tiene firma de código extendida.
            </Step>

            <Step n={3} title="Completa la instalación">
              El asistente es automático. Acepta la ruta predeterminada y haz clic en{" "}
              <strong>"Instalar"</strong>. No se requieren permisos de administrador.
            </Step>

            <Step n={4} title="Abre TechX">
              Una vez instalado, el ícono de TechX aparecerá en el escritorio. Ábrelo e
              inicia sesión con tu cuenta.
            </Step>

            <TipBox>
              Para acceso rápido, fija TechX a la barra de tareas: clic derecho sobre el ícono
              en la barra inferior y selecciona <strong>"Anclar a la barra de tareas"</strong>.
            </TipBox>
          </DocSection>

          <Divider />

          {/* Safari */}
          <DocSection id="safari" onVisible={() => setActive("safari")}>
            <Breadcrumb>Aplicación móvil</Breadcrumb>
            <h2 style={h2}>Safari</h2>
            <Lead>
              Instala TechX en tu iPhone o iPad desde Safari.
              Al instalarlo, aparece como una app en la pantalla de inicio y se abre en pantalla completa.
            </Lead>

            <h3 style={h3}>Pasos</h3>
            <Step n={1} title='Abre Safari y ve a techxpe.com'>
              Asegúrate de usar Safari — es el navegador con el ícono de brújula azul que viene por defecto en iPhone e iPad.
            </Step>
            <Step n={2} title="Toca el botón Compartir">
              En la barra inferior de Safari toca el ícono de compartir: un cuadrado con una flecha apuntando hacia arriba.
              En iPad lo encontrarás en la esquina superior derecha.
            </Step>
            <Step n={3} title='"Agregar a pantalla de inicio"'>
              Desplázate en el menú que aparece y toca <strong>"Agregar a pantalla de inicio"</strong>.
            </Step>
            <Step n={4} title='Confirma tocando "Agregar"'>
              Puedes editar el nombre si lo deseas. Toca <strong>"Agregar"</strong> en la esquina superior derecha para confirmar.
            </Step>
            <Step n={5} title="Abre TechX desde la pantalla de inicio">
              El ícono de TechX aparecerá en tu pantalla de inicio. Al abrirlo,
              se cargará en pantalla completa sin la barra de Safari.
            </Step>
          </DocSection>

          <Divider />

          {/* Chrome móvil */}
          <DocSection id="chrome-movil" onVisible={() => setActive("chrome-movil")}>
            <Breadcrumb>Aplicación móvil</Breadcrumb>
            <h2 style={h2}>Chrome · iOS y Android</h2>
            <Lead>
              El proceso de instalación es el mismo en iPhone y Android cuando usas Google Chrome.
            </Lead>

            <h3 style={h3}>Pasos</h3>
            <Step n={1} title="Abre Chrome y ve a techxpe.com">
              Escribe la dirección en la barra de búsqueda de Chrome.
            </Step>
            <Step n={2} title="Abre el menú de Chrome">
              Toca los tres puntos que aparecen en la esquina de la pantalla.
              En iPhone están abajo a la derecha; en Android arriba a la derecha.
            </Step>
            <Step n={3} title='"Añadir a pantalla de inicio"'>
              Selecciona <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Instalar app"</strong>.
              En algunos dispositivos Chrome muestra automáticamente un banner en la parte inferior de la pantalla — también puedes tocarlo directamente.
            </Step>
            <Step n={4} title="Confirma la instalación">
              Toca <strong>"Instalar"</strong> o <strong>"Agregar"</strong> en el diálogo que aparece.
              El ícono de TechX quedará en tu pantalla de inicio.
            </Step>

            <TipBox>
              El resultado es el mismo que con Safari: la app se abre en pantalla completa,
              sin barras del navegador, igual que una app descargada desde la tienda.
            </TipBox>
          </DocSection>

          <Divider />

          {/* Chrome PC */}
          <DocSection id="chrome-pc" onVisible={() => setActive("chrome-pc")}>
            <Breadcrumb>Aplicación móvil</Breadcrumb>
            <h2 style={h2}>Chrome en PC</h2>
            <Lead>
              En Windows, Mac o Linux puedes instalar TechX como una app de escritorio directamente desde Chrome,
              sin necesidad del instalador.
            </Lead>

            <h3 style={h3}>Pasos</h3>
            <Step n={1} title="Ve a techxpe.com en Chrome">
              Abre Google Chrome en tu computadora y escribe la dirección.
            </Step>
            <Step n={2} title="Busca el ícono de instalación en la barra de direcciones">
              A la derecha de la barra de direcciones verás un ícono de pantalla con una flecha de descarga.
              Haz clic en él.
            </Step>
            <Step n={3} title='Haz clic en "Instalar"'>
              En el diálogo que aparece confirma la instalación. TechX se abrirá en su propia ventana,
              independiente del navegador, y quedará disponible desde el menú inicio o el escritorio.
            </Step>

            <InfoBox>
              Si no ves el ícono de instalación, haz clic en el menú de Chrome (los tres puntos) y busca la opción{" "}
              <strong>"Instalar TechX..."</strong> o <strong>"Guardar e instalar"</strong>.
            </InfoBox>
          </DocSection>

          <Divider />

          {/* CTA soporte */}
          <div style={{
            backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD",
            borderRadius: 10, padding: "24px 28px",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0C4A6E", margin: "0 0 6px" }}>
              ¿Necesitas ayuda con la instalación?
            </h3>
            <p style={{ fontSize: 14, color: "#0369A1", margin: "0 0 18px", lineHeight: 1.6 }}>
              Contáctanos por WhatsApp y te guiamos en minutos.
            </p>
            <a
              href="https://wa.me/51932504098?text=Hola%20TechX%2C%20necesito%20ayuda%20para%20instalar%20la%20aplicaci%C3%B3n."
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                backgroundColor: "#22c55e", color: "#fff", textDecoration: "none",
                padding: "9px 20px", borderRadius: 7, fontWeight: 600, fontSize: 14,
              }}
              className="hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" fill="white" style={{ width: 17, height: 17, flexShrink: 0 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052.003C5.467.003.093 5.378.093 11.961c0 2.105.549 4.156 1.593 5.966L0 24l6.237-1.636a11.907 11.907 0 0 0 5.815 1.51h.005c6.583 0 11.965-5.375 11.965-11.958a11.82 11.82 0 0 0-3.555-8.414" />
              </svg>
              Contactar soporte
            </a>
          </div>

        </main>
      </div>
    </div>
  );
}

/* ── Sidebar */
function Sidebar({ active, go }: { active: string; go: (id: string) => void }) {
  return (
    <nav style={{ padding: "0 12px" }}>
      {NAV.map(group => (
        <div key={group.group} style={{ marginBottom: 28 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "#9CA3AF",
            textTransform: "uppercase", letterSpacing: "0.07em",
            margin: "0 0 6px", padding: "0 8px",
          }}>
            {group.group}
          </p>
          {group.items.map(item => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "7px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 13,
                fontWeight: active === item.id ? 600 : 400,
                color: active === item.id ? "#2563EB" : "#374151",
                backgroundColor: active === item.id ? "#EFF6FF" : "transparent",
                fontFamily: "inherit", transition: "background 0.12s, color 0.12s",
                marginBottom: 1,
              }}
              className={active !== item.id ? "hover:bg-gray-100" : ""}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

/* ── Section with IntersectionObserver */
function DocSection({ id, onVisible, children }: { id: string; onVisible: () => void; children: React.ReactNode }) {
  return (
    <section
      id={id}
      style={{ scrollMarginTop: 80 }}
      ref={(el) => {
        if (!el) return;
        const obs = new IntersectionObserver(
          ([e]) => { if (e.isIntersecting) onVisible(); },
          { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
        );
        obs.observe(el);
      }}
    >
      {children}
    </section>
  );
}

/* ── Sub-components */
function Breadcrumb({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>
      {children}
    </p>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 16, color: "#374151", lineHeight: 1.7, margin: "0 0 24px" }}>{children}</p>;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", backgroundColor: "#EFF6FF",
        border: "1.5px solid #BFDBFE", display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, marginTop: 2,
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#2563EB" }}>{n}</span>
      </div>
      <div>
        <p style={{ fontWeight: 700, color: "#111827", margin: "0 0 3px", fontSize: 14 }}>{title}</p>
        <p style={{ color: "#6B7280", margin: 0, fontSize: 14, lineHeight: 1.65 }}>{children}</p>
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: "#F0F9FF", borderLeft: "3px solid #0EA5E9",
      borderRadius: "0 7px 7px 0", padding: "11px 14px", margin: "0 0 22px",
      display: "flex", gap: 9, alignItems: "flex-start",
    }}>
      <svg viewBox="0 0 20 20" fill="#0284C7" style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }}>
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
      </svg>
      <p style={{ fontSize: 13, color: "#0369A1", margin: 0, lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: "#F0FDF4", borderLeft: "3px solid #22C55E",
      borderRadius: "0 7px 7px 0", padding: "11px 14px", margin: "16px 0 0",
      display: "flex", gap: 9, alignItems: "flex-start",
    }}>
      <svg viewBox="0 0 20 20" fill="#16A34A" style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }}>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
      <p style={{ fontSize: 13, color: "#15803D", margin: 0, lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" style={{ width: 13, height: 13, fill: "#22C55E", flexShrink: 0 }}>
      <path d="M13 4l-7 7-3-3 1-1 2 2 6-6z" />
    </svg>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      backgroundColor: "#F3F4F6", border: "1px solid #E5E7EB",
      borderRadius: 4, padding: "1px 5px", fontSize: 12,
      fontFamily: "ui-monospace, monospace", color: "#374151",
    }}>
      {children}
    </code>
  );
}

function Divider() {
  return <hr style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "44px 0" }} />;
}

/* ── Style constants */
const h1: React.CSSProperties = { fontSize: 30, fontWeight: 800, color: "#111827", margin: "6px 0 14px", letterSpacing: "-0.02em", lineHeight: 1.2 };
const h2: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: "#111827", margin: "6px 0 12px", letterSpacing: "-0.015em", lineHeight: 1.25 };
const h3: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#111827", margin: "22px 0 10px" };
const prose: React.CSSProperties = { fontSize: 15, color: "#4B5563", lineHeight: 1.75, margin: "0 0 20px" };
const ulStyle: React.CSSProperties = { listStyle: "none", padding: 0, margin: "0 0 22px", display: "flex", flexDirection: "column", gap: 7 };
const liStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#374151" };

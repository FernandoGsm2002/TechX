"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faTicket,
  faCashRegister,
  faBoxesStacked,
  faHandHoldingDollar,
  faUsers,
  faScrewdriverWrench,
  faGear,
  faChartBar,
  faBellConcierge,
  faCircleUser,
  faArrowTrendDown,
  faArrowTrendUp,
  faShieldHalved,
  faCirclePlay,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  title: string;
  href: string;
  icon: IconDefinition;
  /** Roles que NO pueden ver este ítem (lista negra) */
  hiddenForRoles?: ("admin" | "tecnico" | "superadmin")[];
  /** Solo visible para el rol indicado */
  onlyForRole?: "admin" | "tecnico" | "superadmin";
  requireOtrosServicios?: boolean;
  /** Si true, renderiza un separador vertical antes de este ítem */
  sectionStart?: boolean;
}

/**
 * Orden por sección — espeja el Sidebar desktop:
 *   SERVICIOS · OPERACIONES · INVENTARIO · FINANZAS · CUENTA
 */
const NAV_ITEMS: NavItem[] = [
  // ── SERVICIOS ──
  { title: "Inicio",     href: "/inicio",            icon: faHouse },
  { title: "Tickets",    href: "/tickets",           icon: faTicket },
  { title: "Servicios",  href: "/otros-servicios",   icon: faScrewdriverWrench, requireOtrosServicios: true },
  { title: "Garantías",  href: "/garantias",         icon: faShieldHalved },
  // ── OPERACIONES ──
  { title: "Clientes",   href: "/clientes",          icon: faUsers,             sectionStart: true },
  { title: "POS",        href: "/pos",               icon: faCashRegister },
  { title: "Fiados",     href: "/fiados",            icon: faHandHoldingDollar, hiddenForRoles: ["tecnico"] },
  { title: "Mis Cobros", href: "/cobros",            icon: faBellConcierge,     onlyForRole: "tecnico" },
  //  INVENTARIO 
  { title: "Inventario", href: "/inventario",        icon: faBoxesStacked,      sectionStart: true },
  //  FINANZAS 
  { title: "Ingresos",   href: "/finanzas/ingresos", icon: faArrowTrendUp,      hiddenForRoles: ["tecnico"], sectionStart: true },
  { title: "Gastos",     href: "/finanzas/gastos",   icon: faArrowTrendDown,    sectionStart: true },
  { title: "Reportes",   href: "/reportes",          icon: faChartBar,          hiddenForRoles: ["tecnico"] },
  //  CUENTA 
  { title: "Config",     href: "/configuracion",     icon: faGear,              hiddenForRoles: ["tecnico"], sectionStart: true },
  { title: "Perfil",     href: "/perfil",            icon: faCircleUser,        sectionStart: true },
  // AYUDA
  { title: "Tutoriales", href: "/tutoriales",        icon: faCirclePlay,        sectionStart: true },
];

//  Component 

export function MobileNav() {
  const pathname = usePathname();
  const { role, enableOtrosServicios } = useOrganization();

  const currentRole = (role ?? "tecnico") as "admin" | "tecnico" | "superadmin";

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.hiddenForRoles?.includes(currentRole)) return false;
    if (item.onlyForRole && item.onlyForRole !== currentRole) return false;
    if (item.requireOtrosServicios && !enableOtrosServicios) return false;
    return true;
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className="flex h-[54px] items-stretch overflow-x-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {visibleItems.map((item, idx) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <React.Fragment key={item.href}>
              {item.sectionStart && idx > 0 && (
                <div className="w-px self-stretch my-2 bg-border/50 shrink-0" />
              )}
            <Link
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-[3px]",
                "flex-1 min-w-[56px] max-w-[84px] shrink-0 px-1",
                "transition-colors duration-150 select-none active:opacity-70",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-7 rounded-b-full bg-primary" />
              )}

              <FontAwesomeIcon
                icon={item.icon}
                style={{ width: 17, height: 17 }}
                className={cn(
                  "transition-transform duration-150",
                  isActive && "scale-110"
                )}
              />

              <span
                className={cn(
                  "text-[9px] font-medium leading-none tracking-tight whitespace-nowrap",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.title}
              </span>
            </Link>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}

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
  faConciergeBell,
  faCircleUser,
  faArrowTrendDown,
  faArrowTrendUp,
  faShieldHalved,
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
  requireOtrosServicios?: boolean;
}

/**
 * Permisos móvil — COINCIDE con el Sidebar web:
 *
 * TÉCNICO ve TODO excepto: Ingresos, Reportes, Config
 * ADMIN ve TODO excepto: (nada — lo ve todo)
 *
 * Orden:
 *   Inicio · Tickets · POS · Inventario · Servicios · Clientes ·
 *   Fiados · Garantías · Ingresos · Gastos · Reportes · Config · Perfil
 */
const NAV_ITEMS: NavItem[] = [
  { title: "Inicio",     href: "/",                 icon: faHouse },
  { title: "Tickets",    href: "/tickets",           icon: faTicket },
  { title: "POS",        href: "/pos",               icon: faCashRegister },
  { title: "Inventario", href: "/inventario",        icon: faBoxesStacked },
  { title: "Servicios",  href: "/otros-servicios",   icon: faScrewdriverWrench, requireOtrosServicios: true },
  { title: "Clientes",   href: "/clientes",          icon: faUsers },
  { title: "Fiados",     href: "/fiados",            icon: faHandHoldingDollar },
  { title: "Garantías",  href: "/garantias",         icon: faShieldHalved },
  { title: "Ingresos",   href: "/finanzas/ingresos", icon: faArrowTrendUp,      hiddenForRoles: ["tecnico"] },
  { title: "Gastos",     href: "/finanzas/gastos",   icon: faArrowTrendDown },
  { title: "Reportes",   href: "/reportes",          icon: faChartBar,          hiddenForRoles: ["tecnico"] },
  { title: "Config",     href: "/configuracion",     icon: faGear,              hiddenForRoles: ["tecnico"] },
  { title: "Perfil",     href: "/perfil",            icon: faCircleUser },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname();
  const { role, enableOtrosServicios } = useOrganization();

  const currentRole = (role ?? "tecnico") as "admin" | "tecnico" | "superadmin";

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.hiddenForRoles?.includes(currentRole)) return false;
    if (item.requireOtrosServicios && !enableOtrosServicios) return false;
    return true;
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className="flex h-[54px] items-stretch overflow-x-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
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
          );
        })}
      </div>
    </nav>
  );
}

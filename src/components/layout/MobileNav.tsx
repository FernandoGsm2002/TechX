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
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  title: string;
  href: string;
  icon: IconDefinition;
  roles: ("admin" | "tecnico" | "superadmin")[];  // qué roles lo ven
  requireOtrosServicios?: boolean;
}

// ── Items — orden estratégico: los más usados primero ─────────────────────────
// Técnico ve: Inicio · Tickets · POS · Inventario · (Servicios) · Perfil = 5-6 ítems (caben sin scroll)
// Admin ve todos = 10-11 ítems con scroll

const NAV_ITEMS: NavItem[] = [
  {
    title: "Inicio",
    href: "/",
    icon: faHouse,
    roles: ["admin", "tecnico", "superadmin"],
  },
  {
    title: "Tickets",
    href: "/tickets",
    icon: faTicket,
    roles: ["admin", "tecnico", "superadmin"],
  },
  {
    title: "POS",
    href: "/pos",
    icon: faCashRegister,
    roles: ["admin", "tecnico", "superadmin"],
  },
  {
    title: "Inventario",
    href: "/inventario",
    icon: faBoxesStacked,
    roles: ["admin", "tecnico", "superadmin"],
  },
  {
    title: "Servicios",
    href: "/otros-servicios",
    icon: faScrewdriverWrench,
    roles: ["admin", "tecnico", "superadmin"],
    requireOtrosServicios: true,
  },
  {
    title: "Clientes",
    href: "/clientes",
    icon: faUsers,
    roles: ["admin", "superadmin"],
  },
  {
    title: "Fiados",
    href: "/fiados",
    icon: faHandHoldingDollar,
    roles: ["admin", "superadmin"],
  },
  {
    title: "Reportes",
    href: "/reportes",
    icon: faChartBar,
    roles: ["admin", "superadmin"],
  },
  {
    title: "Garantías",
    href: "/garantias",
    icon: faConciergeBell,
    roles: ["admin", "superadmin"],
  },
  {
    title: "Config",
    href: "/configuracion",
    icon: faGear,
    roles: ["admin", "superadmin"],
  },
  {
    title: "Perfil",
    href: "/perfil",
    icon: faCircleUser,
    roles: ["admin", "tecnico", "superadmin"],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname = usePathname();
  const { role, enableOtrosServicios } = useOrganization();

  const currentRole = (role ?? "tecnico") as "admin" | "tecnico" | "superadmin";

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(currentRole)) return false;
    if (item.requireOtrosServicios && !enableOtrosServicios) return false;
    return true;
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/*
       * Scroll horizontal nativo sin scrollbar visible.
       * En técnico: 5-6 ítems → caben perfectamente en cualquier pantalla ≥320px.
       * En admin:   hasta 11 ítems → se desliza con el dedo.
       * min-w-[58px] garantiza que los iconos nunca se compriman demasiado.
       */}
      <div
        className="flex h-[54px] items-stretch overflow-x-auto"
        style={{
          scrollbarWidth: "none",           // Firefox
          msOverflowStyle: "none",          // IE/Edge legacy
          WebkitOverflowScrolling: "touch", // iOS momentum scroll
        } as React.CSSProperties}
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
                "flex-1 min-w-[58px] max-w-[88px] shrink-0 px-1",
                "transition-colors duration-150 select-none",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {/* Línea indicadora arriba — solo cuando activo */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-primary" />
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

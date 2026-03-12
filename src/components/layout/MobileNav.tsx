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
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";

// ── Nav items por rol ─────────────────────────────────────────────────────────

interface NavItem {
  title: string;
  href: string;
  icon: IconDefinition;
  adminOnly?: boolean;
  techOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { title: "Inicio",      href: "/",               icon: faHouse },
  { title: "Tickets",     href: "/tickets",         icon: faTicket },
  { title: "POS",         href: "/pos",             icon: faCashRegister },
  { title: "Inventario",  href: "/inventario",      icon: faBoxesStacked },
  { title: "Servicios",   href: "/otros-servicios", icon: faScrewdriverWrench },
  { title: "Clientes",    href: "/clientes",        icon: faUsers,         adminOnly: true },
  { title: "Fiados",      href: "/fiados",          icon: faHandHoldingDollar, adminOnly: true },
  { title: "Reportes",    href: "/reportes",        icon: faChartBar,      adminOnly: true },
  { title: "Garantías",   href: "/garantias",       icon: faConciergeBell, adminOnly: true },
  { title: "Config",      href: "/configuracion",   icon: faGear,          adminOnly: true },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileNav() {
  const pathname  = usePathname();
  const { role, enableOtrosServicios } = useOrganization();

  const isAdmin   = role === "admin" || role === "superadmin";
  const isTecnico = role === "tecnico";

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.techOnly  && !isTecnico) return false;
    // Ocultar otros-servicios si no está habilitado
    if (item.href === "/otros-servicios" && !enableOtrosServicios) return false;
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      {/* Scroll horizontal sin scrollbar visible */}
      <div
        className="flex h-[60px] items-stretch overflow-x-auto"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
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
                "relative flex flex-col items-center justify-center gap-0.5 px-4 shrink-0 transition-colors min-w-[64px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              {/* Indicador activo arriba */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
              )}

              <FontAwesomeIcon
                icon={item.icon}
                className={cn(
                  "size-[18px] transition-transform duration-150",
                  isActive && "scale-110"
                )}
              />
              <span className={cn(
                "text-[9px] font-medium leading-none tracking-tight whitespace-nowrap",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Safe area para iPhone con notch / home indicator */}
      <div className="h-[env(safe-area-inset-bottom,0px)] bg-background/95" />
    </nav>
  );
}

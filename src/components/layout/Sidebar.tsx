"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTicket,
  faUsers,
  faCashRegister,
  faHandHoldingDollar,
  faBoxesStacked,
  faBox,
  faScrewdriverWrench,
  faArrowTrendUp,
  faArrowTrendDown,
  faScaleBalanced,
  faGear,
  faStore,
  faShieldHalved,
  faBuilding,
  faUserGear,
  faTriangleExclamation,
  faChevronRight,
  faWrench,
  faGhost,
  faConciergeBell,
  faChartBar,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLowStockCount } from "@/hooks/usePOS";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// ── Types ─────────────────────────────────────────────────────────────────────

type NavItem = {
  title:           string;
  href:            string;
  icon:            IconDefinition;
  badge?:          "low-stock";
  adminOnly?:      boolean;
  requiresOtros?:  boolean;  // solo si otros_servicios está habilitado
  superadminOnly?: boolean;
  tecnicoOnly?:    boolean;
};

type NavGroup = {
  label:           string;
  icon:            IconDefinition;
  items:           NavItem[];
  adminOnly:       boolean;
  superadminOnly?: boolean;
  tecnicoOnly?:    boolean;
  color:           string;
};

// ── Nav config ────────────────────────────────────────────────────────────────
// Orden lógico: Servicios → Operaciones → Inventario → Finanzas → Config → Mi Cuenta → Sistema

const NAV_GROUPS: NavGroup[] = [
  // ── 1. SERVICIOS: núcleo del negocio ──────────────────────────────────────
  {
    label:     "Servicios",
    icon:      faWrench,
    color:     "text-blue-400",
    adminOnly: false,
    items: [
      { title: "Reparaciones",    href: "/tickets",         icon: faTicket },
      { title: "Otros Servicios", href: "/otros-servicios", icon: faGhost,          requiresOtros: true },
      { title: "Garantías",       href: "/garantias",       icon: faShieldHalved },
    ],
  },

  // ── 2. OPERACIONES: clientes, caja y cobros ───────────────────────────────
  {
    label:     "Operaciones",
    icon:      faConciergeBell,
    color:     "text-cyan-400",
    adminOnly: false,
    items: [
      { title: "Clientes",       href: "/clientes", icon: faUsers },
      { title: "Punto de Venta", href: "/pos",      icon: faCashRegister },
      { title: "Por Cobrar",     href: "/fiados",   icon: faHandHoldingDollar },
    ],
  },

  // ── 3. INVENTARIO ─────────────────────────────────────────────────────────
  {
    label:     "Inventario",
    icon:      faBoxesStacked,
    color:     "text-violet-400",
    adminOnly: false,
    items: [
      { title: "Productos",    href: "/inventario?tab=productos",   icon: faBox,              badge: "low-stock" },
      { title: "Rep. Propios", href: "/inventario?tab=rep_propios", icon: faScrewdriverWrench },
      { title: "Repuestos",    href: "/inventario?tab=repuestos",   icon: faBoxesStacked },
    ],
  },

  // ── 4. FINANZAS ───────────────────────────────────────────────────────────
  {
    label:     "Finanzas",
    icon:      faScaleBalanced,
    color:     "text-emerald-400",
    adminOnly: false,
    items: [
      { title: "Ingresos",  href: "/finanzas/ingresos", icon: faArrowTrendUp,  adminOnly: true },
      { title: "Gastos",    href: "/finanzas/gastos",   icon: faArrowTrendDown },
      { title: "Reportes", href: "/reportes",           icon: faChartBar,      adminOnly: true },
    ],
  },

  // ── 5. CONFIGURACIÓN (admin) ──────────────────────────────────────────────
  {
    label:     "Configuración",
    icon:      faGear,
    color:     "text-amber-400",
    adminOnly: true,
    items: [
      { title: "Ajustes de Tienda",  href: "/configuracion", icon: faStore },
      { title: "Mi Perfil / Equipo", href: "/perfil",        icon: faUserGear },
    ],
  },

  // ── 6. MI CUENTA (solo técnico — admin usa "Configuración") ──────────────
  {
    label:       "Mi Cuenta",
    icon:        faUserGear,
    color:       "text-amber-400",
    adminOnly:   false,
    tecnicoOnly: true,
    items: [
      { title: "Mi Perfil", href: "/perfil", icon: faUserGear, tecnicoOnly: true },
    ],
  },

  // ── 7. SISTEMA (superadmin) ───────────────────────────────────────────────
  {
    label:          "Sistema",
    icon:           faShieldHalved,
    color:          "text-red-400",
    adminOnly:      false,
    superadminOnly: true,
    items: [
      { title: "Superadmin",     href: "/superadmin",      icon: faShieldHalved,  superadminOnly: true },
      { title: "Organizaciones", href: "/superadmin/orgs", icon: faBuilding,      superadminOnly: true },
    ],
  },
];

// ── FaIcon helper ─────────────────────────────────────────────────────────────

function FaIcon({ icon, className }: { icon: IconDefinition; className?: string }) {
  return (
    <FontAwesomeIcon
      icon={icon}
      className={cn("shrink-0", className)}
      style={{ width: "1rem", height: "1rem" }}
    />
  );
}

// ── Low Stock Badge ───────────────────────────────────────────────────────────

function LowStockBadge() {
  const count = useLowStockCount();
  if (count === 0) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center justify-center size-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold shrink-0">
            {count > 9 ? "9+" : count}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs max-w-[160px]">
          <div className="flex items-center gap-1.5">
            <FaIcon icon={faTriangleExclamation} className="text-amber-400 size-3" />
            <span>{count} producto{count > 1 ? "s" : ""} con stock bajo (≤ 5)</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const currentTab   = searchParams.get("tab") ?? "";
  const { role, fullName, email, currencyCode, isLoading, enableOtrosServicios } =
    useOrganization();

  const isSuperadmin = role === "superadmin";
  const isAdmin      = role === "admin" || isSuperadmin;
  const isTecnico    = role === "tecnico";
  const otrosEnabled = enableOtrosServicios;

  const initials = (fullName ?? email ?? "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = isSuperadmin ? "Super Admin" : isAdmin ? "Admin" : "Técnico";
  const roleBadgeClass = isSuperadmin
    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
    : isAdmin
    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  return (
    <Sidebar collapsible="icon" variant="sidebar">

      {/* ── Header ── */}
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="TechX">
              <Link href="/" className="flex items-center justify-center py-3 px-2">
                {/* Ícono colapsado */}
                <div className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm group-data-[collapsible=icon]:flex">
                  <FontAwesomeIcon icon={faWrench} style={{ width: 14, height: 14 }} />
                </div>
                {/* Logo expandido */}
                <div className="flex items-center justify-center group-data-[collapsible=icon]:hidden">
                  <Image
                    src="/techxlighmode.png"
                    alt="TechX"
                    width={200}
                    height={60}
                    priority
                    className="object-contain h-14 w-auto"
                  />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="gap-0">
        {NAV_GROUPS.map((group) => {
          // Visibilidad del grupo según rol
          if (group.superadminOnly && !isSuperadmin) return null;
          if (group.tecnicoOnly    && !isTecnico)    return null;
          if (group.adminOnly      && !isAdmin)      return null;

          // Filtrar ítems
          const visibleItems = group.items.filter((item) => {
            if (item.superadminOnly && !isSuperadmin) return false;
            if (item.tecnicoOnly    && !isTecnico)    return false;
            if (item.adminOnly      && !isAdmin)      return false;
            if (item.requiresOtros  && !otrosEnabled) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;

          return (
            <Collapsible key={group.label} defaultOpen className="group/collapsible">
              <SidebarGroup className="py-1">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors">
                    <FaIcon icon={group.icon} className={cn("size-3", group.color)} />
                    <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="size-2.5 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                    />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>

                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => {
                        const [itemPath, itemQuery] = item.href.split("?");
                        const itemTab = itemQuery?.replace("tab=", "") ?? "";

                        const isActive = itemTab
                          ? pathname === itemPath && currentTab === itemTab
                          : pathname === itemPath ||
                            (itemPath !== "/" && pathname.startsWith(itemPath));

                        return (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.title}
                              className={cn(
                                "gap-2.5 rounded-lg transition-all duration-150",
                                isActive && "font-medium"
                              )}
                            >
                              <Link href={item.href} className="flex items-center gap-2.5 w-full">
                                <span
                                  className={cn(
                                    "flex size-6 items-center justify-center rounded-md shrink-0 transition-colors",
                                    isActive
                                      ? "bg-primary/15 text-primary"
                                      : "text-muted-foreground/70 group-hover/menu-button:text-foreground"
                                  )}
                                >
                                  <FaIcon icon={item.icon} className="size-3.5" />
                                </span>
                                <span className="flex-1 truncate text-sm">{item.title}</span>
                                {item.badge === "low-stock" && <LowStockBadge />}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      {/* ── Footer: usuario ── */}
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/perfil" className="flex items-center gap-3">
                <Avatar className="size-8 rounded-lg shrink-0">
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-medium text-sm">
                    {isLoading ? <Skeleton className="h-3 w-28" /> : fullName ?? email ?? "—"}
                  </span>
                  <span className="truncate text-xs">
                    {isLoading ? (
                      <Skeleton className="h-3 w-16 mt-1" />
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 font-medium mt-0.5", roleBadgeClass)}
                      >
                        {roleLabel}
                      </Badge>
                    )}
                  </span>
                </div>
                {!isLoading && currencyCode && (
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 bg-muted/50 px-1.5 py-0.5 rounded">
                    {currencyCode}
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { faMoon, faSun, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { useTheme } from "next-themes";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { BuscadorGlobal } from "@/components/layout/BuscadorGlobal";

// ── Breadcrumb map ────────────────────────────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  tickets:      "Tickets",
  clientes:     "Clientes",
  inventario:   "Inventario",
  finanzas:     "Finanzas",
  gastos:       "Gastos",
  ingresos:     "Ingresos",
  pos:          "Punto de Venta",
  reportes:     "Reportes",
  configuracion:"Configuración",
  perfil:       "Perfil",
  superadmin:   "Superadmin",
  orgs:         "Organizaciones",
  scanner:      "Escáner",
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: ROUTE_LABELS[seg] ?? (seg.length === 36 ? "Detalle" : seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Header() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const breadcrumbs = useBreadcrumbs();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/login");
  };

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        minHeight: "calc(3.5rem + env(safe-area-inset-top, 0px))",
      }}
    >
      {/* Inner row */}
      <div className="flex w-full items-center gap-2 px-3 md:px-4 h-14 min-w-0">
        {/* Sidebar toggle (desktop lg+) */}
        <SidebarTrigger className="-ml-1 hidden lg:flex shrink-0" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden lg:block shrink-0" />

        {/* Breadcrumb — truncado en m\u00f3vil */}
        <Breadcrumb className="flex-1 min-w-0 overflow-hidden">
          <BreadcrumbList className="flex-wrap sm:flex-nowrap">
            <BreadcrumbItem className="hidden sm:flex">
              <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.href}>
                <BreadcrumbSeparator className="hidden sm:flex" />
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage className="truncate max-w-[140px] sm:max-w-none">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Search — solo en lg+ */}
        <div className="hidden lg:flex flex-1 max-w-sm mx-4">
          <BuscadorGlobal />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <FaIcon icon={faSun} size={14} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <FaIcon icon={faMoon} size={14} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
            aria-label="Cerrar sesión"
          >
            <FaIcon icon={faRightFromBracket} size={14} />
          </Button>
        </div>
      </div>
    </header>
  );
}


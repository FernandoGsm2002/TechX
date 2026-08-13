"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  faPlus, faTicket, faArrowRight, faPowerOff, faLock, faLockOpen,
  faCamera, faXmark, faUpload, faSpinner, faUserSlash, faUser,
  faChevronDown, faChevronUp, faWrench, faHourglassHalf,
  faCircleCheck, faSackDollar, faShieldHalved, faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import { TicketStatusBadge, STATUS_CONFIG } from "@/components/ui-custom/TicketStatusBadge";
import {
  useTickets, useTicketsStats, useCreateTicket, useTicketSearch, uploadIntakePhoto,
  type TicketWithRelations, type CreateTicketPayload,
} from "@/hooks/useTickets";
import { useDebounce } from "@/hooks/useDebounce";
import { useClientes } from "@/hooks/useClientes";
import { useOrganization } from "@/contexts/OrganizationContext";
import { PhoneInput, CURRENCY_TO_DIAL } from "@/components/ui-custom/PhoneInput";
import { getFiscalConfig } from "@/lib/fiscalConfig";
import type { TicketStatus, DeviceDetails } from "@/types/domain";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { CreateTicketModal } from "@/components/tickets/CreateTicketModal";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES = Object.keys(STATUS_CONFIG) as TicketStatus[];


const DEVICE_TYPES = ["Celular", "Tablet", "Laptop", "PC", "Consola", "Smartwatch", "Otro"];


const LOCK_TYPES = [
  { value: "pin",      label: "PIN numérico" },
  { value: "patron",   label: "Patrón" },
  { value: "password", label: "Contraseña" },
  { value: "huella",   label: "Huella / Biométrico" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDeviceLabel(ticket: TicketWithRelations) {
  const d = (ticket.device_details ?? {}) as DeviceDetails;
  const parts = [d.brand, d.model].filter(Boolean).join(" ");
  return { label: parts || "—", type: d.type ?? "" };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const router = useRouter();
  const { org, currencySymbol, role, userId, formatCurrency, currencyCode } = useOrganization();
  const isAdmin = role === "admin" || role === "superadmin";
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const [imeiSearch,   setImeiSearch]   = useState("");
  const debouncedImei  = useDebounce(imeiSearch, 400);
  const isImeiMode     = debouncedImei.trim().length >= 2;

  // Server Side Queries
  const { data: stats } = useTicketsStats(org?.id, role, userId);
  const { data: ticketsResponse, isLoading } = useTickets(
    statusFilter === "all" ? undefined : statusFilter, 
    { role, userId, page: page - 1, pageSize }
  );
  
  const { data: searchResults = [], isFetching: isSearching } = useTicketSearch(
    debouncedImei, { role, userId }
  );

  const displayedTickets = isImeiMode ? searchResults : (ticketsResponse?.data ?? []);
  const totalCount = isImeiMode ? searchResults.length : (ticketsResponse?.count ?? 0);
  
  const { data: clientes = [] } = useClientes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openedFromQuickAction, setOpenedFromQuickAction] = useState(false);

  // Permite entrar directamente desde las acciones rápidas sin duplicar el flujo
  // de recepción en el dashboard.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("create") === "1") {
      setOpenedFromQuickAction(true);
      setDialogOpen(true);
    }
  }, []);

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open && openedFromQuickAction) router.replace("/tickets");
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: DataColumn<TicketWithRelations>[] = [
    {
      key: "id",
      header: "#",
      cell: (row) => (
        <span className="text-xs font-mono font-bold text-primary/80">
          {row.ticket_number != null
            ? `#${String(row.ticket_number).padStart(3, "0")}`
            : row.id.slice(0, 6).toUpperCase()}
        </span>
      ),
      className: "w-16",
      showOnMobile: false,
    },
    {
      key: "customer",
      header: "Cliente",
      primary: true,
      cell: (row) => {
        const name    = row.customers?.full_name ?? row.guest_name;
        const isGuest = !row.customers?.full_name && !!row.guest_name;
        return (
          <div>
            <p className="font-medium text-sm flex items-center gap-1.5">
              {name ?? <span className="text-muted-foreground italic">Sin nombre</span>}
              {isGuest && (
                <span className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-500 rounded font-medium">
                  Walk-in
                </span>
              )}
            </p>
            {row.customers?.phone && (
              <p className="text-xs text-muted-foreground">{row.customers.phone}</p>
            )}
            {isGuest && row.guest_phone && (
              <p className="text-xs text-muted-foreground">{row.guest_phone}</p>
            )}
          </div>
        );
      },
    },

    {
      key: "device",
      header: "Dispositivo",
      cell: (row) => {
        const { label, type } = getDeviceLabel(row);
        return (
          <div>
            <p className="text-sm">{label}</p>
            <p className="text-xs text-muted-foreground capitalize">{type}</p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <TicketStatusBadge status={row.status} />
          {row.power_on === false && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500 border-amber-500/40">
              Apagado
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "final_amount",
      header: "Total",
      cell: (row) => {
        const itemsTotal = (row.ticket_items ?? [])
          .filter((i) => (i as any).add_to_total !== false)
          .reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
        const base  = row.final_amount != null ? Number(row.final_amount) : null;
        const total = base != null ? base + itemsTotal : null;
        return (
          <div className="flex flex-col gap-0.5">
            {total != null ? (
              <span className="font-mono text-sm font-medium">
                {formatCurrency(total)}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
            {row.payment_status === "fiado" && (
              <span className="text-[9px] font-semibold text-amber-500 uppercase tracking-wide">Fiado</span>
            )}
            {row.payment_status === "pagado" && row.status === "entregado" && (
              <span className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wide">Cobrado</span>
            )}
          </div>
        );
      },
    },
    {
      key: "created_at",
      header: "Fecha",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.created_at), "dd MMM", { locale: es })}
        </span>
      ),
      className: "hidden md:table-cell",
      showOnMobile: false,
    },
    ...(isAdmin ? [{
      key: "technician",
      header: "Técnico",
      cell: (row: TicketWithRelations) => {
        const name = (row.profiles as { full_name: string | null } | null)?.full_name;
        return name
          ? <span className="text-xs bg-blue-500/10 text-blue-400 rounded px-1.5 py-0.5">{name}</span>
          : <span className="text-xs text-muted-foreground">—</span>;
      },
      className: "hidden md:table-cell",
      showOnMobile: false,
    } as DataColumn<TicketWithRelations>] : []),
  ];

  // ── Stat cards + tab counts ───────────────────────────────────────────────
  const enProceso     = stats?.en_proceso ?? 0;
  const recibidos     = stats?.recibido ?? 0;
  const completados   = stats?.completado ?? 0;
  const pendientes    = stats?.pendientes ?? 0;

  // Per-status counts for the tab badges
  const tabCounts: Record<string, number> = { 
    all: stats?.total ?? 0,
    recibido: stats?.recibido ?? 0,
    en_proceso: stats?.en_proceso ?? 0,
    completado: stats?.completado ?? 0,
    entregado: stats?.entregado ?? 0,
    fallido: stats?.fallido ?? 0
  };

  const entregadosMes = stats?.entregados_mes ?? 0;
  const pendientesCobro = stats?.pendientes_cobro ?? 0;

  const statCards: { label: string; value: string | number; icon: typeof faTicket; colorClass: string; sub: string }[] = [
    {
      label: "Total Tickets",
      value: stats?.total ?? 0,
      icon: faTicket,
      colorClass: "text-primary",
      sub: statusFilter !== "all" ? STATUS_CONFIG[statusFilter].label : "todos los estados",
    },
    {
      label: "En Proceso",
      value: enProceso,
      icon: faWrench,
      colorClass: "text-blue-400",
      sub: `${(stats?.total ?? 0) > 0 ? Math.round((enProceso / Math.max((stats?.total ?? 0), 1)) * 100) : 0}% del total`,
    },
    {
      label: "Pendientes",
      value: pendientes,
      icon: faHourglassHalf,
      colorClass: "text-amber-400",
      sub: `${recibidos} recibidos · ${enProceso} en proceso`,
    },
    {
      label: "Listos entregar",
      value: completados,
      icon: faCircleCheck,
      colorClass: "text-emerald-400",
      sub: `${entregadosMes} entregados este mes`,
    },
    ...(isAdmin ? [{
      label: "Pendiente Cobro",
      value: formatCurrency(pendientesCobro),
      icon: faSackDollar,
      colorClass: "text-violet-400",
      sub: "tickets activos",
    }] : []),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FaIcon icon={faTicket} size={18} /> Tickets de Reparación
          </h1>
          <p className="text-sm text-muted-foreground">
            {displayedTickets.length} ticket{displayedTickets.length !== 1 ? "s" : ""}
            {statusFilter !== "all" && ` · ${STATUS_CONFIG[statusFilter].label}`}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 h-9 shrink-0">
          <FaIcon icon={faPlus} size={14} /> Nuevo Ticket
        </Button>
      </div>

      {/* Stat Cards */}
      <div className={`grid gap-3 ${
        isAdmin
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          : "grid-cols-2 sm:grid-cols-4"
      }`}>
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border/50 bg-card/60 p-3.5 space-y-1 overflow-hidden transition-all hover:border-primary/50"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <FaIcon icon={card.icon} size={11} className={`shrink-0 ${card.colorClass}`} />
              <span className="truncate">{card.label}</span>
            </div>
            <p className="font-bold font-mono text-lg truncate">{card.value}</p>
            <p className="text-[10px] text-muted-foreground truncate">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Búsqueda IMEI / Serial / Ticket# ── */}
      <div className="relative">
        <FaIcon icon={faMagnifyingGlass} size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        {imeiSearch && (
          <button onClick={() => setImeiSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <FaIcon icon={faXmark} size={12} />
          </button>
        )}
        <input
          id="ticket-imei-search"
          type="text"
          value={imeiSearch}
          onChange={(e) => {
            setImeiSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por IMEI, Serial, Ticket# o cliente…"
          className="w-full h-9 pl-9 pr-8 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {isImeiMode && (
          <span className="absolute right-9 top-1/2 -translate-y-1/2 text-[10px] text-primary/70 font-semibold">
            {isSearching ? "…" : `${searchResults.length} resultado${searchResults.length !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      {/* ── Status tabs con contadores ── */}
      <div className="flex gap-1 overflow-x-auto border-b border-border/40">
        {(["all", ...STATUSES] as const).map((s) => {
          const isActive = statusFilter === s;
          const count    = tabCounts[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap -mb-px ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table — filas clickeables + botón de acción */}
      <DataTable
        data={displayedTickets}
        columns={columns}
        isLoading={isImeiMode ? isSearching : isLoading}
        searchPlaceholder=""
        searchKeys={[]}
        emptyMessage={isImeiMode ? "Sin resultados" : "Sin tickets con ese filtro"}
        emptyIcon={<FaIcon icon={faTicket} size={28} className="opacity-30" />}
        onRowClick={(row) => router.push(`/tickets/${row.id}`)}
        serverSidePagination={!isImeiMode}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        actions={(row) => (
          <Button asChild variant="ghost" size="icon" className="size-7">
            <Link href={`/tickets/${row.id}`} onClick={(e) => e.stopPropagation()}>
              <FaIcon icon={faArrowRight} size={13} />
            </Link>
          </Button>
        )}
      />

      {/* ── Create Dialog ──────────────────────────────────────────────────── */}
      <CreateTicketModal open={dialogOpen} onOpenChange={handleDialogChange} />
    </div>
  );
}

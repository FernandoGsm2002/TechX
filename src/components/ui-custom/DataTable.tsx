"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { faMagnifyingGlass, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { cn } from "@/lib/utils";

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Si true, se muestra en la card de mobile (máx 4-5 recomendados). Por defecto: true */
  showOnMobile?: boolean;
  /** Si true, esta columna es la principal (título de la card). Máx 1. */
  primary?: boolean;
}

interface DataTableProps<T extends object> {
  data: T[];
  columns: DataColumn<T>[];
  searchPlaceholder?: string;
  searchKeys?: string[];
  isLoading?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  actions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  // --- Server Side Pagination ---
  serverSidePagination?: boolean;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

const PAGE_SIZE = 12;

export function DataTable<T extends object>({
  data,
  columns,
  searchPlaceholder = "Buscar...",
  searchKeys = [],
  isLoading = false,
  pageSize = PAGE_SIZE,
  emptyMessage = "Sin resultados",
  emptyIcon,
  actions,
  onRowClick,
  serverSidePagination = false,
  totalCount,
  currentPage,
  onPageChange,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [localPage, setLocalPage] = useState(1);

  const actualPage = serverSidePagination && currentPage !== undefined ? currentPage : localPage;
  const setActualPage = serverSidePagination && onPageChange ? onPageChange : setLocalPage;

  // Filter
  const filtered = search && !serverSidePagination
    ? data.filter((row) =>
        searchKeys.some((key) =>
          String((row as Record<string, unknown>)[key] ?? "")
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      )
    : data;

  // Paginate
  const totalRecords = serverSidePagination && totalCount !== undefined ? totalCount : filtered.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const paged = serverSidePagination ? filtered : filtered.slice((actualPage - 1) * pageSize, actualPage * pageSize);

  // Columns for mobile cards — show all unless explicitly marked showOnMobile: false
  const mobileColumns = columns.filter((c) => c.showOnMobile !== false);
  const primaryCol     = mobileColumns.find((c) => c.primary) ?? mobileColumns[0];
  const secondaryMobileCols = mobileColumns.filter((c) => c !== primaryCol);

  return (
    <div className="space-y-3">
      {/* Search */}
      {searchKeys.length > 0 && (
        <div className="relative">
          <FaIcon icon={faMagnifyingGlass} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActualPage(1); }}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
       *  MOBILE: Card layout (< md)
       * ══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/60">
                <CardContent className="pt-3 pb-3 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                </CardContent>
              </Card>
            ))
          : paged.length === 0
          ? (
            <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
              {emptyIcon && (
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                  {emptyIcon}
                </div>
              )}
              <p className="text-sm font-medium">{emptyMessage}</p>
            </div>
          )
          : paged.map((row, i) => (
              <Card
                key={i}
                className={cn(
                  "border-border/50 bg-card/60 backdrop-blur transition-all hover:border-border/80",
                  onRowClick && "cursor-pointer active:scale-[0.99]"
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                <CardContent className="pt-3 pb-2.5 space-y-2">
                  {/* Primary column — título de la card */}
                  {primaryCol && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {primaryCol.cell(row)}
                      </div>
                      {actions && (
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          {actions(row)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Secondary columns — como filas de info */}
                  {secondaryMobileCols.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {secondaryMobileCols.map((col) => (
                        <div key={col.key} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide font-medium">
                            {col.header}:
                          </span>
                          <span className="text-foreground/80">{col.cell(row)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
        }
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
       *  DESKTOP: Table layout (≥ md)
       * ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap py-2.5 px-3",
                      col.className
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
                {actions && <TableHead className="text-right w-8 py-2.5 px-3" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell key={col.key} className="py-2.5 px-3">
                          <div className="h-4 rounded bg-muted animate-pulse" />
                        </TableCell>
                      ))}
                      {actions && <TableCell className="py-2.5 px-3" />}
                    </TableRow>
                  ))
                : paged.length === 0
                ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + (actions ? 1 : 0)}
                      className="py-14 text-center"
                    >
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        {emptyIcon && (
                          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                            {emptyIcon}
                          </div>
                        )}
                        <p className="text-sm font-medium">{emptyMessage}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )
                : paged.map((row, i) => (
                  <TableRow
                    key={i}
                    className={`hover:bg-muted/20 ${onRowClick ? "cursor-pointer" : ""}`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn("py-2.5 px-3 text-sm", col.className)}
                        onClick={(e) => { if (col.key === "id") e.stopPropagation(); }}
                      >
                        {col.cell(row)}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell
                        className="text-right py-2.5 px-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {actions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="text-xs">
            {totalRecords} resultado{totalRecords !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={actualPage === 1}
              onClick={() => setActualPage(Math.max(1, actualPage - 1))}
            >
              <FaIcon icon={faChevronLeft} size={14} />
            </Button>
            <span className="px-2 text-xs font-medium">
              {actualPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={actualPage === totalPages}
              onClick={() => setActualPage(Math.min(totalPages, actualPage + 1))}
            >
              <FaIcon icon={faChevronRight} size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

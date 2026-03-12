"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
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
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Filter
  const filtered = search
    ? data.filter((row) =>
        searchKeys.some((key) =>
          String((row as Record<string, unknown>)[key] ?? "")
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      )
    : data;


  // Paginate
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide", col.className)}
                >
                  {col.header}
                </TableHead>
              ))}
              {actions && <TableHead className="text-right w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        <div className="h-4 rounded bg-muted animate-pulse" />
                      </TableCell>
                    ))}
                    {actions && <TableCell />}
                  </TableRow>
                ))
              : paged.length === 0
              ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {emptyIcon}
                      <p className="text-sm">{emptyMessage}</p>
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
                      <TableCell key={col.key} className={col.className}
                        onClick={e => { if (col.key === "id") e.stopPropagation(); }}
                      >
                        {col.cell(row)}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        {actions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

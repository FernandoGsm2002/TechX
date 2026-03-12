"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Loader2, Ticket, Package, ShoppingCart, Zap,
} from "lucide-react";
import { useBuscadorGlobal, type GlobalResultType } from "@/hooks/useBuscadorGlobal";
import { cn } from "@/lib/utils";

// ── Icon por tipo ──────────────────────────────────────────────────────────────
const typeIcon: Record<GlobalResultType, React.ElementType> = {
  ticket:    Ticket,
  servicio:  Zap,
  inventory: Package,
  sale:      ShoppingCart,
};

const typeLabel: Record<GlobalResultType, string> = {
  ticket:    "Ticket",
  servicio:  "Servicio",
  inventory: "Producto",
  sale:      "Venta",
};

const typeColor: Record<GlobalResultType, string> = {
  ticket:    "text-violet-400 bg-violet-500/10",
  servicio:  "text-cyan-400 bg-cyan-500/10",
  inventory: "text-emerald-400 bg-emerald-500/10",
  sale:      "text-blue-400 bg-blue-500/10",
};

const badgeColors: Record<string, string> = {
  green:  "bg-emerald-500/10 text-emerald-400",
  amber:  "bg-amber-500/10  text-amber-400",
  red:    "bg-red-500/10    text-red-400",
  blue:   "bg-blue-500/10   text-blue-400",
  violet: "bg-violet-500/10 text-violet-400",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function BuscadorGlobal() {
  const router = useRouter();
  const { query, active, setActive, handleSearch, results, isLoading, clear } = useBuscadorGlobal();
  const inputRef   = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setActive(true);
      }
      if (e.key === "Escape") { clear(); inputRef.current?.blur(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [clear, setActive]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActive(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setActive]);

  function navigate(href: string) {
    router.push(href);
    clear();
  }

  const showDropdown = active && query.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs lg:max-w-sm">
      {/* Input */}
      <div className={cn(
        "flex items-center h-8 gap-2 px-3 rounded-lg border bg-background/60 transition-all",
        active
          ? "border-primary/50 ring-1 ring-primary/20 bg-background"
          : "border-border hover:border-border/80"
      )}>
        {isLoading
          ? <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />
          : <Search className="size-3.5 text-muted-foreground shrink-0" />
        }
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar IMEI, serie, producto… (Ctrl+K)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setActive(true)}
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60 min-w-0"
        />
        {query && (
          <button onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-3.5" />
          </button>
        )}
        {!query && (
          <kbd className="hidden sm:flex items-center gap-0.5 text-[9px] text-muted-foreground/50 bg-muted/40 px-1 py-0.5 rounded border border-border/60 font-mono">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className={cn(
          "absolute top-10 left-0 right-0 z-50",
          "rounded-xl border border-border bg-popover shadow-xl",
          "overflow-hidden"
        )}>
          {results.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <Search className="size-7 opacity-30" />
              <p className="text-xs">Sin resultados para <strong>"{query}"</strong></p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-border/50 py-1">
              {results.map((r) => {
                const Icon = typeIcon[r.type];
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                      onClick={() => navigate(r.href)}
                    >
                      {/* Icon */}
                      <span className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg mt-0.5",
                        typeColor[r.type]
                      )}>
                        <Icon className="size-3.5" />
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium truncate">{r.title}</span>
                          {r.badge && (
                            <span className={cn(
                              "text-[9px] font-mono px-1 py-0.5 rounded shrink-0",
                              badgeColors[r.badgeColor ?? "blue"]
                            )}>
                              {r.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{r.subtitle}</p>
                        <p className="text-[10px] text-muted-foreground/70 truncate">{r.meta}</p>
                      </div>

                      {/* Type label */}
                      <span className={cn(
                        "text-[9px] font-medium shrink-0 uppercase tracking-wide px-1.5 py-0.5 rounded",
                        typeColor[r.type]
                      )}>
                        {typeLabel[r.type]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Footer hint */}
          {results.length > 0 && (
            <div className="px-3 py-2 border-t bg-muted/30 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {results.length} resultado{results.length !== 1 ? "s" : ""}
              </span>
              <span className="text-[10px] text-muted-foreground opacity-60">↵ para abrir · Esc para cerrar</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

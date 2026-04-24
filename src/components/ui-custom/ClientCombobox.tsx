"use client";

import React, { useState } from "react";
import { faUser, faChevronDown, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Cliente {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
}

interface ClientComboboxProps {
  clientes: Cliente[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function ClientCombobox({
  clientes,
  value,
  onChange,
  placeholder = "Buscar cliente...",
  className,
  error,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = clientes.find((c) => c.id === value);

  return (
    <div className={cn("space-y-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal h-9 text-sm px-3",
              !selected && "text-muted-foreground",
              error && "border-destructive"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              {selected ? (
                <>
                  <FaIcon icon={faUser} size={11} className="text-primary shrink-0" />
                  <span className="truncate">{selected.full_name}</span>
                  {selected.phone && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {selected.phone}
                    </span>
                  )}
                </>
              ) : (
                placeholder
              )}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {selected && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      onChange("");
                    }
                  }}
                  className="rounded-sm p-0.5 hover:bg-muted transition-colors"
                >
                  <FaIcon icon={faTimes} size={9} className="text-muted-foreground" />
                </span>
              )}
              <FaIcon
                icon={faChevronDown}
                size={10}
                className={cn(
                  "text-muted-foreground transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-0 w-[320px]" align="start">
          <Command>
            <CommandInput placeholder="Nombre, teléfono o email..." className="h-9" />
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No se encontró ningún cliente
              </CommandEmpty>
              <CommandGroup>
                {clientes.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.full_name} ${c.phone ?? ""} ${c.email ?? ""}`}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <FaIcon icon={faUser} size={10} className="text-primary" />
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{c.full_name}</span>
                      {(c.phone || c.email) && (
                        <span className="text-xs text-muted-foreground truncate">
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

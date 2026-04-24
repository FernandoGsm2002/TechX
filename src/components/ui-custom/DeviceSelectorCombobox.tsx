"use client";

import React, { useState, useMemo } from "react";
import { faMobileAlt, faChevronDown, faTimes } from "@fortawesome/free-solid-svg-icons";
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
import { useMarcas } from "@/hooks/useInventario";
import { PHONE_BRANDS, searchPhoneModels } from "@/lib/phone-database";

interface DeviceSelectorComboboxProps {
  brandText: string;
  onBrandChange: (name: string) => void;
  modelText: string;
  onModelChange: (name: string) => void;
  className?: string;
}

export function DeviceSelectorCombobox({
  brandText,
  onBrandChange,
  modelText,
  onModelChange,
  className,
}: DeviceSelectorComboboxProps) {
  const [brandOpen,  setBrandOpen]  = useState(false);
  const [modelOpen,  setModelOpen]  = useState(false);
  const [brandQuery, setBrandQuery] = useState("");
  const [modelQuery, setModelQuery] = useState("");

  // Custom org brands from DB (admin-managed)
  const { data: orgMarcas = [] } = useMarcas();
  const orgBrandNames = useMemo(
    () => orgMarcas.map((m) => m.name),
    [orgMarcas]
  );

  // Merged, deduplicated brand list: org brands first, then dataset brands
  const allBrands = useMemo(() => {
    const set = new Set<string>([...orgBrandNames, ...PHONE_BRANDS]);
    return Array.from(set).sort();
  }, [orgBrandNames]);

  // Filtered brands based on query
  const filteredBrands = useMemo(() => {
    const q = brandQuery.toLowerCase().trim();
    if (!q) return allBrands;
    return allBrands.filter((b) => b.toLowerCase().includes(q));
  }, [allBrands, brandQuery]);

  // Models for the selected brand, filtered by model query
  const filteredModels = useMemo(
    () => searchPhoneModels(brandText, modelQuery),
    [brandText, modelQuery]
  );

  const handleBrandSelect = (name: string) => {
    onBrandChange(name);
    onModelChange(""); // clear model when brand changes
    setBrandQuery("");
    setBrandOpen(false);
  };

  const handleModelSelect = (name: string) => {
    onModelChange(name);
    setModelQuery("");
    setModelOpen(false);
  };

  const showBrandCustomOption =
    brandQuery.trim() &&
    !allBrands.some((b) => b.toLowerCase() === brandQuery.toLowerCase().trim());

  const showModelCustomOption =
    modelQuery.trim() &&
    !filteredModels.some((m) => m.toLowerCase() === modelQuery.toLowerCase().trim());

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {/* ── Brand Combobox ───────────────────────────────────────────────── */}
      <Popover open={brandOpen} onOpenChange={setBrandOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={brandOpen}
            className={cn(
              "w-full justify-between font-normal h-9 text-sm px-3",
              !brandText && "text-muted-foreground"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              {brandText ? (
                <>
                  <FaIcon icon={faMobileAlt} size={11} className="text-primary shrink-0" />
                  <span className="truncate">{brandText}</span>
                </>
              ) : (
                "Marca"
              )}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {brandText && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBrandChange("");
                    onModelChange("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      onBrandChange("");
                      onModelChange("");
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
                  brandOpen && "rotate-180"
                )}
              />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-0 w-[220px]" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar marca..."
              className="h-9"
              value={brandQuery}
              onValueChange={setBrandQuery}
            />
            <CommandList>
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                {brandQuery ? "Marca no encontrada" : "Sin marcas"}
              </CommandEmpty>
              <CommandGroup>
                {showBrandCustomOption && (
                  <CommandItem
                    value={`custom-brand-${brandQuery}`}
                    onSelect={() => handleBrandSelect(brandQuery.trim())}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  >
                    <span className="text-xs text-primary font-medium">
                      Usar: &quot;{brandQuery.trim()}&quot;
                    </span>
                  </CommandItem>
                )}
                {filteredBrands.map((brand) => (
                  <CommandItem
                    key={brand}
                    value={brand}
                    onSelect={() => handleBrandSelect(brand)}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  >
                    <span className="text-sm truncate">{brand}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* ── Model Combobox ───────────────────────────────────────────────── */}
      <Popover open={modelOpen} onOpenChange={setModelOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={modelOpen}
            disabled={!brandText}
            className={cn(
              "w-full justify-between font-normal h-9 text-sm px-3",
              !modelText && "text-muted-foreground"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <span className="truncate">{modelText || "Modelo"}</span>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {modelText && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onModelChange("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      onModelChange("");
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
                  modelOpen && "rotate-180"
                )}
              />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-0 w-[220px]" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar modelo..."
              className="h-9"
              value={modelQuery}
              onValueChange={setModelQuery}
            />
            <CommandList>
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                {modelQuery ? "Modelo no encontrado" : "Sin modelos disponibles"}
              </CommandEmpty>
              <CommandGroup>
                {showModelCustomOption && (
                  <CommandItem
                    value={`custom-model-${modelQuery}`}
                    onSelect={() => handleModelSelect(modelQuery.trim())}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  >
                    <span className="text-xs text-primary font-medium">
                      Usar: &quot;{modelQuery.trim()}&quot;
                    </span>
                  </CommandItem>
                )}
                {filteredModels.map((model) => (
                  <CommandItem
                    key={model}
                    value={model}
                    onSelect={() => handleModelSelect(model)}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  >
                    <span className="text-sm truncate">{model}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

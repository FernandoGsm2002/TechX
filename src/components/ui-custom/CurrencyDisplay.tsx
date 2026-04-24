"use client";

import React from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  /** Show tax breakdown */
  showTax?: boolean;
}

export function CurrencyDisplay({
  amount,
  className,
  showTax = false,
}: CurrencyDisplayProps) {
  const { formatCurrency, taxPercentage, taxLabel } = useOrganization();

  const taxAmount = (amount * taxPercentage) / (100 + taxPercentage);
  const baseAmount = amount - taxAmount;

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatCurrency(amount)}
      {showTax && (
        <span className="ml-1.5 text-[10px] text-muted-foreground">
          ({taxLabel} {formatCurrency(taxAmount)})
        </span>
      )}
    </span>
  );
}

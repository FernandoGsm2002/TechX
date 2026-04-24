"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "rounded";
  className?: string;
}

const SIZE_CLASS = {
  sm:  "size-8 text-[11px]",
  md:  "size-11 text-sm",
  lg:  "size-16 text-xl",
  xl:  "size-24 text-3xl",
};

const COLORS = [
  "from-violet-500/50 to-violet-600/30 text-violet-200",
  "from-blue-500/50   to-blue-600/30   text-blue-200",
  "from-emerald-500/50 to-emerald-600/30 text-emerald-200",
  "from-amber-500/50  to-amber-600/30  text-amber-200",
  "from-rose-500/50   to-rose-600/30   text-rose-200",
  "from-cyan-500/50   to-cyan-600/30   text-cyan-200",
  "from-indigo-500/50 to-indigo-600/30 text-indigo-200",
  "from-pink-500/50   to-pink-600/30   text-pink-200",
  "from-teal-500/50   to-teal-600/30   text-teal-200",
  "from-orange-500/50 to-orange-600/30 text-orange-200",
];

function hashColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const src = name ?? email ?? "?";
  return src
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserAvatar({
  name,
  email,
  size = "md",
  shape = "circle",
  className,
}: UserAvatarProps) {
  const seed    = (name ?? email ?? "?").toLowerCase().trim();
  const color   = hashColor(seed);
  const label   = initials(name, email);
  const radius  = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <Avatar
      className={cn(
        SIZE_CLASS[size],
        radius,
        "shrink-0 bg-gradient-to-br border border-white/10 font-bold",
        color,
        className
      )}
    >
      <AvatarFallback
        className={cn(
          "bg-transparent font-bold tracking-wide select-none",
          SIZE_CLASS[size],
          radius,
          color,
        )}
      >
        {label}
      </AvatarFallback>
    </Avatar>
  );
}

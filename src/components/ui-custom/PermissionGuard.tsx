"use client";

import React from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Database } from "@/lib/supabase/database.types";
type UserRole = Database["public"]["Enums"]["user_role"];

interface PermissionGuardProps {
  /** Minimum role required. hierarchy: superadmin > admin > tecnico */
  minRole?: UserRole;
  /** Whitelist of allowed roles */
  allowedRoles?: UserRole[];
  /** Rendered when permission is denied */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const ROLE_RANK: Record<UserRole, number> = {
  tecnico: 1,
  admin: 2,
  superadmin: 3,
};

export function PermissionGuard({
  minRole,
  allowedRoles,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { role, isLoading } = useOrganization();

  if (isLoading) return null;
  if (!role) return <>{fallback}</>;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  if (minRole && ROLE_RANK[role] < ROLE_RANK[minRole]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

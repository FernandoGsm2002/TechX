import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: IconDefinition;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** extra className on the root wrapper */
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center gap-3 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
        <FaIcon icon={icon} size={24} className="text-muted-foreground/40" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
        )}
      </div>
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Button asChild size="sm" variant="outline" className="mt-1">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="mt-1" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}

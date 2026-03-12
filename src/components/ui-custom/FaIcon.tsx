import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/utils";

interface FaIconProps {
  icon: IconDefinition;
  className?: string;
  /** pixel size shorthand e.g. "14" → width/height 14px. Default: 16px */
  size?: number;
}

export function FaIcon({ icon, className, size = 16 }: FaIconProps) {
  return (
    <FontAwesomeIcon
      icon={icon}
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

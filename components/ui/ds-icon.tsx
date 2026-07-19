import type { LucideIcon } from "lucide-react";

import {
  dsIconBox,
  dsIconSize,
  type DsIconSize,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type IconProps = {
  icon: LucideIcon;
  size?: DsIconSize;
  className?: string;
  label?: string;
};

/** Ícone Lucide com tamanho padronizado do Design System. */
export function DsIcon({
  icon: Icon,
  size = "md",
  className,
  label,
}: IconProps) {
  return (
    <Icon
      className={cn(dsIconSize[size], className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}

type IconBoxProps = {
  icon: LucideIcon;
  variant?: keyof typeof dsIconBox;
  iconSize?: DsIconSize;
  className?: string;
};

/** Container visual padrão para ícones em cards / timeline. */
export function DsIconBox({
  icon: Icon,
  variant = "md",
  iconSize = "md",
  className,
}: IconBoxProps) {
  return (
    <div className={cn(dsIconBox[variant], className)}>
      <Icon className={dsIconSize[iconSize]} aria-hidden />
    </div>
  );
}

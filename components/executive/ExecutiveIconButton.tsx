import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof Button>, "children" | "size"> & {
  icon: LucideIcon;
  /** Obrigatório para a11y */
  label: string;
  size?: "icon-xs" | "icon-sm" | "icon" | "icon-lg";
  loading?: boolean;
};

/**
 * ExecutiveIconButton — ícone + label acessível (Gate 19.0.2).
 */
export function ExecutiveIconButton({
  icon,
  label,
  className,
  size = "icon",
  variant = "ghost",
  loading = false,
  disabled,
  ...props
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(loading && "cursor-wait", className)}
      {...props}
    >
      <DsIcon
        icon={loading ? Loader2 : icon}
        size="md"
        className={cn(loading && "animate-spin")}
      />
    </Button>
  );
}

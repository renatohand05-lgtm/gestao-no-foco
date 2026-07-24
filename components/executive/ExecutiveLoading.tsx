import { Loader2 } from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import { cn } from "@/lib/utils";
import { gofTypography } from "@/lib/design-system/foundation";

type Props = {
  label?: string;
  className?: string;
  /** Ocupa área do painel pai */
  fill?: boolean;
};

/**
 * ExecutiveLoading — indicador de carregamento (Gate 19.0).
 * Sem lógica de negócio / fetch.
 */
export function ExecutiveLoading({
  label = "Carregando…",
  className,
  fill = false,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground",
        fill && "min-h-[8rem] w-full",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <DsIcon
        icon={Loader2}
        size="lg"
        className="animate-spin text-primary"
      />
      <p className={gofTypography.caption}>{label}</p>
    </div>
  );
}

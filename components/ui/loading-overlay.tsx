import { Loader2 } from "lucide-react";

import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type LoadingOverlayProps = {
  loading?: boolean;
  label?: string;
  className?: string;
};

export function LoadingOverlay({
  loading = false,
  label = "Carregando…",
  className,
}: LoadingOverlayProps) {
  if (!loading) return null;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-background/70 backdrop-blur-[1px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-muted-foreground",
          gofTypography.caption,
        )}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        <span>{label}</span>
      </div>
    </div>
  );
}

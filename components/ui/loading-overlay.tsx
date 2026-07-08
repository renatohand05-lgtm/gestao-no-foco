import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingOverlayProps = {
  loading?: boolean;
  label?: string;
  className?: string;
};

export function LoadingOverlay({
  loading = false,
  label = "Carregando...",
  className,
}: LoadingOverlayProps) {
  if (!loading) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-background/70 backdrop-blur-[1px]",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}

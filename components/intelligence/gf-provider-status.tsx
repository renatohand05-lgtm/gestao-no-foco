import type { IntelligenceMode } from "@/lib/intelligence/enterprise/types";
import { cn } from "@/lib/utils";

export function GFProviderStatus({
  mode,
  label,
  className,
}: {
  mode: IntelligenceMode;
  label: string;
  className?: string;
}) {
  return (
    <span
      data-gf-provider-status=""
      data-mode={mode}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--gf-border-subtle)]",
        "px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          mode === "deterministic" && "bg-success",
          mode === "provider_assisted" && "bg-[var(--brand-gold)]",
          mode === "unavailable" && "bg-danger",
        )}
        aria-hidden
      />
      {mode} · {label}
    </span>
  );
}

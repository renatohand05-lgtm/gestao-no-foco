import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Linhas de skeleton (default 3). */
  lines?: number;
  label?: string;
};

/**
 * Skeleton Signature — pulse + reduced-motion (Sprint 26.3).
 */
export function GFSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="gf-skeleton"
      data-gf-skeleton=""
      data-sprint="26.3"
      className={cn(
        "gf-skeleton animate-pulse rounded-md bg-muted motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export function GFSkeletonBlock({
  className,
  lines = 3,
  label = "Carregando",
}: Props) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-gf-skeleton-block=""
      data-sprint="26.3"
      className={cn(
        "space-y-[var(--gf-space-tight)] rounded-[var(--gf-radius)] border border-[var(--gf-border-subtle)]",
        "bg-[var(--gf-surface-raised)] p-4 shadow-[var(--gf-shadow-soft)]",
        className,
      )}
    >
      <GFSkeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <GFSkeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function GFPageSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-gf-page-skeleton=""
      data-sprint="26.3"
      className={cn("space-y-[var(--gf-space-block)]", className)}
      role="status"
      aria-busy="true"
      aria-label="Carregando página"
    >
      <GFSkeleton className="h-10 w-64 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <GFSkeletonBlock key={i} lines={2} />
        ))}
      </div>
      <GFSkeletonBlock lines={5} className="min-h-48" />
    </div>
  );
}

import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  compact?: boolean;
};

/**
 * Rodapé institucional discreto (Sprint 25.5).
 */
export function BrandInstitutionalFooter({
  className,
  compact = false,
}: Props) {
  return (
    <footer
      className={cn(
        "border-t border-border/40 bg-transparent",
        compact ? "px-2 py-3" : "px-4 py-5 sm:px-6",
        className,
      )}
      data-brand-footer=""
    >
      <div className="mx-auto flex max-w-[96rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground">
          {brandConfig.positioning}
        </p>
        {!compact ? (
          <ul
            className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium tracking-[0.14em] text-muted-foreground/80 uppercase"
            aria-label="Pilares"
          >
            {brandConfig.pillars.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] tracking-[0.12em] text-muted-foreground/70 uppercase sm:hidden">
            Tecnologia · Resultados · Segurança
          </p>
        )}
      </div>
    </footer>
  );
}

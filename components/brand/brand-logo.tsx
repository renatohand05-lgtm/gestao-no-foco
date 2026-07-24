import { cn } from "@/lib/utils";
import { brandConfig } from "@/config/brand";
import { BrandMark } from "@/components/brand/brand-mark";

type BrandLogoProps = {
  className?: string;
  showSubtitle?: boolean;
  showEdition?: boolean;
  markSize?: "sm" | "md" | "lg" | "xl";
  inverse?: boolean;
  /** Empilha marca acima do texto (splash / loading) */
  stacked?: boolean;
};

/**
 * Logo principal — marca + nome (sidebar expandida, login, loading).
 */
export function BrandLogo({
  className,
  showSubtitle = false,
  showEdition = false,
  markSize = "md",
  inverse = false,
  stacked = false,
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex",
        stacked ? "flex-col items-center gap-4 text-center" : "items-center gap-2.5",
        className,
      )}
    >
      <BrandMark size={markSize} />
      <span className={cn("min-w-0 leading-tight", stacked && "space-y-1")}>
        <span
          className={cn(
            "block truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-tight",
            stacked && "text-2xl",
            inverse ? "text-white" : "text-foreground",
          )}
        >
          {brandConfig.name}
        </span>
        {showSubtitle ? (
          <span
            className={cn(
              "block text-[11px] leading-snug sm:text-xs",
              stacked ? "max-w-[16rem]" : "truncate",
              inverse ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {brandConfig.subtitle}
          </span>
        ) : null}
        {showEdition ? (
          <span
            className={cn(
              "mt-0.5 block text-[10px] font-medium tracking-[0.14em] uppercase text-[var(--brand-gold)]",
              !stacked && "truncate",
            )}
          >
            {brandConfig.edition}
          </span>
        ) : null}
      </span>
    </span>
  );
}

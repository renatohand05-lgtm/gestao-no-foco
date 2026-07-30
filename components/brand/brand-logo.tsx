import { cn } from "@/lib/utils";
import { brandAssets, brandConfig } from "@/config/brand";
import { BrandMark } from "@/components/brand/brand-mark";

type BrandLogoProps = {
  className?: string;
  showSubtitle?: boolean;
  showEdition?: boolean;
  markSize?: "sm" | "md" | "lg" | "xl";
  inverse?: boolean;
  /** Empilha marca acima do texto (splash / loading) */
  stacked?: boolean;
  /** Usa SVG horizontal oficial completo */
  officialWordmark?: boolean;
};

/**
 * Logo principal — wordmark oficial ou marca + tipografia.
 */
export function BrandLogo({
  className,
  showSubtitle = false,
  showEdition = false,
  markSize = "md",
  inverse = false,
  stacked = false,
  officialWordmark = false,
}: BrandLogoProps) {
  if (officialWordmark) {
    const src = inverse ? brandAssets.logo : brandAssets.logoLight;
    return (
      <span className={cn("inline-flex flex-col gap-1", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG oficial */}
        <img
          src={src}
          alt={`${brandConfig.name} — ${brandConfig.subtitle}`}
          width={280}
          height={56}
          className={cn(
            "h-auto w-full max-w-[280px]",
            stacked && "max-w-[320px]",
          )}
          data-brand-logo="wordmark"
        />
        {showEdition ? (
          <span className="text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gold)] uppercase">
            {brandConfig.edition}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex",
        stacked ? "flex-col items-center gap-4 text-center" : "items-center gap-2.5",
        className,
      )}
      data-brand-logo="composed"
    >
      <BrandMark size={markSize} variant={inverse ? "dark" : "auto"} />
      <span className={cn("min-w-0 leading-tight", stacked && "space-y-1")}>
        <span
          className={cn(
            "block truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-[0.08em] uppercase",
            stacked && "text-2xl tracking-[0.12em]",
            inverse ? "text-[var(--brand-silver)]" : "text-foreground",
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

/** Wordmark SVG helper for splash hero */
export function BrandWordmarkImage({
  className,
  inverse = true,
}: {
  className?: string;
  inverse?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG oficial
    <img
      src={inverse ? brandAssets.logo : brandAssets.logoLight}
      alt={`${brandConfig.name} — ${brandConfig.subtitle}`}
      width={360}
      height={72}
      className={cn("h-auto w-full max-w-[360px]", className)}
      data-brand-wordmark=""
    />
  );
}

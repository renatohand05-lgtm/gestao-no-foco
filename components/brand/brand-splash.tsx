import { cn } from "@/lib/utils";
import { brandAssets, brandConfig } from "@/config/brand";
import { BrandLogo } from "@/components/brand/brand-logo";

type BrandSplashProps = {
  className?: string;
  label?: string;
  progress?: boolean;
  /** Usa SVG oficial quando disponível (Gate 19.4). */
  officialLogo?: boolean;
};

/**
 * Tela institucional de loading / splash (Gate 19.4).
 * Animação 800–1200ms — sem delay artificial de rota.
 */
export function BrandSplash({
  className,
  label = "Carregando…",
  progress = true,
  officialLogo = true,
}: BrandSplashProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-[60vh] w-full flex-col items-center justify-center overflow-hidden px-6",
        "bg-[var(--brand-white)]",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-brand-splash=""
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.12),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--brand-gray-light)_0%,transparent_42%,var(--brand-white)_100%)]"
        aria-hidden
      />

      <div className="relative flex flex-col items-center">
        {officialLogo ? (
          <div className="flex flex-col items-center gap-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG oficial da marca */}
            <img
              src={brandAssets.logo}
              alt={brandConfig.name}
              width={160}
              height={48}
              className="h-12 w-auto"
            />
            <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--brand-gold)] uppercase">
              {brandConfig.edition}
            </p>
          </div>
        ) : (
          <BrandLogo markSize="xl" showSubtitle showEdition stacked />
        )}

        <p className="mt-6 max-w-xs text-center font-[family-name:var(--font-display)] text-sm tracking-wide text-[var(--brand-gray-dark)]">
          {brandConfig.slogan}
        </p>

        {progress ? (
          <div
            className="mt-10 h-0.5 w-44 overflow-hidden rounded-full bg-[var(--brand-gray-light)]"
            aria-hidden
          >
            <div className="h-full w-1/2 rounded-full bg-[var(--brand-gold)] motion-safe:animate-[brand-progress_1s_ease-in-out_infinite]" />
          </div>
        ) : null}

        <p className="mt-4 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

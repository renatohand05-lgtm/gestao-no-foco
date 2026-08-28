"use client";

import { brandAssets } from "@/config/brand";
import { cn } from "@/lib/utils";

type PremiumGlobalLoaderProps = {
  className?: string;
  /** Texto só para leitores de tela — nunca visível */
  label?: string;
  /**
   * `fullscreen` — cobre viewport (transições/auth).
   * `embed` — ocupa o container (loading.tsx de rota).
   */
  variant?: "fullscreen" | "embed";
  /** Classe extra no símbolo (ex.: estado de saída) */
  markClassName?: string;
  /** Classe no root (ex.: fade-out) */
  rootClassName?: string;
};

/**
 * Loader global premium — apenas símbolo G oficial (Sprint 25.6.2).
 * Sem wordmark, Enterprise, slogan, barra ou texto visível.
 */
export function PremiumGlobalLoader({
  className,
  label = "Carregando conteúdo",
  variant = "embed",
  markClassName,
  rootClassName,
}: PremiumGlobalLoaderProps) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden",
        "bg-[var(--brand-navy)] text-white",
        "premium-loader-enter",
        variant === "fullscreen" && "fixed inset-0 z-[90] min-h-screen",
        variant === "embed" && "min-h-[60vh]",
        rootClassName,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-premium-global-loader=""
      data-brand-splash=""
      data-brand-splash-premium=""
      data-brand-continuity="loader"
      data-sprint="26.1"
      data-loader-variant={variant}
    >
      <span className="sr-only">{label}</span>

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,7,10,0.55)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-[min(28rem,70vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.16),transparent_68%)]"
        aria-hidden
      />

      <div className="relative flex items-center justify-center">
        <div
          className="premium-loader-halo pointer-events-none absolute inset-[-18%] rounded-full"
          aria-hidden
        />
        <div
          className="premium-loader-ring pointer-events-none absolute inset-[-22%] rounded-full"
          style={{
            border: "3px solid transparent",
            borderTopColor: "#C9A84C",
            borderRightColor: "rgba(201, 168, 76, 0.55)",
          }}
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- PNG oficial alta resolução */}
        <img
          src={brandAssets.icon192}
          alt=""
          width={112}
          height={112}
          decoding="async"
          className={cn(
            "premium-loader-mark relative z-[1] select-none object-contain",
            "size-[clamp(3.5rem,8vw,7rem)]",
            "drop-shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
            markClassName,
          )}
          data-premium-loader-mark=""
          data-brand-asset={brandAssets.icon192}
        />
      </div>
    </div>
  );
}

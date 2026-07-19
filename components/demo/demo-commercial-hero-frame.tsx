"use client";

import { useDemoMode } from "@/components/demo/demo-mode-provider";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

/**
 * Moldura comercial acima do Hero — não altera ExecutiveHeroV2 (Design Freeze).
 */
export function DemoCommercialHeroFrame() {
  const { mode, active } = useDemoMode();

  if (!active || (mode !== "commercial" && mode !== "fullscreen")) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 text-white",
        exAnimations.fade,
      )}
      role="note"
      aria-label="Foco da apresentação comercial"
    >
      <p className={cn(exTypography.label, "text-white/70")}>
        Apresentação comercial
      </p>
      <p className="mt-1 text-sm font-medium tracking-tight sm:text-base">
        Saúde da empresa · Indicadores principais · Insights · Ações prioritárias
      </p>
      <p className={cn("mt-1 text-white/65", exTypography.caption)}>
        Os blocos abaixo usam o mesmo Dashboard Executivo — só a apresentação muda.
      </p>
    </div>
  );
}

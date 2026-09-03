import { Eye } from "lucide-react";

import { stopPlanSimulationAction } from "@/lib/platform/plan-simulation-actions";

export function PlanSimulationBanner({ planName }: { planName: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-[var(--brand-gold,#C9A84C)] bg-[var(--brand-gold,#C9A84C)]/10 px-4 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Eye className="size-4 shrink-0 text-[var(--brand-gold,#C9A84C)]" aria-hidden="true" />
        Simulando plano: <strong>{planName}</strong> — é assim que o cliente
        veria o menu.
      </p>
      <form action={stopPlanSimulationAction}>
        <button
          type="submit"
          className="shrink-0 rounded-md border border-[var(--brand-gold,#C9A84C)]/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-[var(--brand-gold,#C9A84C)]/10"
        >
          Voltar para visão completa
        </button>
      </form>
    </div>
  );
}

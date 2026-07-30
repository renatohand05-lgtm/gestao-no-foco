import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import { ExecutiveEmptyState } from "@/components/executive";
import type { CashRiskAlert } from "@/lib/finance/cash-intelligence";

type Props = { alerts: CashRiskAlert[] };

function tone(sev: CashRiskAlert["severity"]) {
  if (sev === "critical") return "danger" as const;
  if (sev === "warning") return "warning" as const;
  return "info" as const;
}

export function CashRiskAlerts({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <ExecutiveEmptyState
        title="Sem alertas preventivos"
        description="Nenhum risco de caixa identificado no horizonte atual."
      />
    );
  }

  return (
    <section
      aria-label="Alertas preventivos de caixa"
      className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4"
    >
      <h2 className="text-sm font-semibold">Alertas preventivos</h2>
      <ul className="space-y-2">
        {alerts.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-border/50 bg-background/60 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <ExecutiveBadge tone={tone(a.severity)}>{a.severity}</ExecutiveBadge>
              <p className="text-sm font-medium">{a.title}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
            <p className="mt-1 text-xs">
              Ação: {a.recommendedAction}
              {a.expectedDate ? ` · Data: ${a.expectedDate}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

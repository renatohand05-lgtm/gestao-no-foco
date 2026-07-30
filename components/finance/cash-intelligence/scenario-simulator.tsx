"use client";

import { Button } from "@/components/ui/button";
import type { ScenarioComparison } from "@/lib/finance/cash-intelligence";
import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";

type Props = {
  result: ScenarioComparison | null;
  pending: boolean;
  onSimulateInvestment: () => void;
  onSimulateLoan: () => void;
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ScenarioSimulator({
  result,
  pending,
  onSimulateInvestment,
  onSimulateLoan,
}: Props) {
  return (
    <section
      aria-label="Simulador de investimentos e empréstimos"
      className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4"
    >
      <h2 className="text-sm font-semibold">Simulador (cenários em memória)</h2>
      <p className="text-xs text-muted-foreground">
        Separado dos dados reais até confirmação explícita — nenhuma movimentação é
        criada.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={onSimulateInvestment}
        >
          Simular investimento
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={onSimulateLoan}
        >
          Simular empréstimo
        </Button>
      </div>
      {result ? (
        <div className="space-y-2 rounded-lg border border-border/50 px-3 py-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <ExecutiveBadge tone="neutral">{result.kind}</ExecutiveBadge>
            <ExecutiveBadge tone="info" variant="outline">
              simulação
            </ExecutiveBadge>
          </div>
          <p className="font-medium">{result.name}</p>
          <p className="text-xs">
            Antes {money(result.balanceBefore)} → Depois{" "}
            {money(result.balanceAfter)}
          </p>
          <p className="text-xs">
            Menor saldo {money(result.minBalance)} · Ruptura{" "}
            {result.ruptureDate ?? "—"} · Capital {money(result.capitalNeed)}
          </p>
          <p className="text-[11px] text-muted-foreground">{result.disclaimer}</p>
        </div>
      ) : null}
    </section>
  );
}

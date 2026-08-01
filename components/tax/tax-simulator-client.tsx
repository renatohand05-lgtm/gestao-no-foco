"use client";

import { useState, useTransition } from "react";
import { runTaxSimulationAction } from "@/lib/tax/actions";
import {
  GFTaxAssumptionsPanel,
  GFTaxImpactChart,
  GFTaxRegimeComparison,
  GFTaxScenarioTabs,
  GFTaxSimulationTrace,
} from "@/components/gf/gf-tax-simulation";
import { GFButton } from "@/components/gf/gf-button";
import { gfType } from "@/lib/design-system/signature";

export function TaxSimulatorClient({
  tenantId,
  userId,
}: {
  tenantId: string;
  userId: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof runTaxSimulationAction>
  > | null>(null);

  return (
    <div className="space-y-4" data-tax-simulator-client="">
      <p className={gfType.caption}>
        CENÁRIO DE TESTE · rateEffective informada explicitamente como demo ·{" "}
        mutatesOfficial=false
      </p>
      <GFButton
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await runTaxSimulationAction({
              tenantId,
              userId,
              baselineRevenue: 100000,
              ruleVersionIds: ["demo-test-version"],
              scenarios: [
                { type: "baseline", growthPct: 0, rateEffective: 0.1 },
                { type: "expected", growthPct: 10, rateEffective: 0.1 },
                { type: "optimistic", growthPct: 20, rateEffective: 0.08 },
              ],
            });
            setResult(res);
          })
        }
      >
        {pending ? "Simulando…" : "Rodar 3 cenários (teste)"}
      </GFButton>

      {result ? (
        <div className="space-y-3" data-simulation-result="">
          <p data-mutates-official={result.mutatesOfficial ? "1" : "0"}>
            mutatesOfficial: {String(result.mutatesOfficial)}
          </p>
          <GFTaxScenarioTabs
            scenarios={["baseline", "expected", "optimistic"]}
            active="expected"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            {result.scenarios.map((s) => (
              <GFTaxImpactChart
                key={s.id}
                label={`${s.type} · impostos`}
                value={s.result.totalTaxes}
              />
            ))}
          </div>
          <GFTaxAssumptionsPanel
            assumptions={result.scenarios[0]?.assumptions ?? []}
            limitations={result.scenarios[0]?.result.limitations ?? []}
          />
          <GFTaxRegimeComparison
            winnerLabel={
              [...result.scenarios].sort(
                (a, b) =>
                  (a.result.totalTaxes ?? 1e18) - (b.result.totalTaxes ?? 1e18),
              )[0]?.type ?? "n/d"
            }
            confidence={result.scenarios[0]?.result.confidence ?? "indisponivel"}
          />
          <GFTaxSimulationTrace
            steps={result.scenarios[0]?.result.calculationTrace ?? []}
          />
          <p className={gfType.caption}>{result.comparisonLanguage}</p>
          <p className={gfType.caption}>
            Persistida: {result.persisted ? "sim" : "não"} · id{" "}
            {result.simulationId ?? "—"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

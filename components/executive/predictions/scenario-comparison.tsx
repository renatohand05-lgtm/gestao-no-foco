import {
  formatScenarioMoney,
  formatScenarioPct,
  formatScenarioSignedMoney,
} from "@/components/executive/predictions/scenario-metric";
import { exRadius, exSize, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { compareScenarios } from "@/lib/predictions";
import type { ScenarioCardModel } from "@/lib/predictions/types";

type Props = {
  scenarios: ScenarioCardModel[];
  recommendedId?: string | null;
};

export function ScenarioComparison({ scenarios, recommendedId }: Props) {
  const ordered = compareScenarios(scenarios);

  return (
    <details
      className={cn(
        "group border border-border/40 bg-muted/20 open:bg-muted/30",
        exRadius[20],
      )}
    >
      <summary
        className={cn(
          "cursor-pointer list-none px-4 py-3 text-sm font-semibold tracking-tight",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        Comparar cenários ({scenarios.length})
        <span className={cn("ml-2 font-normal", exTypography.caption)}>
          Esforço · Impacto · Risco (0–100)
        </span>
      </summary>
      <div className="overflow-x-auto px-2 pb-4 sm:px-4">
        <table
          className={cn(
            "w-full border-collapse text-left text-sm",
            exSize.chartScrollScenario,
          )}
        >
          <caption className="sr-only">
            Comparação de cenários por esforço, impacto e risco
          </caption>
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground">
              <th scope="col" className="px-2 py-2 font-medium">
                Cenário
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Projeção
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Ating.
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Δ
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Esforço
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Impacto
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Risco
              </th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((s) => (
              <tr
                key={s.id}
                className={cn(
                  "border-b border-border/30",
                  recommendedId === s.id && "bg-blue-500/5",
                )}
              >
                <th scope="row" className="px-2 py-2.5 font-medium">
                  {s.name}
                  {recommendedId === s.id ? (
                    <span className="ml-1 text-xs text-blue-700">★</span>
                  ) : null}
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    {s.viabilityLabel}
                  </span>
                </th>
                <td className="px-2 py-2.5 tabular-nums">
                  {formatScenarioMoney(s.projectedRevenue)}
                </td>
                <td className="px-2 py-2.5 tabular-nums">
                  {formatScenarioPct(s.projectedAttainment)}
                </td>
                <td className="px-2 py-2.5 tabular-nums">
                  {formatScenarioSignedMoney(s.estimatedIncrement)}
                </td>
                <td className="px-2 py-2.5 tabular-nums">{s.effortScore}</td>
                <td className="px-2 py-2.5 tabular-nums">{s.impactScore}</td>
                <td className="px-2 py-2.5 tabular-nums">{s.riskScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

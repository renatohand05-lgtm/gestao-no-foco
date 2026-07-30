import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import { ExecutiveEmptyState } from "@/components/executive";
import type { RescheduleRecommendation } from "@/lib/finance/cash-intelligence";

type Props = { recommendations: RescheduleRecommendation[] };

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RecommendationPanel({ recommendations }: Props) {
  if (recommendations.length === 0) {
    return (
      <ExecutiveEmptyState
        title="Sem recomendações carregadas"
        description='Clique em “Gerar recomendações”. Nenhuma ação é aplicada automaticamente.'
      />
    );
  }

  return (
    <section
      aria-label="Recomendações de reprogramação"
      className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4"
    >
      <h2 className="text-sm font-semibold">Recomendações</h2>
      <p className="text-[11px] text-muted-foreground">
        Sugestão automática baseada em projeção de caixa. Confirmação humana
        obrigatória — nenhuma alteração automática.
      </p>
      <ul className="space-y-2">
        {recommendations.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-border/50 bg-background/60 px-3 py-2"
          >
            <div className="flex flex-wrap gap-2">
              <ExecutiveBadge tone="info" variant="outline">
                {r.suggestedAction}
              </ExecutiveBadge>
              <ExecutiveBadge tone="warning" variant="soft">
                requer confirmação
              </ExecutiveBadge>
            </div>
            <p className="mt-1 text-sm font-medium">{r.title}</p>
            <p className="text-xs text-muted-foreground">{r.justification}</p>
            <p className="mt-1 text-xs tabular-nums">
              Antes {money(r.impactBefore)} → Depois {money(r.impactAfter)}
            </p>
            <p className="text-[10px] text-muted-foreground">{r.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

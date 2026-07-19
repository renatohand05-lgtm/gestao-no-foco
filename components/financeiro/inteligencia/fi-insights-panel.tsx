import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";
import type { FiInsight } from "@/lib/financial-intelligence/types";

const SEVERITY: Record<
  FiInsight["severity"],
  string
> = {
  info: "border-sky-500/30 bg-sky-500/5",
  positive: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  critical: "border-rose-500/30 bg-rose-500/5",
};

type Props = {
  insights: FiInsight[];
};

export function FiInsightsPanel({ insights }: Props) {
  return (
    <SectionCard
      title="Inteligência determinística"
      description="Regras fixas sobre DRE, Fluxo e rankings — sem IA externa."
      contentClassName="pt-0"
    >
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem alertas relevantes para o período com as regras atuais.
        </p>
      ) : (
        <ul className="space-y-3">
          {insights.map((insight) => {
            const body = (
              <div
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  SEVERITY[insight.severity],
                )}
              >
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {insight.detail}
                </p>
              </div>
            );
            return (
              <li key={insight.id}>
                {insight.href ? (
                  <Link href={insight.href} className="block transition hover:opacity-90">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

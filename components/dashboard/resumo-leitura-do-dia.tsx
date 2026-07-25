import { ExecutiveBadge, ExecutiveSection } from "@/components/executive";
import type { LeituraDiaInsight } from "@/lib/dashboard/resumo-vendas-mes";
import { gofMotion } from "@/lib/design-system";
import { cn } from "@/lib/utils";

const TONE: Record<
  LeituraDiaInsight["tone"],
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  neutral: "neutral",
};

type Props = {
  insights: LeituraDiaInsight[];
};

/** Leitura executiva — máx. 3 insights (fonte: buildLeituraDoDia). Gate 19.3 Brand. */
export function ResumoLeituraDoDia({ insights }: Props) {
  if (insights.length === 0) return null;

  const items = insights.slice(0, 3);

  return (
    <div className={gofMotion.fade} data-dashboard-block="leitura-do-dia">
      <ExecutiveSection
        title="Leitura do dia"
        description="Sinais curtos do período — complementar ao Resumo e ao Score."
        panel
      >
        <ul className="flex flex-wrap gap-2.5">
          {items.map((item) => (
            <li key={item.id}>
              <ExecutiveBadge
                tone={TONE[item.tone]}
                variant="soft"
                className={cn("max-w-full whitespace-normal text-left font-medium")}
              >
                {item.text}
              </ExecutiveBadge>
            </li>
          ))}
        </ul>
      </ExecutiveSection>
    </div>
  );
}

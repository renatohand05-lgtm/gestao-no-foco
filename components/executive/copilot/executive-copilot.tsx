import { ExecutiveSection } from "@/components/executive";
import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";
import { CopilotCard } from "@/components/executive/copilot/copilot-card";
import { exSpacing, exStack } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { CopilotEngineResult } from "@/lib/copilot";

type Props = {
  data: CopilotEngineResult;
};

/**
 * Executive Copilot (Sprint 11.6 / 13.8 empty state) — respostas determinísticas.
 */
export function ExecutiveCopilot({ data }: Props) {
  if (data.responses.length === 0) {
    return (
      <ExecutiveSection
        title="Executive Copilot"
        description="Respostas em linguagem natural compostas dos motores já carregados — sem IA externa."
        panel
      >
        <ExecutiveSectionState
          variant="empty"
          title="Copilot sem respostas neste período"
          description="Assim que os motores gerarem sinais suficientes, as respostas aparecem aqui."
        />
      </ExecutiveSection>
    );
  }

  return (
    <ExecutiveSection
      title="Executive Copilot"
      description="Respostas em linguagem natural compostas dos motores já carregados — sem IA externa."
      panel
    >
      <div
        className={cn(
          exStack[16],
          "grid gap-3 lg:grid-cols-1 xl:grid-cols-1",
          exSpacing[12],
        )}
      >
        {data.responses.map((response, index) => (
          <CopilotCard
            key={response.id}
            response={response}
            index={index}
          />
        ))}
      </div>
    </ExecutiveSection>
  );
}

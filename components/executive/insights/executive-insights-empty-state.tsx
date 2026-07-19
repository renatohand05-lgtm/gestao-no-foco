import { ExecutiveSection } from "@/components/executive";
import { exTypography } from "@/lib/design-system";

export function ExecutiveInsightsEmptyState() {
  return (
    <ExecutiveSection
      title="Insights executivos"
      description="Composição determinística a partir dos motores existentes."
      panel
    >
      <p className={exTypography.caption} role="status">
        Nenhuma prioridade clara no período. Os dados disponíveis ainda não
        sustentam uma conclusão acionável — continue registrando movimento para
        elevar a confiança.
      </p>
    </ExecutiveSection>
  );
}

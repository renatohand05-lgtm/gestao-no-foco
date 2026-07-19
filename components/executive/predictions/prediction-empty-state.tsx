import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";

type Props = {
  title?: string;
  description?: string;
};

export function PredictionEmptyState({
  title = "Previsões indisponíveis",
  description = "Não há base suficiente neste período para simular cenários.",
}: Props) {
  return (
    <ExecutiveSectionState
      variant="empty"
      title={title}
      description={description}
    />
  );
}

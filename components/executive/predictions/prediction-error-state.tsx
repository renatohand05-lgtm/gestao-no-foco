import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";

type Props = {
  message?: string;
};

export function PredictionErrorState({
  message = "Não foi possível montar as previsões a partir dos dados carregados.",
}: Props) {
  return (
    <div role="alert" aria-label="Erro nas previsões">
      <ExecutiveSectionState
        variant="error"
        title="Erro na previsão"
        description={message}
      />
    </div>
  );
}

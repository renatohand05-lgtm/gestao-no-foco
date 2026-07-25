import { ExecutiveEmptyState } from "@/components/executive";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function DecisionEmptyState({ className }: Props) {
  return (
    <ExecutiveEmptyState
      title="Nenhuma decisão priorizada"
      description="Sem evidências suficientes no snapshot para montar a fila executiva. O Decision Center reutiliza IA Executiva, Business Health, Predictive e Timeline · sem inventar dados."
      className={cn("py-8", className)}
    />
  );
}

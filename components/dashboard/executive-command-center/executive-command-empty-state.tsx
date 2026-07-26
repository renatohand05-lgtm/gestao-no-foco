import { ExecutiveEmptyState } from "@/components/executive";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  title?: string;
  description?: string;
};

export function ExecutiveCommandEmptyState({
  className,
  title = "Sem dados executivos",
  description = "Cobertura insuficiente no snapshot para montar o Command Center.",
}: Props) {
  return (
    <ExecutiveEmptyState
      title={title}
      description={description}
      className={cn("py-8", className)}
    />
  );
}

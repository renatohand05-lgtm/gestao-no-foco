import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";

type Props = {
  tenantSlug: string;
  description?: string;
};

export function ExecutiveIntelligenceErrorState({
  tenantSlug,
  description = "Não foi possível montar a inteligência executiva.",
}: Props) {
  return (
    <ExecutiveSectionState
      variant="error"
      title="Erro na inteligência executiva"
      description={description}
      actionHref={`/${tenantSlug}/dashboard`}
      actionLabel="Recarregar dashboard"
    />
  );
}

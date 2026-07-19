import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";

type Props = {
  tenantSlug: string;
};

export function ExecutiveIntelligenceEmptyState({ tenantSlug }: Props) {
  return (
    <ExecutiveSectionState
      variant="empty"
      title="Inteligência aguardando dados"
      description="Quando houver vendas ou meta no período, o score, a saúde e as ações aparecerão aqui."
      actionHref={`/${tenantSlug}/vendas/nova`}
      actionLabel="Registrar venda"
    />
  );
}

import { Suspense } from "react";

import { MetasHistoricoTable } from "@/components/metas/metas-historico-table";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { SectionCard } from "@/components/ui/section-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { FINANCEIRO_DEFAULT_PER_PAGE } from "@/lib/financeiro/constants";
import { createMetaVendasService } from "@/lib/metas/meta-vendas-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Metas de Vendas" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ page?: string; success?: string }>;
};

export default async function MetasPage({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const { page, success } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const currentPage = Number(page) > 0 ? Number(page) : 1;

  const service = await createMetaVendasService(tenant.id);
  const historico = await service.listHistorico({
    page: currentPage,
    perPage: FINANCEIRO_DEFAULT_PER_PAGE,
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Metas de Vendas"
        description={`Metas mensais e histórico de ${tenant.name}`}
        breadcrumbs={[
          { label: "Configurações", href: `/${tenantSlug}/configuracoes` },
          { label: "Metas de Vendas" },
        ]}
      >
        <ActionButton
          action="create"
          label="Nova meta"
          href={`/${tenantSlug}/configuracoes/metas/nova`}
        />
      </ModuleHeader>

      {success === "deleted" ? (
        <FeedbackMessage variant="success">
          Meta excluída com sucesso. O registro técnico permanece para auditoria.
        </FeedbackMessage>
      ) : null}

      <SectionCard
        title="Histórico de metas"
        description="Realizado usa a mesma fonte do Dashboard/DRE (receita bruta)."
      >
        <Suspense fallback={<SkeletonCard lines={6} />}>
          <MetasHistoricoTable tenantSlug={tenantSlug} result={historico} />
        </Suspense>
      </SectionCard>
    </div>
  );
}

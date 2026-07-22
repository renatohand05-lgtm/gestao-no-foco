import { Suspense } from "react";

import { MetaDiariaForm } from "@/components/metas/meta-diaria-form";
import { MetasHistoricoTable } from "@/components/metas/metas-historico-table";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { SectionCard } from "@/components/ui/section-card";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import {
  civilDateInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
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
  const hoje = civilDateInTimezone(new Date(), resolveTenantTimezone());

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
        title="Meta diária"
        description="Override manual por data. Sem override, o dashboard rateia a meta mensal pelos dias úteis (seg–sex). Histórico preservado via soft-delete."
      >
        <MetaDiariaForm tenantSlug={tenantSlug} defaultDate={hoje} />
      </SectionCard>

      <SectionCard
        title="Histórico de metas"
        description="Realizado = faturamento líquido (vendas faturadas + CR avulsas), mesma regra do dashboard."
      >
        <Suspense fallback={<SkeletonCard lines={6} />}>
          <MetasHistoricoTable tenantSlug={tenantSlug} result={historico} />
        </Suspense>
      </SectionCard>
    </div>
  );
}

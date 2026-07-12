import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { VendaFeedback } from "@/components/vendas/venda-feedback";
import { VendaAbertasSearch } from "@/components/vendas/venda-abertas-search";
import { VendaOpenView } from "@/components/vendas/venda-open-view";
import { createContaBancariaService } from "@/lib/financeiro/conta-bancaria-service";
import { createVendaService } from "@/lib/vendas/venda-service";
import { requireTenant } from "@/lib/tenants";
import type { VendaSuccessMessage } from "@/types/vendas";
import { Suspense } from "react";

export const metadata = { title: "Vendas abertas" };

export default async function VendasAbertasPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    q?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { q, success, error } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createVendaService(tenant.id);
  const contaBancariaService = await createContaBancariaService(tenant.id);
  const [view, contasResult] = await Promise.all([
    service.getVendasAbertasView(q),
    contaBancariaService.list({ ativo: true, perPage: 100 }),
  ]);

  const contasBancarias = contasResult.data.map((conta) => ({
    id: conta.id,
    nome: conta.nome,
  }));

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Vendas abertas"
        description={`Orçamentos e vendas em andamento de ${tenant.name}`}
        breadcrumbs={[
          { label: "Vendas", href: `/${tenantSlug}/vendas` },
          { label: "Vendas abertas" },
        ]}
      >
        <ActionButton
          action="view"
          label="Ver todas"
          href={`/${tenantSlug}/vendas`}
        />
        <ActionButton
          action="create"
          label="Nova venda"
          href={`/${tenantSlug}/vendas/nova`}
        />
      </ModuleHeader>

      <VendaFeedback
        success={success as VendaSuccessMessage | undefined}
        error={error}
      />

      <Suspense fallback={<SkeletonCard lines={2} />}>
        <DataTableToolbar>
          <VendaAbertasSearch tenantSlug={tenantSlug} defaultValue={q ?? ""} />
        </DataTableToolbar>
      </Suspense>

      <VendaOpenView
        tenantSlug={tenantSlug}
        view={view}
        contasBancarias={contasBancarias}
        hasSearch={Boolean(q)}
        searchTerm={q}
      />
    </div>
  );
}

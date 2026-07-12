import { notFound } from "next/navigation";

import { ContaReceberForm } from "@/components/financeiro/conta-receber-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import {
  canEditClassificacaoContaReceber,
  canEditContaReceber,
} from "@/lib/financeiro/conta-receber-utils";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar conta a receber" };

function resolveClassificacaoOnly(
  searchParams: { classificacaoOnly?: string; mode?: string },
  podeEditarCompleto: boolean,
  podeEditarClassificacao: boolean,
): boolean {
  const fromQuery =
    searchParams.classificacaoOnly === "true" ||
    searchParams.mode === "classification";

  if (fromQuery && podeEditarClassificacao) {
    return true;
  }

  return !podeEditarCompleto && podeEditarClassificacao;
}

export default async function EditarPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ classificacaoOnly?: string; mode?: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const query = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaReceberService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  const podeEditarCompleto = canEditContaReceber(item);
  const podeEditarClassificacao = canEditClassificacaoContaReceber(item);

  if (!podeEditarCompleto && !podeEditarClassificacao) {
    notFound();
  }

  const classificacaoOnly = resolveClassificacaoOnly(
    query,
    podeEditarCompleto,
    podeEditarClassificacao,
  );

  const [clientes, vendas, formasPagamento, categorias, centrosCusto, planoContas] =
    await Promise.all([
      service.listClientes(),
      service.listVendas(),
      service.listFormasPagamento(),
      service.listCategorias(),
      service.listCentrosCusto(),
      service.listPlanoContas(),
    ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={
          classificacaoOnly
            ? "Corrigir classificação"
            : "Editar conta a receber"
        }
        description={item.descricao}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Receber",
            href: `/${tenantSlug}/financeiro/contas-receber`,
          },
          {
            label: item.descricao,
            href: `/${tenantSlug}/financeiro/contas-receber/${item.id}`,
          },
          { label: classificacaoOnly ? "Corrigir classificação" : "Editar" },
        ]}
      />

      <SectionCard
        title={classificacaoOnly ? "Classificação contábil" : "Edição"}
        description={
          classificacaoOnly
            ? "Atualize apenas categoria, plano de contas, centro de custo e competência."
            : "Atualize os dados do título em aberto."
        }
      >
        <ContaReceberForm
          tenantSlug={tenantSlug}
          mode="edit"
          item={item}
          classificacaoOnly={classificacaoOnly}
          clientes={clientes}
          vendas={vendas}
          formasPagamento={formasPagamento}
          categorias={categorias}
          centrosCusto={centrosCusto}
          planoContas={planoContas}
        />
      </SectionCard>
    </div>
  );
}

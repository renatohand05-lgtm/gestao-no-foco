import { notFound } from "next/navigation";

import { ContaPagarForm } from "@/components/financeiro/conta-pagar-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import {
  canEditClassificacaoContaPagar,
  canEditContaPagar,
} from "@/lib/financeiro/conta-pagar-utils";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar conta a pagar" };

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
  const service = await createContaPagarService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  const podeEditarCompleto = canEditContaPagar(item);
  const podeEditarClassificacao = canEditClassificacaoContaPagar(item);

  if (!podeEditarCompleto && !podeEditarClassificacao) {
    notFound();
  }

  const classificacaoOnly = resolveClassificacaoOnly(
    query,
    podeEditarCompleto,
    podeEditarClassificacao,
  );

  const [
    fornecedores,
    formasPagamento,
    categorias,
    centrosCusto,
    planoContas,
  ] = await Promise.all([
    service.listFornecedores(),
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
            : "Editar conta a pagar"
        }
        description={item.descricao}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Pagar",
            href: `/${tenantSlug}/financeiro/contas-pagar`,
          },
          {
            label: item.descricao,
            href: `/${tenantSlug}/financeiro/contas-pagar/${item.id}`,
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
        <ContaPagarForm
          tenantSlug={tenantSlug}
          mode="edit"
          item={item}
          classificacaoOnly={classificacaoOnly}
          fornecedores={fornecedores}
          formasPagamento={formasPagamento}
          categorias={categorias}
          centrosCusto={centrosCusto}
          planoContas={planoContas}
        />
      </SectionCard>
    </div>
  );
}

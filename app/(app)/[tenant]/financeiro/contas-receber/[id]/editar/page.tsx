import { notFound } from "next/navigation";

import { ContaReceberForm } from "@/components/financeiro/conta-receber-form";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import {
  canEditClassificacaoContaReceber,
  canEditContaReceber,
} from "@/lib/financeiro/conta-receber-utils";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

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

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <ExecutivePage width="wide" spacing="loose">
        <Breadcrumbs items={[
            { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
            {
              label: "Contas a Receber",
              href: `/${tenantSlug}/financeiro/contas-receber`,
            },
            { label: "Editar" },
          ]} />
        <ExecutiveHeader title="Editar conta a receber" description="Edição" />
        <p
          className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm"
          role="alert"
          data-finance-rbac="denied"
        >
          {err.message}
        </p>
      </ExecutivePage>
    );
  }

  const { tenant } = auth;
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
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
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
        ]} />
      <ExecutiveHeader title={classificacaoOnly
            ? "Corrigir classificação"
            : "Editar conta a receber"} description={item.descricao} />

      <ExecutiveSection
        title={classificacaoOnly ? "Classificação contábil" : "Edição"}
        description={
          classificacaoOnly
            ? "Atualize apenas categoria, plano de contas, centro de custo e competência."
            : "Atualize os dados do título em aberto."
        }
        panel
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
      </ExecutiveSection>
    </ExecutivePage>
  );
}

import { notFound } from "next/navigation";

import { ContaPagarForm } from "@/components/financeiro/conta-pagar-form";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import {
  canEditClassificacaoContaPagar,
  canEditContaPagar,
} from "@/lib/financeiro/conta-pagar-utils";
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
              label: "Contas a Pagar",
              href: `/${tenantSlug}/financeiro/contas-pagar`,
            },
            { label: "Editar" },
          ]} />
        <ExecutiveHeader title="Editar conta a pagar" description="Edição" />
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
  const service = await createContaPagarService(tenant.id);
  const { createFinanceiroBeneficiarioService } = await import(
    "@/lib/financeiro/beneficiario-service"
  );
  const benefService = await createFinanceiroBeneficiarioService(tenant.id);
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
    beneficiarios,
    mecanicos,
    equipe,
  ] = await Promise.all([
    service.listFornecedores(),
    service.listFormasPagamento(),
    service.listCategorias(),
    service.listCentrosCusto(),
    service.listPlanoContas(),
    benefService.listAtivos(),
    benefService.listMecanicosAtivos(),
    benefService.listEquipeAtiva(),
  ]);

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
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
        ]} />
      <ExecutiveHeader title={classificacaoOnly
            ? "Corrigir classificação"
            : "Editar conta a pagar"} description={item.descricao} />

      <ExecutiveSection
        title={classificacaoOnly ? "Classificação contábil" : "Edição"}
        description={
          classificacaoOnly
            ? "Atualize apenas categoria, plano de contas, centro de custo e competência."
            : "Atualize os dados do título em aberto."
        }
        panel
      >
        <ContaPagarForm
          tenantSlug={tenantSlug}
          mode="edit"
          item={item}
          classificacaoOnly={classificacaoOnly}
          fornecedores={fornecedores}
          beneficiarios={beneficiarios}
          mecanicos={mecanicos}
          equipe={equipe}
          formasPagamento={formasPagamento}
          categorias={categorias}
          centrosCusto={centrosCusto}
          planoContas={planoContas}
        />
      </ExecutiveSection>
    </ExecutivePage>
  );
}

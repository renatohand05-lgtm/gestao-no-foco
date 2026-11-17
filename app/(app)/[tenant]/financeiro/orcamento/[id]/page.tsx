import Link from "next/link";
import { notFound } from "next/navigation";

import { BudgetMatrix } from "@/components/finance/budget-matrix";
import { FinanceBudgetActions } from "@/components/finance/finance-budget-actions";
import { FinanceBudgetForm } from "@/components/finance/finance-budget-form";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createFinanceBudgetService,
  labelFinanceBudgetStatus,
} from "@/lib/finance/budget/budget-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import { formatCurrency } from "@/lib/format";
import { loadMetasRealizado } from "@/lib/metas/metas-realizado";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Orçamento empresarial" };
export const dynamic = "force-dynamic";

export default async function OrcamentoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const { edit } = await searchParams;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.orcamento.visualizar",
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="p-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Orçamento"
          description={err.message}
        />
      </div>
    );
  }

  const svc = await createFinanceBudgetService(auth.tenant.id);
  const full = await svc.getById(id);
  if (!full) notFound();

  const { budget, lines } = full;
  const editable =
    budget.status === "rascunho" ||
    budget.status === "em_revisao" ||
    budget.status === "reprovado";

  if (edit === "1" && editable) {
    return (
      <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-orcamento-edit">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title={`Editar · ${budget.nome}`}
          description={`Versão ${budget.versao} · ${labelFinanceBudgetStatus(budget.status)}`}
        />
        <FinanceBudgetForm
          tenantSlug={tenantSlug}
          mode="edit"
          budgetId={budget.id}
          initial={{
            nome: budget.nome,
            ano: budget.ano,
            observacao: budget.observacao ?? "",
            lines: lines.map((l) => ({
              mes: l.mes,
              natureza: l.natureza as
                | "receita"
                | "custo"
                | "despesa"
                | "investimento"
                | "divida"
                | "caixa",
              valor_orcado: Number(l.valor_orcado),
              justificativa: l.justificativa ?? "",
            })),
          }}
        />
      </div>
    );
  }

  const somaPorNatureza = (natureza: string) =>
    lines
      .filter((l) => l.natureza === natureza)
      .reduce((acc, l) => acc + Number(l.valor_orcado), 0);
  const receitaOrcada = somaPorNatureza("receita");
  const custosEDespesas = somaPorNatureza("custo") + somaPorNatureza("despesa");
  const resultadoOrcado = receitaOrcada - custosEDespesas;

  // Faturamento realizado (OS faturadas) mês a mês — mesma base do Painel Executivo.
  const realizadoRows = await loadMetasRealizado(
    await createClient(),
    auth.tenant.id,
    `${budget.ano}-01-01`,
    `${budget.ano}-12-01`,
  );
  const realizadoReceita: Record<number, number> = {};
  for (const r of realizadoRows) {
    if (r.realizado > 0) realizadoReceita[Number(r.competencia.slice(5, 7))] = r.realizado;
  }
  const realizadoAno = Object.values(realizadoReceita).reduce((a, b) => a + b, 0);

  return (
    <div
      className="space-y-4 p-4 sm:p-6 print:p-0"
      data-phase28="finance-orcamento-detail"
    >
      <FinancePageHeader
        tenantSlug={tenantSlug}
        title={budget.nome}
        description={`Ano ${budget.ano} · v${budget.versao} · ${labelFinanceBudgetStatus(budget.status)}`}
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={`/${tenantSlug}/financeiro/orcamento`}
          className="text-primary underline-offset-4 hover:underline"
        >
          Lista
        </Link>
        {editable ? (
          <Link
            href={`/${tenantSlug}/financeiro/orcamento/${budget.id}?edit=1`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Editar
          </Link>
        ) : null}
      </div>

      <FinanceBudgetActions
        tenantSlug={tenantSlug}
        budgetId={budget.id}
        status={budget.status}
      />

      {budget.observacao ? (
        <p className="text-sm text-muted-foreground">{budget.observacao}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo orçado</CardTitle>
          <CardDescription>
            Faturamento realizado = OS faturadas (mesma base do Painel
            Executivo). Custos e despesas realizados seguem o DRE.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-muted-foreground">Receita orçada</div>
            <div className="text-base font-semibold tabular-nums">
              {formatCurrency(receitaOrcada)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Custos e despesas orçados</div>
            <div className="text-base font-semibold tabular-nums">
              {formatCurrency(custosEDespesas)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Resultado orçado</div>
            <div className="text-base font-semibold tabular-nums">
              {formatCurrency(resultadoOrcado)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Faturamento realizado no ano</div>
            <div className="text-base font-semibold tabular-nums">
              {realizadoAno > 0 ? formatCurrency(realizadoAno) : "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      <BudgetMatrix
        linhas={lines.map((l) => ({
          mes: l.mes,
          natureza: l.natureza,
          valor: Number(l.valor_orcado),
          justificativa: l.justificativa,
        }))}
        realizadoReceita={receitaOrcada > 0 ? realizadoReceita : null}
      />

      <p className="text-xs text-muted-foreground">
        Conversão para venda/OS aplica-se a orçamentos comerciais (módulo
        Vendas), não a este orçamento empresarial P&amp;L.
      </p>
    </div>
  );
}

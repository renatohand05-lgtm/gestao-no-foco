import Link from "next/link";
import { notFound } from "next/navigation";

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
  computeBudgetVariance,
  summarizeBudgetVariance,
} from "@/lib/finance/budget/budget-variance";
import {
  createFinanceBudgetService,
  labelFinanceBudgetStatus,
} from "@/lib/finance/budget/budget-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import { formatCurrency } from "@/lib/format";

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
  const variance = lines.map((l) =>
    computeBudgetVariance({
      id: l.id,
      label: `${l.natureza} · mês ${l.mes}`,
      natureza: l.natureza as "receita" | "despesa" | "custo",
      orcado: Number(l.valor_orcado),
      realizado: 0,
    }),
  );
  const summary = summarizeBudgetVariance(variance);
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
            Realizado = 0 até drill-down DRE (não inventado).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3 text-sm">
          <div>
            Orçado:{" "}
            <span className="tabular-nums font-medium">
              {formatCurrency(summary.orcado)}
            </span>
          </div>
          <div>
            Realizado:{" "}
            <span className="tabular-nums font-medium">
              {formatCurrency(summary.realizado)}
            </span>
          </div>
          <div>
            Δ:{" "}
            <span className="tabular-nums font-medium">
              {formatCurrency(summary.diferenca)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Mês</th>
              <th className="px-3 py-2">Natureza</th>
              <th className="px-3 py-2">Orçado</th>
              <th className="px-3 py-2">Justificativa</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                  Sem linhas
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2 tabular-nums">{l.mes}</td>
                  <td className="px-3 py-2">{l.natureza}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatCurrency(Number(l.valor_orcado))}
                  </td>
                  <td className="px-3 py-2">{l.justificativa ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Conversão para venda/OS aplica-se a orçamentos comerciais (módulo
        Vendas), não a este orçamento empresarial P&amp;L.
      </p>
    </div>
  );
}

import Link from "next/link";

import { FinanceFeatureLocked } from "@/components/finance/finance-feature-locked";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { MetasRealizadoCard } from "@/components/metas/metas-realizado-card";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isFinanceFeatureUnlocked } from "@/lib/billing/finance-entitlement";
import {
  createFinanceBudgetService,
  labelFinanceBudgetStatus,
} from "@/lib/finance/budget/budget-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import {
  civilDateInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import { loadMetasRealizado } from "@/lib/metas/metas-realizado";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Orçamento empresarial" };
export const dynamic = "force-dynamic";

export default async function FinanceiroOrcamentoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.orcamento.visualizar",
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-orcamento">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Orçamento empresarial"
          description={err.message}
        />
      </div>
    );
  }

  const client = await createClient();
  const unlocked = await isFinanceFeatureUnlocked(
    client,
    auth.tenant.id,
    "financeiro_avancado",
  );
  if (!unlocked) {
    return (
      <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-orcamento">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Orçamento empresarial"
        />
        <FinanceFeatureLocked
          tenantSlug={tenantSlug}
          feature="financeiro_avancado"
          title="Orçamento"
        />
      </div>
    );
  }

  let budgets: Awaited<ReturnType<Awaited<ReturnType<typeof createFinanceBudgetService>>["list"]>> = [];
  let schemaReady = true;
  let schemaError: string | null = null;
  try {
    const svc = await createFinanceBudgetService(auth.tenant.id);
    budgets = await svc.list();
  } catch (e) {
    schemaReady = false;
    schemaError = e instanceof Error ? e.message : "Schema indisponível";
  }

  // Metas mensais (módulo Metas de Vendas) × faturamento realizado (OS faturadas).
  const hoje = civilDateInTimezone(new Date(), resolveTenantTimezone());
  const anoAtual = Number(hoje.slice(0, 4));
  const metasRealizado = await loadMetasRealizado(
    client,
    auth.tenant.id,
    `${anoAtual}-01-01`,
    `${anoAtual + 1}-12-01`,
  );

  return (
    <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-orcamento">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={auth.tenant.name}
        title="Orçamento empresarial"
        description="Orçado × realizado · versões, aprovação e auditoria. DRE canônico intacto."
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/${tenantSlug}/financeiro/orcamento/novo`}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Criar orçamento
        </Link>
      </div>

      {!schemaReady ? (
        <Card>
          <CardHeader>
            <CardTitle>Migration pendente</CardTitle>
            <CardDescription>
              Tabela `finance_budgets` indisponível. Aplique{" "}
              <code>20260802_phase28_finance_budget.sql</code>.
              {schemaError ? ` (${schemaError})` : ""}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : budgets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum orçamento</CardTitle>
            <CardDescription>
              Schema pronto. Crie a primeira versão orçamentária.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Ano</th>
                <th className="px-3 py-2">Versão</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link
                      href={`/${tenantSlug}/financeiro/orcamento/${b.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {b.nome}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{b.ano}</td>
                  <td className="px-3 py-2 tabular-nums">{b.versao}</td>
                  <td className="px-3 py-2">
                    {labelFinanceBudgetStatus(b.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MetasRealizadoCard
        tenantSlug={tenantSlug}
        linhas={metasRealizado}
        hoje={hoje}
      />
    </div>
  );
}

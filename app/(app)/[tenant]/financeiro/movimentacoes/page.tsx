import { Suspense } from "react";

import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { MovimentacoesClient } from "@/components/finance/movimentacoes-client";
import {
  listBankAccounts,
  listCategories,
  listCostCenters,
  listTreasuryMovements,
} from "@/lib/finance/actions";
import { resolveTreasuryPeriod } from "@/lib/finance";
import type { TreasuryPeriodKey } from "@/lib/finance";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";

export const metadata = { title: "Movimentações" };

export default async function MovimentacoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.movimentacoes.visualizar",
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Movimentações"
          description="Histórico com filtros, totais e paginação."
        />
        <p
          className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm"
          role="alert"
          data-finance-rbac="denied"
        >
          {err.message}
        </p>
      </div>
    );
  }

  const { tenant } = auth;

  const periodKey = (typeof sp.period === "string"
    ? sp.period
    : "30d") as TreasuryPeriodKey;
  const period = resolveTreasuryPeriod(periodKey, {
    from: typeof sp.from === "string" ? sp.from : undefined,
    to: typeof sp.to === "string" ? sp.to : undefined,
  });

  const [accounts, page, categories, costCenters] = await Promise.all([
    listBankAccounts(tenantSlug),
    listTreasuryMovements(tenantSlug, {
      from: period.from,
      to: period.to,
      accountId: typeof sp.account === "string" ? sp.account : null,
      kind:
        typeof sp.kind === "string"
          ? (sp.kind as "entrada" | "saida" | "transferencia" | "all")
          : "all",
      categoryId: typeof sp.category === "string" ? sp.category : null,
      costCenterId: typeof sp.cc === "string" ? sp.cc : null,
      minAmount: typeof sp.min === "string" ? Number(sp.min) : null,
      maxAmount: typeof sp.max === "string" ? Number(sp.max) : null,
      search: typeof sp.q === "string" ? sp.q : null,
      status:
        typeof sp.status === "string"
          ? (sp.status as "all" | "normal" | "estornada")
          : "all",
      sort:
        typeof sp.sort === "string" ? (sp.sort as "date_desc") : "date_desc",
      page: typeof sp.page === "string" ? Number(sp.page) : 1,
      perPage: 25,
    }),
    listCategories(tenantSlug),
    listCostCenters(tenantSlug),
  ]);

  const error =
    (!accounts.success && accounts.error) ||
    (!page.success && page.error) ||
    (!categories.success && categories.error) ||
    (!costCenters.success && costCenters.error);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        title="Movimentações"
        description="Histórico com filtros, totais e paginação."
      />
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">A carregar…</p>}
      >
        <MovimentacoesClient
          tenantSlug={tenantSlug}
          accounts={accounts.success ? accounts.accounts : []}
          categories={categories.success ? categories.categories : []}
          costCenters={costCenters.success ? costCenters.costCenters : []}
          initialPage={page.success ? page.page : null}
          error={error || null}
        />
      </Suspense>
    </div>
  );
}

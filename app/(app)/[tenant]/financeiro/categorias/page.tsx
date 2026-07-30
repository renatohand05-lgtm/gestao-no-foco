import Link from "next/link";

import { CategoryManager } from "@/components/finance/category-manager";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { Button } from "@/components/ui/button";
import { listCategories } from "@/lib/finance/actions";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";

export const metadata = { title: "Categorias Financeiras" };

export default async function CategoriasEnterprisePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Categorias"
          description="Receita, despesa, transferência, investimento, impostos e operacional."
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
  const result = await listCategories(tenantSlug);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={tenant.name}
        title="Categorias"
        description="Receita, despesa, transferência, investimento, impostos e operacional."
        actions={
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/${tenantSlug}/financeiro/categorias/novo`} />
            }
          >
            Nova categoria
          </Button>
        }
      />
      {!result.success ? (
        <p className="text-sm text-red-600" role="alert">
          {result.error}
        </p>
      ) : (
        <CategoryManager
          tenantSlug={tenantSlug}
          categories={result.categories}
        />
      )}
    </div>
  );
}

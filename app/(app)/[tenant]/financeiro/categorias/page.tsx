import { CategoryManager } from "@/components/finance/category-manager";
import { ModuleHeader } from "@/components/layout/module-header";
import { listCategories } from "@/lib/finance/actions";
import { requireTenant } from "@/lib/tenants";
import Link from "next/link";

export const metadata = { title: "Categorias Financeiras" };

export default async function CategoriasEnterprisePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);
  const result = await listCategories(tenantSlug);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Categorias"
        description="Receita, despesa, transferência, investimento, impostos e operacional"
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Categorias" },
        ]}
      />
      <p className="text-sm text-muted-foreground">
        Cadastro Enterprise.{" "}
        <Link
          className="underline"
          href={`/${tenantSlug}/financeiro/categorias/novo`}
        >
          Formulário legado completo
        </Link>
      </p>
      {!result.success ? (
        <p className="text-sm text-red-600">{result.error}</p>
      ) : (
        <CategoryManager
          tenantSlug={tenantSlug}
          categories={result.categories}
        />
      )}
    </div>
  );
}

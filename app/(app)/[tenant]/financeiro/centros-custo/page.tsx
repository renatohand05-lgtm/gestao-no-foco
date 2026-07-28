import { CostCenterManager } from "@/components/finance/cost-center-manager";
import { ModuleHeader } from "@/components/layout/module-header";
import { listCostCenters } from "@/lib/finance/actions";
import { requireTenant } from "@/lib/tenants";
import Link from "next/link";

export const metadata = { title: "Centros de Custo" };

export default async function CentrosCustoEnterprisePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);
  const result = await listCostCenters(tenantSlug);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Centros de custo"
        description="Cadastro, edição e arquivamento · associação em movimentações"
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Centros de custo" },
        ]}
      />
      <p className="text-sm text-muted-foreground">
        Cadastro Enterprise.{" "}
        <Link
          className="underline"
          href={`/${tenantSlug}/financeiro/centros-custo/novo`}
        >
          Formulário legado completo
        </Link>
      </p>
      {!result.success ? (
        <p className="text-sm text-red-600">{result.error}</p>
      ) : (
        <CostCenterManager
          tenantSlug={tenantSlug}
          costCenters={result.costCenters}
        />
      )}
    </div>
  );
}

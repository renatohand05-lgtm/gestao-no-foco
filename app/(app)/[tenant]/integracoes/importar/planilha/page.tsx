import { ExecutiveHeader, ExecutivePage } from "@/components/executive";
import { ImportarPlanilhaClient } from "@/components/planilha-agencia/importar-planilha-client";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { canAccessModuleImport } from "@/lib/import-engine/adapters/shared/require-import-access";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Importar planilha da empresa" };

export default async function ImportarPlanilhaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "Integrações", href: `/${tenantSlug}/integracoes` },
        { label: "Importar Arquivos", href: `/${tenantSlug}/integracoes/importar` },
        { label: "Planilha da empresa" },
      ]}
    />
  );

  if (!canAccessModuleImport(tenant)) {
    return (
      <ExecutivePage width="wide" spacing="loose">
        {breadcrumbs}
        <ExecutiveHeader
          title="Importar planilha da empresa"
          description="Clientes e resultado mensal a partir da sua planilha."
        />
        <p className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm" role="alert">
          Só o dono, o administrador ou o gerente da empresa pode importar planilhas.
        </p>
      </ExecutivePage>
    );
  }

  return (
    <ExecutivePage width="wide" spacing="loose">
      {breadcrumbs}
      <ExecutiveHeader
        title="Importar planilha da empresa"
        description="Envie a planilha que você já usa (clientes, MRR, churn e DRE mensal). O portal lê, mostra a prévia e preenche clientes, financeiro e painel."
      />
      <ImportarPlanilhaClient tenantSlug={tenantSlug} />
    </ExecutivePage>
  );
}

import { notFound } from "next/navigation";

import { CategoriaFinanceiraForm } from "@/components/financeiro/categoria-financeira-form";
import { buildPlanoContaSelectOptions } from "@/lib/financeiro/plano-conta-tree";
import { createCategoriaFinanceiraService } from "@/lib/financeiro/categoria-financeira-service";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
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

export const metadata = { title: "Editar" };

export default async function EditarPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;

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
            { label: "Categorias Financeiras", href: `/${tenantSlug}/financeiro/categorias` },
            { label: "Editar" },
          ]} />
        <ExecutiveHeader title="Editar" description="Atualize o registro" />
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
  const service = await createCategoriaFinanceiraService(tenant.id);
  const planoService = await createPlanoContaService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  const planoItems = await planoService.listForTree({ ativo: true });
  const planoContaOptions = buildPlanoContaSelectOptions(planoItems);

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Categorias Financeiras", href: `/${tenantSlug}/financeiro/categorias` },
          {
            label: item.nome,
            href: `/${tenantSlug}/financeiro/categorias/${item.id}`,
          },
          { label: "Editar" },
        ]} />
      <ExecutiveHeader title={`Editar ${item.nome}`} description={`Atualize o registro em ${tenant.name}`} />

      <ExecutiveSection title="Cadastro" description="Atualize os dados do registro." panel>
        <CategoriaFinanceiraForm
          tenantSlug={tenantSlug}
          mode="edit"
          item={item}
          planoContaOptions={planoContaOptions}
        />
      </ExecutiveSection>
    </ExecutivePage>
  );
}

import { notFound } from "next/navigation";

import { PlanoContaForm } from "@/components/financeiro/plano-conta-form";
import { buildPlanoContaSelectOptions } from "@/lib/financeiro/plano-conta-tree";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
import { requireTenant } from "@/lib/tenants";
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
  const tenant = await requireTenant(tenantSlug);
  const service = await createPlanoContaService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  const parentItems = await service.listParentOptions(id);
  const parentOptions = buildPlanoContaSelectOptions(parentItems, {
    onlySintetica: true,
  });

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Plano de Contas", href: `/${tenantSlug}/financeiro/plano-contas` },
          {
            label: item.nome,
            href: `/${tenantSlug}/financeiro/plano-contas/${item.id}`,
          },
          { label: "Editar" },
        ]} />
      <ExecutiveHeader title={`Editar ${item.nome}`} description={`Atualize o registro em ${tenant.name}`} />

      <ExecutiveSection title="Cadastro" description="Atualize os dados do registro." panel>
        <PlanoContaForm
          tenantSlug={tenantSlug}
          mode="edit"
          item={item}
          parentOptions={parentOptions}
        />
      </ExecutiveSection>
    </ExecutivePage>
  );
}

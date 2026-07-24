import { notFound } from "next/navigation";

import { ContaBancariaForm } from "@/components/financeiro/conta-bancaria-form";
import { createContaBancariaService } from "@/lib/financeiro/conta-bancaria-service";
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
  const service = await createContaBancariaService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Contas Bancárias", href: `/${tenantSlug}/financeiro/contas-bancarias` },
          {
            label: item.nome,
            href: `/${tenantSlug}/financeiro/contas-bancarias/${item.id}`,
          },
          { label: "Editar" },
        ]} />
      <ExecutiveHeader title={`Editar ${item.nome}`} description={`Atualize o registro em ${tenant.name}`} />

      <ExecutiveSection title="Cadastro" description="Atualize os dados do registro." panel>
        <ContaBancariaForm tenantSlug={tenantSlug} mode="edit" item={item} />
      </ExecutiveSection>
    </ExecutivePage>
  );
}

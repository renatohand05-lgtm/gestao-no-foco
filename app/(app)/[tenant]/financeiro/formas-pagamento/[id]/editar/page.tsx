import { notFound } from "next/navigation";

import { FormaPagamentoForm } from "@/components/financeiro/forma-pagamento-form";
import { createFormaPagamentoService } from "@/lib/financeiro/forma-pagamento-service";
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
  const service = await createFormaPagamentoService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Formas de Pagamento", href: `/${tenantSlug}/financeiro/formas-pagamento` },
          {
            label: item.nome,
            href: `/${tenantSlug}/financeiro/formas-pagamento/${item.id}`,
          },
          { label: "Editar" },
        ]} />
      <ExecutiveHeader title={`Editar ${item.nome}`} description={`Atualize o registro em ${tenant.name}`} />

      <ExecutiveSection title="Cadastro" description="Atualize os dados do registro." panel>
        <FormaPagamentoForm tenantSlug={tenantSlug} mode="edit" item={item} />
      </ExecutiveSection>
    </ExecutivePage>
  );
}
